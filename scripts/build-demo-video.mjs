import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Deterministic assembly of genuine hosted-app screenshots and recorded audio.
// No browser simulation, invented UI transitions, or synthetic agent replies.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'outputs/video');
const renderDir = path.join(out, 'render');
const ffmpeg = process.env.BENCHBACK_FFMPEG || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const ffprobe = process.env.BENCHBACK_FFPROBE || '/opt/homebrew/bin/ffprobe';
const deckDir = process.env.BENCHBACK_DECK_IMAGES || '/tmp/benchback-pitch/build';
const args = process.argv.slice(2);
const planOnly = args.includes('--plan-only');
const previewArg = args.indexOf('--preview');
const previewId = previewArg >= 0 ? args[previewArg + 1] : null;
const planArg = args.indexOf('--plan');
const providerArg = args.indexOf('--provider');
const planPath = planArg >= 0 ? resolve(args[planArg + 1]) : path.join(out, 'edit-plan.json');
const providerPath = providerArg >= 0 ? resolve(args[providerArg + 1]) : path.join(out, 'provider-clips.json');
const narration = JSON.parse(await fs.readFile(path.join(out, 'narration/manifest.json'), 'utf8'));
await fs.mkdir(renderDir, { recursive: true });
function resolve(p) {
  if (!p) throw new Error('An input path is missing.');
  return path.isAbsolute(p) ? p : path.join(root, p);
}
function probe(p) {
  return JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', p], { encoding: 'utf8' }));
}
function seconds(p) { return Number(probe(p).format.duration); }
const image = (name) => path.join(out, 'screens', name);
const deck = (n) => path.join(deckDir, `slide-${n}.png`);
const defaultShots = {
  '01-problem': [{ image: deck(1), weight: 1 }],
  '02-dashboard': [{ image: image('02-dashboard.png'), weight: 1 }],
  '03-matching': [{ image: image('03-matching.png'), weight: 1 }],
  '04-inspection': [{ image: image('04-inspection.png'), weight: 1 }],
  '05-approval': [{ image: image('05-packet.png'), weight: 1 }],
  '06-partial-credit': [{ image: image('06-credit-entry.png'), weight: 0.25 }, { image: image('06-partial-credit.png'), weight: 0.75 }],
  '07-final-credit': [{ image: image('07-final-credit.png'), weight: 1 }],
  '08-business': [{ image: deck(4), weight: 0.28 }, { image: deck(7), weight: 0.72 }],
  '09-closing': [{ image: deck(1), weight: 1 }],
};
function normalizeWord(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }
function wrapCaption(text, maxLine = 38) {
  if (text.length <= maxLine) return text;
  const words = text.split(/\s+/);
  let best = 1, score = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const penalty = Math.abs(a.length - b.length) + Math.max(0, a.length - maxLine) * 10 + Math.max(0, b.length - maxLine) * 10;
    if (penalty < score) { score = penalty; best = i; }
  }
  return words.slice(0, best).join(' ') + '\n' + words.slice(best).join(' ');
}
async function polishedCaptions(clip) {
  const data = JSON.parse(await fs.readFile(path.join(out, 'narration', `${clip.id}.transcript.json`), 'utf8'));
  const punctuated = data.text.trim().split(/\s+/);
  const timed = data.words;
  const words = []; let cursor = 0;
  for (const token of punctuated) {
    const wanted = normalizeWord(token), begin = cursor;
    let joined = '';
    while (cursor < timed.length && joined.length < wanted.length) joined += normalizeWord(timed[cursor++].word);
    if (joined !== wanted || cursor === begin) throw new Error(`Caption alignment needs review for ${clip.id}. Refusing to guess punctuation or currency.`);
    words.push({ word: token, start: timed[begin].start, end: timed[cursor - 1].end });
  }
  if (cursor !== timed.length) throw new Error(`Unaligned caption words in ${clip.id}.`);
  const result = []; let group = [];
  const flush = () => {
    if (!group.length) return;
    result.push({ start: group[0].start, end: Math.min(clip.duration, group.at(-1).end + 0.12), text: wrapCaption(group.map(w => w.word).join(' ')) });
    group = [];
  };
  for (const word of words) {
    if (group.length && (group.map(w => w.word).join(' ').length + word.word.length > 70 || word.end - group[0].start > 4.4)) flush();
    group.push(word);
    if (/[.!?]$/.test(word.word)) flush();
  }
  flush();
  for (let i = 0; i < result.length - 1; i++) result[i].end = Math.min(result[i].end, result[i + 1].start);
  return result;
}
let provider;
try { provider = JSON.parse(await fs.readFile(providerPath, 'utf8')); } catch {
  if (!planOnly && !previewId) throw new Error(`Actual provider audio is required before final rendering. Supply ${providerPath}.`);
}
let plan;
if (planArg >= 0) {
  plan = JSON.parse(await fs.readFile(planPath, 'utf8'));
} else {
  const clips = [];
  for (const c of narration.clips) {
    clips.push({ id: c.id, title: c.title, kind: 'narration', audio: path.join(out, 'narration', c.file), duration: c.duration, shots: defaultShots[c.id], captions: await polishedCaptions(c), lead: 0.35, tail: c.id === '07-final-credit' ? 1.65 : 0.65, disclosure: 'Demonstration data. AI-generated narration.' });
    const inserted = provider?.clips?.filter(p => (p.after || '03-matching') === c.id) || [];
    if (inserted.length || (c.id === '03-matching' && !provider?.clips?.length)) {
      if (inserted.length) {
        for (const p of inserted) {
          if (!p.audio || !p.captions?.length) throw new Error('Every actual AssemblyAI clip needs audio and accurate captions.');
          clips.push({ ...p, kind: 'provider', audio: resolve(p.audio), shots: p.shots || [{ image: resolve(p.image), weight: 1 }], lead: p.lead ?? 0.25, tail: p.tail ?? 0.75, disclosure: p.disclosure || 'Demonstration data. Actual AssemblyAI session audio.' });
        }
      } else clips.push({ id: 'assemblyai-recording-required', kind: 'provider', pending: true });
    }
  }
  plan = { version: 1, width: 1920, height: 1080, fps: 30, provenance: 'Actual hosted application captures, editable pitch slides, AI-generated narration, and actual AssemblyAI session audio. Screenshots are edited stills, not a continuous screen recording.', clips };
}
await fs.writeFile(planPath, JSON.stringify(plan, null, 2));
if (planOnly) {
  console.log(`Edit plan written: ${planPath}`);
  console.log(`Provider clip ready: ${plan.clips.some(c => c.kind === 'provider' && !c.pending)}`);
  process.exit(0);
}
if (previewId) {
  plan.clips = plan.clips.filter(c => c.id === previewId && !c.pending);
  if (plan.clips.length !== 1) throw new Error('Preview requires one existing clip ID.');
}
if (!previewId && (!plan.clips.some(c => c.kind === 'provider' && !c.pending) || plan.clips.some(c => c.pending))) throw new Error('Final video requires actual AssemblyAI session audio.');
function filterPath(p) { return p.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "'\\''"); }
function assText(s) { return String(s).replace(/[{}]/g, '').replace(/\\/g, '').replace(/\r?\n/g, '\\N').replace(/\u2014/g, ', '); }
function assTime(t) {
  const cs = Math.round(Math.max(0, t) * 100);
  return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, '0')}:${String(Math.floor(cs / 100) % 60).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
}
function srtTime(t) {
  const ms = Math.round(Math.max(0, t) * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}
function ass(captions, title, disclosure, duration) {
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Caption,Arial,38,&H00FFFFFF,&H00FFFFFF,&H00141B2D,&H00141B2D,0,0,0,0,100,100,0,0,1,1.5,0,2,100,100,40,1\nStyle: Brand,Arial,32,&H0069EFC5,&H0069EFC5,&H00141B2D,&H00141B2D,-1,0,0,0,100,100,0,0,1,0,0,7,64,64,22,1\nStyle: Chapter,Arial,30,&H00FFFFFF,&H00FFFFFF,&H00141B2D,&H00141B2D,-1,0,0,0,100,100,0,0,1,0,0,9,64,64,24,1\nStyle: Disclosure,Arial,20,&H00BDC3D0,&H00BDC3D0,&H00141B2D,&H00141B2D,0,0,0,0,100,100,0,0,1,0,0,7,64,64,64,1\nStyle: URL,Arial,20,&H00BDC3D0,&H00BDC3D0,&H00141B2D,&H00141B2D,0,0,0,0,100,100,0,0,1,0,0,9,64,64,64,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const whole = assTime(duration);
  return header + `Dialogue: 0,0:00:00.00,${whole},Brand,,0,0,0,,Benchback\nDialogue: 0,0:00:00.00,${whole},Chapter,,0,0,0,,${assText(title)}\nDialogue: 0,0:00:00.00,${whole},Disclosure,,0,0,0,,${assText(disclosure)}\nDialogue: 0,0:00:00.00,${whole},URL,,0,0,0,,benchback-ai.web.app\n` + captions.map(c => `Dialogue: 1,${assTime(c.start)},${assTime(c.end)},Caption,,0,0,0,,${assText(c.text)}\n`).join('');
}
const globalCaptions = [], chapters = [], rendered = [];
let offset = 0;
for (const [index, c] of plan.clips.entries()) {
  if (!/^[a-zA-Z0-9_-]+$/.test(c.id)) throw new Error('Clip IDs must be safe filenames.');
  const audio = resolve(c.audio);
  await fs.access(audio);
  const inputDuration = seconds(audio), trimStart = c.trimStart ?? 0, trimEnd = c.trimEnd ?? inputDuration;
  if (trimStart < 0 || trimEnd > inputDuration + 0.04 || trimEnd <= trimStart) throw new Error(`Invalid audio trim: ${c.id}`);
  const lead = c.lead ?? 0.35, tail = c.tail ?? 0.65;
  const duration = Math.ceil((trimEnd - trimStart + lead + tail) * 30) / 30;
  const captions = c.captions.filter(x => x.end > trimStart && x.start < trimEnd).map(x => ({ start: Math.max(0, x.start - trimStart) + lead, end: Math.min(trimEnd - trimStart, x.end - trimStart) + lead, text: wrapCaption(x.text.replace(/\n/g, ' ')) }));
  for (const cap of captions) {
    if (cap.end <= cap.start || cap.end > duration || cap.text.includes('\u2014')) throw new Error(`Invalid caption: ${c.id}`);
    globalCaptions.push({ ...cap, start: cap.start + offset, end: cap.end + offset });
  }
  chapters.push({ start: offset, title: c.title, id: c.id, kind: c.kind, duration });
  const stem = path.join(renderDir, `${String(index + 1).padStart(2, '0')}-${c.id}`);
  await fs.writeFile(stem + '.ass', ass(captions, c.title, c.disclosure, duration));
  const cli = ['-hide_banner', '-loglevel', 'warning', '-y'];
  const filters = [];
  const weight = c.shots.reduce((sum, s) => sum + (s.weight ?? 1), 0);
  let assignedFrames = 0;
  for (const [i, shot] of c.shots.entries()) {
    const asset = resolve(shot.image); await fs.access(asset);
    const frames = i === c.shots.length - 1 ? Math.round(duration * 30) - assignedFrames : Math.round(duration * 30 * (shot.weight ?? 1) / weight);
    assignedFrames += frames;
    cli.push('-loop', '1', '-framerate', '30', '-t', String(frames / 30), '-i', asset);
    filters.push(`[${i}:v]scale=1792:804:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:108:color=0x141B2D,setsar=1,fps=30,format=yuv420p,setpts=PTS-STARTPTS[v${i}]`);
  }
  cli.push('-i', audio);
  filters.push(c.shots.map((_, i) => `[v${i}]`).join('') + `concat=n=${c.shots.length}:v=1:a=0,ass='${filterPath(stem + '.ass')}'[video]`);
  filters.push(`[${c.shots.length}:a]atrim=start=${trimStart}:end=${trimEnd},asetpts=PTS-STARTPTS,adelay=${Math.round(lead * 1000)}:all=1,apad,atrim=duration=${duration},loudnorm=I=-16:LRA=11:TP=-1.5,aresample=48000[audio]`);
  cli.push('-filter_complex', filters.join(';'), '-map', '[video]', '-map', '[audio]', '-t', String(duration), '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-threads', '2', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', stem + '.mp4');
  console.log(`Rendering ${c.id}: ${duration.toFixed(2)}s`);
  execFileSync(ffmpeg, cli, { stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 8 * 1024 * 1024 });
  const encodedDuration = seconds(stem + '.mp4');
  chapters.at(-1).duration = encodedDuration;
  rendered.push(stem + '.mp4'); offset += encodedDuration;
}
const concat = path.join(renderDir, 'concat.txt');
await fs.writeFile(concat, rendered.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
const outputStem = previewId ? `preview-${previewId}` : 'benchback-demo';
const finalVideo = path.join(out, `${outputStem}.mp4`);
execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'warning', '-y', '-f', 'concat', '-safe', '0', '-i', concat, '-c', 'copy', '-movflags', '+faststart', finalVideo], { stdio: ['ignore', 'ignore', 'pipe'] });
await fs.writeFile(path.join(out, `${outputStem}.srt`), globalCaptions.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n'));
await fs.writeFile(path.join(out, previewId ? `${outputStem}-chapters.txt` : 'chapters.txt'), chapters.map(c => `${String(Math.floor(c.start / 60)).padStart(2, '0')}:${String(Math.floor(c.start % 60)).padStart(2, '0')} ${c.title}`).join('\n') + '\n');
const details = probe(finalVideo);
await fs.writeFile(path.join(out, previewId ? `${outputStem}-report.json` : 'render-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), finalVideo, duration: Number(details.format.duration), expectedDuration: offset, chapters, clips: rendered, video: details.streams.find(s => s.codec_type === 'video'), audio: details.streams.find(s => s.codec_type === 'audio'), provenance: plan.provenance }, null, 2));
console.log(`Created ${finalVideo} (${Number(details.format.duration).toFixed(2)} seconds)`);
