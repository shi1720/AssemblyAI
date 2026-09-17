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
