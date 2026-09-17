import type { AuditEvent, CoreState, Transcript } from "./domain";
type Options = {
  coreId: string;
  onStatus: (s: string) => void;
  onTranscript: (t: Transcript) => void;
  onState: (s: CoreState, e?: AuditEvent) => void;
  onError: (s: string) => void;
  onEnd: () => void;
  signal?: AbortSignal;
};
async function post(path: string, data: unknown, signal?: AbortSignal) {
  const r = await fetch("/api/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal,
  });
  const d = (await r.json()) as {
    error?: string;
    token: string;
    sessionId: string;
    config: unknown;
    state?: CoreState;
    event?: AuditEvent;
    result?: unknown;
  };
  if (!r.ok) throw new Error(d.error || "The voice action could not be saved.");
  return d;
}
export async function startVoiceSession(o: Options) {
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext)
    throw new Error(
      "Live voice requires microphone access in a supported browser over HTTPS. Use the form instead.",
    );
  let stream: MediaStream | undefined,
    ctx: AudioContext | undefined,
    node: AudioWorkletNode | undefined,
    ws: WebSocket | undefined;
  let ending = false,
    cleaned = false,
    ready = false,
    responseActive = false,
    acceptAudio = false,
    nextPlayback = 0,
    sessionId = "";
  let safetyTimer: ReturnType<typeof setTimeout> | undefined,
    setupTimer: ReturnType<typeof setTimeout> | undefined,
    connectTimer: ReturnType<typeof setTimeout> | undefined,
    finishTimer: ReturnType<typeof setTimeout> | undefined;
  const sources = new Set<AudioBufferSourceNode>();
  const pending = new Map<
    string,
    { type: string; call_id: string; result: string }
  >();
  const calls = new Map<string, Promise<void>>();
  let interruptionEpoch = 0;
  const writes = new Set<Promise<unknown>>();
  const transcriptWrites = new Set<Promise<unknown>>();
  const setupController = new AbortController();
  let setupComplete = false;
  let requestingToken = false;
  let setupError: Error | undefined;
  let rejectSetup!: (error: Error) => void;
  const setupFailure = new Promise<never>((_, reject) => {
    rejectSetup = reject;
  });
  // A pre-aborted caller can cancel before the first setup await is attached.
  void setupFailure.catch(() => {});
  const duringSetup = <T>(operation: Promise<T>) =>
    Promise.race([operation, setupFailure]);
  const stopPlayback = () => {
    for (const source of sources) {
      try {
        source.stop();
      } catch {}
    }
    sources.clear();
    nextPlayback = ctx?.currentTime || 0;
  };
  const clean = () => {
    if (cleaned) return;
    cleaned = true;
    ending = true;
    ready = false;
    clearTimeout(safetyTimer);
    clearTimeout(setupTimer);
    clearTimeout(connectTimer);
    clearTimeout(finishTimer);
    node?.disconnect();
    stream?.getTracks().forEach((t) => t.stop());
    stopPlayback();
    void ctx?.close();
    if (ws && ws.readyState < 2) ws.close();
    window.removeEventListener("pagehide", pagehide);
    o.signal?.removeEventListener("abort", abort);
    o.onEnd();
  };
  const cancelSetup = (error: Error) => {
    if (setupComplete || setupError) return;
    setupError = error;
    rejectSetup(error);
    setupController.abort();
    clean();
  };
  const send = (data: unknown) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  };
  const flush = () => {
    if (responseActive || ending) return;
    for (const [id, result] of pending) {
      send(result);
      pending.delete(id);
    }
  };
  const end = () => {
    if (ending) return;
    ending = true;
    ready = false;
    stream?.getTracks().forEach((t) => t.stop());
    stopPlayback();
    send({ type: "session.end" });
    o.onStatus("ending");
    finishTimer = setTimeout(clean, 1500);
    if (sessionId)
      void Promise.allSettled([...writes])
        .then(() => post(`sessions/${sessionId}/end`, {}))
        .catch(() => {});
  };
  const pagehide = () => {
    if (!setupComplete) {
      cancelSetup(
        new Error("Voice startup was cancelled when the page closed."),
      );
      return;
    }
    send({ type: "session.end" });
    if (sessionId)
      void fetch(`/api/sessions/${sessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        keepalive: true,
      });
    clean();
  };
  const abort = () => {
    if (!setupComplete) cancelSetup(new Error("Voice startup was cancelled."));
    else pagehide();
  };
  window.addEventListener("pagehide", pagehide);
  o.signal?.addEventListener("abort", abort, { once: true });
  try {
    if (o.signal?.aborted) {
      abort();
      throw setupError;
    }
    setupTimer = setTimeout(() => {
      cancelSetup(
        new Error(
          requestingToken
            ? "Voice session setup timed out. Check your connection and retry, or use the form."
            : "Microphone setup timed out. Allow microphone access in your browser, check that a microphone is connected, then retry or use the form.",
        ),
      );
    }, 20000);
    // Request microphone before creating a billable provider session.
    const acquiredStream = await duringSetup(
      navigator.mediaDevices
        .getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true,
          },
        })
        .then((acquired) => {
          // The permission dialog cannot be aborted. Stop a late grant instead
          // of letting it continue into a provider session after cancellation.
          if (cleaned || ending) {
            acquired.getTracks().forEach((track) => track.stop());
            throw setupError || new Error("Voice startup was cancelled.");
          }
          return acquired;
        }),
    );
    stream = acquiredStream;
    ctx = new AudioContext();
    await duringSetup(ctx.resume());
    await duringSetup(ctx.audioWorklet.addModule("/pcm-worklet.js"));
    requestingToken = true;
    const {
      token,
      sessionId: id,
      config,
    } = await duringSetup(
      post("voice/token", { coreId: o.coreId }, setupController.signal),
    );
    sessionId = id;
    setupComplete = true;
    clearTimeout(setupTimer);
    ws = new WebSocket(
      `wss://agents.assemblyai.com/v1/ws?token=${encodeURIComponent(token)}`,
    );
    const input = ctx.createMediaStreamSource(acquiredStream);
    node = new AudioWorkletNode(ctx, "benchback-pcm");
    input.connect(node);
    // Keep worklet processing while never feeding microphone audio back to the speakers.
    const silent = ctx.createGain();
    silent.gain.value = 0;
    node.connect(silent);
    silent.connect(ctx.destination);
    node.port.onmessage = (e) => {
      if (
        !ready ||
        ending ||
        !ws ||
        ws.readyState !== WebSocket.OPEN ||
        ws.bufferedAmount > 128000
      )
        return;
      const bytes = new Uint8Array(e.data);
      let raw = "";
      for (let i = 0; i < bytes.length; i++)
        raw += String.fromCharCode(bytes[i]);
      send({ type: "input.audio", audio: btoa(raw) });
    };
    ws.onopen = () => send({ type: "session.update", session: config });
    ws.onmessage = (e) => {
      if (cleaned) return;
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.type === "session.ready") {
        ready = true;
        clearTimeout(connectTimer);
        o.onStatus("listening");
        safetyTimer = setTimeout(end, 595000);
      } else if (m.type === "reply.started") {
        responseActive = true;
        acceptAudio = true;
        o.onStatus("speaking");
      } else if (m.type === "input.speech.started") {
        // Interactive tool results are accepted only after reply.done.
        responseActive = true;
        interruptionEpoch++;
        acceptAudio = false;
        pending.clear();
        stopPlayback();
        o.onStatus("listening");
      } else if (m.type === "reply.done") {
        responseActive = false;
        if (m.status === "interrupted") {
          pending.clear();
          stopPlayback();
        } else flush();
        if (!ending) o.onStatus("listening");
      } else if (m.type === "reply.audio" && ctx && !ending && acceptAudio) {
        try {
          const raw = atob(m.data);
          const view = new DataView(new ArrayBuffer(raw.length));
          for (let i = 0; i < raw.length; i++)
            view.setUint8(i, raw.charCodeAt(i));
          const buffer = ctx.createBuffer(1, Math.floor(raw.length / 2), 24000);
          const channel = buffer.getChannelData(0);
          for (let i = 0; i < channel.length; i++)
            channel[i] = view.getInt16(i * 2, true) / 32768;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          sources.add(source);
          source.onended = () => sources.delete(source);
          nextPlayback = Math.max(nextPlayback, ctx.currentTime + 0.02);
          source.start(nextPlayback);
          nextPlayback += buffer.duration;
        } catch {
          o.onError(
            "A voice reply could not be played. The text remains available.",
          );
        }
      } else if (
        m.type === "transcript.user" ||
        m.type === "transcript.agent"
      ) {
        const entry = {
          id: m.item_id || crypto.randomUUID(),
          speaker: m.type === "transcript.user" ? "Technician" : "Benchback",
          text: String(m.text || ""),
        };
        if (entry.text) {
          o.onTranscript(entry);
          const write = post(`sessions/${sessionId}/transcript`, entry).catch(
            () =>
              o.onError(
                "A transcript line could not be saved. Your structured return record is still available.",
              ),
          );
          writes.add(write);
          transcriptWrites.add(write);
          void write.finally(() => {
            writes.delete(write);
            transcriptWrites.delete(write);
          });
        }
      } else if (m.type === "tool.call") {
        const callId = String(m.call_id);
        if (calls.has(callId)) return;
        const epoch = interruptionEpoch;
        const promise = (async () => {
          try {
            // Grounding checks read finalized transcript lines from the server.
            await Promise.allSettled([...transcriptWrites]);
            const d = await post(`sessions/${sessionId}/tool`, {
              callId,
              name: m.name,
              arguments:
                typeof m.arguments === "string"
                  ? JSON.parse(m.arguments)
                  : m.arguments,
            });
            if (d.state) o.onState(d.state, d.event);
            if (!ending && epoch === interruptionEpoch) {
              pending.set(callId, {
                type: "tool.result",
                call_id: callId,
                result: JSON.stringify(d.result),
              });
              flush();
            }
          } catch (err) {
            const message = (err as Error).message;
            o.onError(message);
            if (!ending && epoch === interruptionEpoch) {
              pending.set(callId, {
                type: "tool.result",
                call_id: callId,
                result: JSON.stringify({ error: message, saved: false }),
              });
              flush();
            }
          }
        })();
        calls.set(callId, promise);
        writes.add(promise);
        void promise.finally(() => writes.delete(promise));
      } else if (m.type === "session.error") {
        o.onError(`Voice service: ${m.message || m.code || "session error"}`);
        end();
      } else if (m.type === "session.ended") clean();
    };
    ws.onerror = () => {
      o.onError(
        "The voice connection failed. Check your connection and retry; saved records are preserved.",
      );
      end();
    };
    ws.onclose = () => {
      if (!ending && !cleaned)
        o.onError(
          "The voice connection ended. Start another check to continue; no records were discarded.",
        );
      clean();
    };
    connectTimer = setTimeout(() => {
      o.onError("Voice startup timed out. Please retry or use the form.");
      end();
    }, 20000);
    return {
      end,
      mute: (muted: boolean) =>
        stream?.getAudioTracks().forEach((t) => (t.enabled = !muted)),
    };
  } catch (e) {
    clean();
    const err = e as Error;
    if (err.name === "NotAllowedError")
      throw new Error(
        "Microphone permission was denied. Allow the microphone in your browser settings or use the form.",
      );
    if (err.name === "NotFoundError")
      throw new Error("No microphone was found. Connect one or use the form.");
    throw e;
  }
}
