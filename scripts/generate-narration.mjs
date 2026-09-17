import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Official API references:
// https://developers.openai.com/api/docs/guides/text-to-speech
// https://developers.openai.com/api/reference/typescript/resources/audio/subresources/transcriptions/methods/create
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(path.join(root, '.env.local')); } catch { /* Environment injection is also supported. */ }
const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error('Set OPENAI_API_KEY in the environment or ignored .env.local.');
const out = path.join(root, 'outputs/video/narration');
await fs.mkdir(out, { recursive: true });
const sections = [
  { id: '01-problem', title: 'Money on the shelf', visual: 'Benchback cover with creator credit and AI-generated narration disclosure.', text: 'The repair is finished. But the old alternator still represents money the shop already paid. Benchback, created by Shivam Gupta, helps recover that deposit.' },
  { id: '02-dashboard', title: 'A specific recovery workflow', visual: 'Public Firebase dashboard. Label all records Demonstration data.', text: 'This fictional diesel shop has a two-hundred-and-forty-dollar deposit tied to one alternator. Benchback follows it from the bench, through the return, to the supplier credit that actually arrives.' },
  { id: '03-matching', title: 'Match the exact purchase', visual: 'Selected WO-418, INV-8042, purchase line 1, ALT-24-160. Transition to actual AssemblyAI audio.', text: 'Similar parts can belong to different jobs. The conversation checks the work order, invoice, part, and purchase line before the operator confirms the match.' },
  { id: '04-inspection', title: 'Resolve the missing box', visual: 'Recorded observations and stored supplier packaging policy after the actual voice segment.', text: 'The original box is missing. This fictional supplier permits an approved alternative container. The agent checks that policy and records reported condition. The supplier still decides whether to accept the return.' },
  { id: '05-approval', title: 'Human approval', visual: 'Operator confirms match, approves packet, downloads PDF, then records dispatch and receipt.', text: 'A person reviews the evidence and approves the return packet. The agent cannot approve its own work. Dispatch and supplier receipt are recorded separately, so the follow-up clock starts at the right point.' },
  { id: '06-partial-credit', title: 'An unresolved forty dollars', visual: 'Actual manual credit entry or import CM-219 for $200. Show $40 outstanding.', text: 'The first supplier memo credits two hundred dollars. Forty dollars remain unresolved. Benchback keeps that gap visible, with the credit reference and history. Preparing or shipping a return never counts as money recovered.' },
  { id: '07-final-credit', title: 'Close with actual credit', visual: 'Actual follow-up credit CM-220 for $40. Show $240 received and $0 outstanding.', text: 'The follow-up memo adds forty dollars. Now the full two hundred and forty is credited, and the discrepancy reaches zero.' },
  { id: '08-business', title: 'Commercial test and architecture', visual: 'Architecture slide, then proposed pricing. Label price as a hypothesis.', text: 'AssemblyAI powers the live conversation and tool calls. Firebase provides login and storage. The proposed plan is ninety-nine dollars per location, including two hundred voice minutes. At the published rate, that is fifteen dollars in voice cost before hosting and support. A pilot must compare voice against a short form and prove less work or more actual credit.' },
  { id: '09-closing', title: 'Try Benchback', visual: 'Final credited record, public URL, GitHub, and Created by Shivam Gupta.', text: 'Benchback connects the part on the bench to the credit in the ledger. Try the public app, inspect the code, and follow the whole return yourself.' },
];
const options = {
  model: 'gpt-4o-mini-tts', voice: 'cedar', response_format: 'wav', speed: 1.0,
  instructions: 'Narrate a polished product demonstration in a warm, confident, neutral voice. Speak clearly at approximately 150 words per minute. Use natural pauses and restrained emphasis. Sound conversational, not like an advertisement. Pronounce Benchback as bench back, AssemblyAI as Assembly A I, and Firebase as fire base. Read the supplied text exactly, without additions. Do not imitate a real person.',
};
const selected = process.argv[2];
function probe(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], { encoding: 'utf8' }).trim());
}
function wrapped(text) {
  const words = text.split(/\s+/); let a = '', b = '';
  for (const word of words) {
    if (!b && (a.length + word.length + 1 <= 38 || !a)) a += (a ? ' ' : '') + word;
    else b += (b ? ' ' : '') + word;
  }
  return b ? `${a}\n${b}` : a;
}
function captions(words, duration) {
  const groups = []; let group = [];
  const flush = () => {
    if (!group.length) return;
    let text = group.map(w => w.word).join(' ')
      .replace(/Bench\s*back/gi, 'Benchback').replace(/Assembly\s*A\s*I/gi, 'AssemblyAI')
      .replace(/Fire\s*base/gi, 'Firebase');
    const start = Math.max(0, group[0].start);
    const end = Math.min(duration, Math.max(start + 0.5, group.at(-1).end + 0.12));
    groups.push({ start: +start.toFixed(3), end: +end.toFixed(3), text: wrapped(text) }); group = [];
  };
  for (const word of words) {
    if (group.length && (group.map(w => w.word).join(' ').length + word.word.length > 66 || group.length >= 10 || word.end - group[0].start > 4.5)) flush();
    group.push(word);
    if (/[.!?]$/.test(word.word)) flush();
  }
  flush();
  for (let i = 0; i < groups.length - 1; i++) groups[i].end = Math.min(groups[i].end, groups[i + 1].start);
  return groups;
}
function timestamp(t) {
  const ms = Math.round(t * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}
for (const section of sections) {
  if (selected && section.id !== selected) continue;
  const wav = path.join(out, `${section.id}.wav`);
  const requestPath = path.join(out, `${section.id}.request.json`);
  const request = { ...options, input: section.text };
  const cachedRequest = await fs.readFile(requestPath, 'utf8').catch(() => '');
  const cached = await fs.stat(wav).then(() => cachedRequest === JSON.stringify(request)).catch(() => false);
  if (!cached) {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(request), signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error(`Speech generation failed for ${section.id}: HTTP ${res.status}`);
    const streamedWav = path.join(out, `${section.id}.stream.wav`);
    await fs.writeFile(streamedWav, Buffer.from(await res.arrayBuffer()));
    // The API streams WAV with an unknown RIFF size. Remux to write a complete local header.
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', streamedWav, '-c:a', 'copy', wav], { stdio: 'pipe' });
    await fs.unlink(streamedWav);
    await fs.writeFile(requestPath, JSON.stringify(request));
    await fs.rm(path.join(out, `${section.id}.transcript.json`), { force: true });
  }
  const duration = probe(wav);
  const transcriptPath = path.join(out, `${section.id}.transcript.json`);
  let transcript;
  try { transcript = JSON.parse(await fs.readFile(transcriptPath, 'utf8')); } catch {
    const form = new FormData();
    form.set('file', new Blob([await fs.readFile(wav)], { type: 'audio/wav' }), `${section.id}.wav`);
    form.set('model', 'whisper-1'); form.set('language', 'en'); form.set('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');
    form.set('prompt', 'Benchback. Shivam Gupta. AssemblyAI. Firebase. Supplier credit.');
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) throw new Error(`Caption alignment failed for ${section.id}: HTTP ${res.status}`);
    transcript = await res.json();
    await fs.writeFile(transcriptPath, JSON.stringify(transcript, null, 2));
  }
  if (!transcript.words?.length) throw new Error(`Missing word timestamps for ${section.id}.`);
  const segments = captions(transcript.words, duration);
  const clip = { ...section, file: `${section.id}.wav`, duration, model: options.model, voice: options.voice, disclosure: 'AI-generated narration', captionSource: 'whisper-1 word timestamps', transcript: transcript.text, captions: segments };
  await fs.writeFile(path.join(out, `${section.id}.json`), JSON.stringify(clip, null, 2));
  await fs.writeFile(path.join(out, `${section.id}.srt`), segments.map((c, i) => `${i + 1}\n${timestamp(c.start)} --> ${timestamp(c.end)}\n${c.text}\n`).join('\n'));
  console.log(`${section.id}: ${duration.toFixed(2)} seconds, ${segments.length} caption segments`);
}
const clips = [];
for (const section of sections) {
  try { clips.push(JSON.parse(await fs.readFile(path.join(out, `${section.id}.json`), 'utf8'))); } catch { /* Partial runs are allowed. */ }
}
await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify({ version: 1, disclosure: 'AI-generated narration. Actual AssemblyAI session audio is inserted separately.', publicUrl: 'https://benchback-ai.web.app', duration: clips.reduce((n, c) => n + c.duration, 0), clips }, null, 2));
const md = `# Benchback final demo narration\n\nCreated by Shivam Gupta.\n\nThese clips use an AI-generated Cedar narrator. They do not impersonate Shivam. Display **AI-generated narration** on screen and disclose it in the video description. Label the dataset **Demonstration data**. Insert the separately recorded actual AssemblyAI conversation between sections 03 and 04, with accurate captions. Do not substitute generated narration for agent responses.\n\nThe supplied timing manifest uses actual WAV durations and Whisper word timestamps. Manual workflow footage can run under the narration with pauses added for important state changes.\n\n${sections.map(s => `## ${s.id}: ${s.title}\n\n**Visual:** ${s.visual}\n\n${s.text}\n`).join('\n')}\n## Credits and implementation\n\nVoiceover: OpenAI gpt-4o-mini-tts, Cedar. Caption alignment: Whisper word timestamps. Live application voice: AssemblyAI native Voice Agent API.\n\nReferences: [Text to speech](https://developers.openai.com/api/docs/guides/text-to-speech) and [word timestamps](https://developers.openai.com/api/reference/typescript/resources/audio/subresources/transcriptions/methods/create).\n`;
await fs.writeFile(path.join(root, 'submission/11-final-video-script.md'), md);
console.log(`Total narration: ${clips.reduce((n, c) => n + c.duration, 0).toFixed(2)} seconds`);
