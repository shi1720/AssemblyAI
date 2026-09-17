import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { startVoiceSession } from "../lib/voice-client";
class Socket {
  static OPEN = 1;
  static last: Socket;
  readyState = 1;
  bufferedAmount = 0;
  sent: Record<string, unknown>[] = [];
  onopen?: () => void;
  onmessage?: (e: { data: string }) => void;
  onerror?: () => void;
  onclose?: () => void;
  constructor() {
    Socket.last = this;
  }
  send(s: string) {
    this.sent.push(JSON.parse(s));
  }
  close() {
    this.readyState = 3;
  }
  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}
const stop = vi.fn(),
  close = vi.fn(),
  sourceStop = vi.fn(),
  audioStart = vi.fn();
class Context {
  currentTime = 0;
  destination = {};
  audioWorklet = { addModule: async () => {} };
  resume = async () => {};
  close = close;
  createMediaStreamSource() {
    return { connect: vi.fn() };
  }
  createGain() {
    return { gain: { value: 0 }, connect: vi.fn() };
  }
  createBuffer(_n: number, len: number, rate: number) {
    return {
      duration: len / rate,
      getChannelData: () => new Float32Array(len),
    };
  }
  createBufferSource() {
    return {
      connect: vi.fn(),
      stop: sourceStop,
      start: audioStart,
      buffer: null,
      onended: null,
    };
  }
}
const getMedia = vi.fn(),
  request = vi.fn();
