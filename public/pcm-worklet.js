// Streaming linear resampling from the actual hardware rate to mono 24 kHz PCM16.
// The fractional source position is retained between worklet frames.
class BenchbackPCM extends AudioWorkletProcessor {
  constructor() {
    super();
    this.input = [];
    this.position = 0;
    this.output = [];
  }
  process(inputs, outputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (let i = 0; i < channel.length; i++) this.input.push(channel[i]);
    const ratio = sampleRate / 24000;
    while (this.position + 1 < this.input.length) {
      const i = Math.floor(this.position),
        f = this.position - i;
      const v = this.input[i] * (1 - f) + this.input[i + 1] * f;
      this.output.push(
        Math.round(Math.max(-1, Math.min(1, v)) * (v < 0 ? 32768 : 32767)),
      );
      this.position += ratio;
    }
    const consumed = Math.floor(this.position);
    this.input.splice(0, consumed);
    this.position -= consumed;
    while (this.output.length >= 1200) {
      const chunk = this.output.splice(0, 1200);
      const buffer = new ArrayBuffer(2400);
      const view = new DataView(buffer);
      chunk.forEach((v, i) => view.setInt16(i * 2, v, true));
      this.port.postMessage(buffer, [buffer]);
    }
    const out = outputs[0];
    if (out) for (const ch of out) ch.fill(0);
    return true;
  }
}
registerProcessor("benchback-pcm", BenchbackPCM);