const callbacks = () => ({
  coreId: "core-test",
  onStatus: vi.fn(),
  onTranscript: vi.fn(),
  onState: vi.fn(),
  onError: vi.fn(),
  onEnd: vi.fn(),
});
const tokenResponse = () =>
  Response.json({
    token: "test-only-token",
    sessionId: "session-test",
    config: { test: true },
  });
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  getMedia.mockResolvedValue({
    getTracks: () => [{ stop }],
    getAudioTracks: () => [{ enabled: true, stop }],
  });
  request.mockImplementation(async (path: string) =>
    path.endsWith("voice/token")
      ? tokenResponse()
      : Response.json({ result: { saved: true } }),
  );
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: getMedia } });
  vi.stubGlobal("window", {
    AudioContext: Context,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal("AudioContext", Context);
  vi.stubGlobal(
    "AudioWorkletNode",
    class {
      port = { onmessage: null };
      connect = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal("fetch", request);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function tick() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}
describe("voice transport contract (provider mocked)", () => {
  it("times out an unanswered microphone prompt without creating a token", async () => {
    getMedia.mockReturnValue(new Promise(() => {}));
    const c = callbacks();
    const startup = startVoiceSession(c);
    const rejection = expect(startup).rejects.toThrow(
      /Microphone setup timed out/,
    );
    await vi.advanceTimersByTimeAsync(19999);
    expect(c.onEnd).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(c.onEnd).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
  });
  it("stops a microphone granted after startup has timed out", async () => {
    let grant!: (stream: MediaStream) => void;
    getMedia.mockReturnValue(
      new Promise<MediaStream>((resolve) => {
        grant = resolve;
      }),
    );
    const c = callbacks();
    const startup = startVoiceSession(c);
    const rejection = expect(startup).rejects.toThrow(
      /Microphone setup timed out/,
    );
    await vi.advanceTimersByTimeAsync(20000);
    await rejection;
    grant({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    await tick();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
    expect(c.onEnd).toHaveBeenCalledTimes(1);
  });
  it("cancels pending setup on pagehide and disposes of a late microphone", async () => {
    let grant!: (stream: MediaStream) => void;
    getMedia.mockReturnValue(
      new Promise<MediaStream>((resolve) => {
        grant = resolve;
      }),
    );
    const c = callbacks();
    const startup = startVoiceSession(c);
    const rejection = expect(startup).rejects.toThrow(/page closed/);
    const handler = vi
      .mocked(window.addEventListener)
      .mock.calls.find(([event]) => event === "pagehide")?.[1] as () => void;
    expect(handler).toBeTypeOf("function");
    handler();
    await rejection;
    grant({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    await tick();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
    expect(c.onEnd).toHaveBeenCalledTimes(1);
    expect(window.removeEventListener).toHaveBeenCalledWith(
      "pagehide",
      handler,
    );
  });
  it("cancels pending setup through an AbortSignal", async () => {
    getMedia.mockReturnValue(new Promise(() => {}));
    const controller = new AbortController();
    const c = callbacks();
    const startup = startVoiceSession({ ...c, signal: controller.signal });
    const rejection = expect(startup).rejects.toThrow(/startup was cancelled/);
    controller.abort();
    await rejection;
    await vi.advanceTimersByTimeAsync(20000);
    expect(c.onEnd).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
  });
  it("never requests microphone access for a pre-aborted caller", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      startVoiceSession({ ...callbacks(), signal: controller.signal }),
    ).rejects.toThrow(/startup was cancelled/);
    expect(getMedia).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
  it("times out suspended audio setup and prevents a late token request", async () => {
    let resume!: () => void;
    vi.stubGlobal(
      "AudioContext",
      class extends Context {
        resume = () =>
          new Promise<void>((resolve) => {
            resume = resolve;
          });
      },
    );
    const c = callbacks();
    const startup = startVoiceSession(c);
    const rejection = expect(startup).rejects.toThrow(/setup timed out/);
    await tick();
    await vi.advanceTimersByTimeAsync(20000);
    await rejection;
    expect(stop).toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
    resume();
    await tick();
    expect(request).not.toHaveBeenCalled();
    expect(c.onEnd).toHaveBeenCalledTimes(1);
  });
  it("aborts a stalled token request and stops the microphone", async () => {
    request.mockReturnValue(new Promise(() => {}));
    const c = callbacks();
    const startup = startVoiceSession(c);
    const rejection = expect(startup).rejects.toThrow(
      /Voice session setup timed out/,
    );
    await tick();
    expect(request).toHaveBeenCalledTimes(1);
    const requestSignal = request.mock.calls[0][1].signal as AbortSignal;
    expect(requestSignal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(20000);
    await rejection;
    expect(requestSignal.aborted).toBe(true);
    expect(stop).toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
    expect(c.onEnd).toHaveBeenCalledTimes(1);
  });
  it("does not issue a token when microphone permission is denied", async () => {
    getMedia.mockRejectedValue(
      Object.assign(new Error("no"), { name: "NotAllowedError" }),
    );
    await expect(startVoiceSession(callbacks())).rejects.toThrow(
      /permission was denied/,
    );
    expect(request).not.toHaveBeenCalled();
  });
  it("sends inline config after opening and cleans up microphone on end", async () => {
    const c = callbacks();
    const session = await startVoiceSession(c);
    const ws = Socket.last;
    ws.onopen?.();
    expect(ws.sent[0]).toEqual({
      type: "session.update",
      session: { test: true },
    });
    ws.emit({ type: "session.ready" });
    session.end();
    expect(stop).toHaveBeenCalled();
    expect(ws.sent.at(-1)).toEqual({ type: "session.end" });
    await vi.advanceTimersByTimeAsync(1500);
    expect(close).toHaveBeenCalled();
    expect(c.onEnd).toHaveBeenCalledTimes(1);
  });
  it("waits for reply.done before sending a tool result", async () => {
    const session = await startVoiceSession(callbacks());
    const ws = Socket.last;
    ws.emit({ type: "reply.started" });
    ws.emit({
      type: "tool.call",
      call_id: "call-1",
      name: "get_return_readiness",
      arguments: { core_id: "core-test" },
    });
    await tick();
    expect(ws.sent.some((x) => x.type === "tool.result")).toBe(false);
    ws.emit({ type: "reply.done", status: "completed" });
    expect(ws.sent.find((x) => x.type === "tool.result")).toMatchObject({
      call_id: "call-1",
      result: '{"saved":true}',
    });
    session.end();
  });
  it("holds new tool results from speech start until the reply finishes", async () => {
    const session = await startVoiceSession(callbacks());
    const ws = Socket.last;
    ws.emit({ type: "input.speech.started" });
    ws.emit({
      type: "tool.call",
      call_id: "speech-tool",
      name: "get_return_readiness",
      arguments: {},
    });
    await tick();
    expect(ws.sent.some((x) => x.type === "tool.result")).toBe(false);
    ws.emit({ type: "reply.done", status: "completed" });
    expect(ws.sent.some((x) => x.type === "tool.result")).toBe(true);
    session.end();
  });
  it("cancels queued and late results on an interrupted turn", async () => {
    const session = await startVoiceSession(callbacks());
    const ws = Socket.last;
    ws.emit({ type: "reply.started" });
    ws.emit({
      type: "tool.call",
      call_id: "call-1",
      name: "get_return_readiness",
      arguments: {},
    });
    ws.emit({ type: "input.speech.started" });
    await tick();
    ws.emit({ type: "reply.done", status: "interrupted" });
    expect(ws.sent.some((x) => x.type === "tool.result")).toBe(false);
    session.end();
  });
  it("stops scheduled audio on barge-in and ignores old audio until a new reply", async () => {
    const session = await startVoiceSession(callbacks());
    const ws = Socket.last;
    ws.emit({ type: "reply.started" });
    ws.emit({ type: "reply.audio", data: btoa("\0\0\0\0") });
    expect(audioStart).toHaveBeenCalledTimes(1);
    ws.emit({ type: "input.speech.started" });
    expect(sourceStop).toHaveBeenCalled();
    ws.emit({ type: "reply.audio", data: btoa("\0\0") });
    expect(audioStart).toHaveBeenCalledTimes(1);
    ws.emit({ type: "reply.started" });
    ws.emit({ type: "reply.audio", data: btoa("\0\0") });
    expect(audioStart).toHaveBeenCalledTimes(2);
    session.end();
  });
  it("waits for transcript persistence before a tool request", async () => {
    let saveLine!: (r: Response) => void;
    request.mockImplementation(async (path: string) =>
      path.endsWith("voice/token")
        ? tokenResponse()
        : path.endsWith("/transcript")
          ? new Promise<Response>((resolve) => {
              saveLine = resolve;
            })
          : Response.json({ result: { saved: true } }),
    );
    const session = await startVoiceSession(callbacks());
    Socket.last.emit({
      type: "transcript.user",
      item_id: "proof",
      text: "All components are present.",
    });
    Socket.last.emit({
      type: "tool.call",
      call_id: "tool-proof",
      name: "record_inspection",
      arguments: {},
    });
    await tick();
    expect(request.mock.calls.some((x) => String(x[0]).endsWith("/tool"))).toBe(
      false,
    );
    saveLine(Response.json({ ok: true }));
    await tick();
    expect(request.mock.calls.some((x) => String(x[0]).endsWith("/tool"))).toBe(
      true,
    );
    session.end();
  });
  it("preserves provider transcript text and saves the final entry", async () => {
    const c = callbacks(),
      session = await startVoiceSession(c);
    Socket.last.emit({
      type: "transcript.user",
      item_id: "utt-1",
      text: "The original box is missing.",
    });
    await tick();
    expect(c.onTranscript).toHaveBeenCalledWith({
      id: "utt-1",
      speaker: "Technician",
      text: "The original box is missing.",
    });
    expect(request).toHaveBeenCalledWith(
      "/api/sessions/session-test/transcript",
      expect.objectContaining({
        body: JSON.stringify({
          id: "utt-1",
          speaker: "Technician",
          text: "The original box is missing.",
        }),
      }),
    );
    session.end();
  });
});
