/**
 * Audio helpers in pure TypeScript (no ffmpeg needed on the server).
 *
 * Word timing works like the original Python pipeline: the audio is ground truth. The script is cut into clauses at
 * punctuation, the audio into stretches of speech at its silences, the stretches are matched to the clauses, and the
 * words inside a clause are spread over the speech by their length. Timings are "pause-aligned": exact at every pause,
 * approximate between two pauses.
 */
export type Wav = { samples: Int16Array; sampleRate: number };
export type TimedWord = { w: string; start: number; end: number };

// ------------------------------------------------------------------------------------------------ WAV in / out
export function parseWav(buf: Buffer): Wav {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error("Not a WAV file.");
  let pos = 12, sampleRate = 24000, channels = 1, bits = 16, data: Buffer | null = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    let size = buf.readUInt32LE(pos + 4);
    if (id === "data" && (size === 0 || pos + 8 + size > buf.length)) size = buf.length - pos - 8; // streamed WAVs can have a bad size
    if (id === "fmt ") {
      channels = buf.readUInt16LE(pos + 10);
      sampleRate = buf.readUInt32LE(pos + 12);
      bits = buf.readUInt16LE(pos + 22);
    } else if (id === "data") {
      data = buf.subarray(pos + 8, pos + 8 + size);
      break;
    }
    pos += 8 + size + (size % 2);
  }
  if (!data) throw new Error("The WAV has no audio data.");
  if (bits !== 16) throw new Error(`Only 16-bit WAV audio is supported (got ${bits}).`);
  const frames = Math.floor(data.length / (2 * channels));
  const samples = new Int16Array(frames);
  for (let i = 0; i < frames; i++) samples[i] = data.readInt16LE(i * 2 * channels); // first channel
  return { samples, sampleRate };
}

export function encodeWav({ samples, sampleRate }: Wav): Buffer {
  const bytes = samples.length * 2;
  const out = Buffer.alloc(44 + bytes);
  out.write("RIFF", 0, "ascii");
  out.writeUInt32LE(36 + bytes, 4);
  out.write("WAVEfmt ", 8, "ascii");
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(1, 22); // mono
  out.writeUInt32LE(sampleRate, 24);
  out.writeUInt32LE(sampleRate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36, "ascii");
  out.writeUInt32LE(bytes, 40);
  for (let i = 0; i < samples.length; i++) out.writeInt16LE(samples[i], 44 + i * 2);
  return out;
}

export const durationOf = (w: Wav) => w.samples.length / w.sampleRate;

/** Bring the voice to a steady loudness (about -16 dBFS RMS) without clipping. Returns a new Wav. */
export function normalize(w: Wav, targetDb = -16, ceiling = 0.95): Wav {
  let sum = 0, peak = 0, n = 0;
  for (const s of w.samples) {
    const a = Math.abs(s) / 32768;
    if (a > 0.01) { sum += a * a; n++; }
    if (a > peak) peak = a;
  }
  if (!n || !peak) return w;
  const rms = Math.sqrt(sum / n);
  const gain = Math.min(10 ** (targetDb / 20) / rms, ceiling / peak);
  const out = new Int16Array(w.samples.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(-32768, Math.min(32767, Math.round(w.samples[i] * gain)));
  return { samples: out, sampleRate: w.sampleRate };
}

// ------------------------------------------------------------------------------------------------ speech stretches
type Seg = [number, number];

/** Stretches of real speech: everything between silences quieter than `noiseDb` that last at least `minPause` seconds. */
export function speechSegments(w: Wav, noiseDb: number, minPause: number): Seg[] {
  const win = Math.max(1, Math.round(w.sampleRate * 0.01)); // 10 ms windows
  const nWin = Math.floor(w.samples.length / win);
  const dur = durationOf(w);
  const quiet: boolean[] = new Array(nWin);
  for (let k = 0; k < nWin; k++) {
    let e = 0;
    for (let i = k * win; i < (k + 1) * win; i++) e += (w.samples[i] / 32768) ** 2;
    const db = 10 * Math.log10(e / win + 1e-12);
    quiet[k] = db < noiseDb;
  }
  const silences: Seg[] = [];
  let start = -1;
  for (let k = 0; k <= nWin; k++) {
    if (k < nWin && quiet[k]) { if (start < 0) start = k; continue; }
    if (start >= 0) {
      const a = (start * win) / w.sampleRate, b = (k * win) / w.sampleRate;
      if (b - a >= minPause) silences.push([a, k === nWin ? dur : b]);
      start = -1;
    }
  }
  const segs: Seg[] = [];
  let cursor = 0;
  for (const [a, b] of silences) {
    if (a - cursor > 0.08) segs.push([cursor, a]);
    cursor = b;
  }
  if (dur - cursor > 0.08) segs.push([cursor, dur]);
  return segs;
}

/** Split the speech stretches into one consecutive group per clause so each group's share of the speech time best
 *  matches its clause's share of the text (dynamic programming). null when there are fewer stretches than clauses. */
function groupSegments(segs: Seg[], clauseWeights: number[]): Seg[][] | null {
  const n = clauseWeights.length, m = segs.length;
  if (m < n) return null;
  const totalW = clauseWeights.reduce((a, b) => a + b, 0);
  const prefix = [0];
  for (const [s, e] of segs) prefix.push(prefix.at(-1)! + (e - s));
  const totalT = prefix.at(-1)!;
  const cost = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(Infinity));
  const back = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  cost[0][0] = 0;
  for (let c = 1; c <= n; c++) {
    const want = clauseWeights[c - 1] / totalW;
    for (let j = c; j <= m; j++) {
      for (let k = c - 1; k < j; k++) {
        if (cost[c - 1][k] === Infinity) continue;
        const got = (prefix[j] - prefix[k]) / totalT;
        const v = cost[c - 1][k] + (got - want) ** 2;
        if (v < cost[c][j]) { cost[c][j] = v; back[c][j] = k; }
      }
    }
  }
  const groups: Seg[][] = [];
  let j = m;
  for (let c = n; c >= 1; c--) {
    const k = back[c][j];
    groups.push(segs.slice(k, j));
    j = k;
  }
  return groups.reverse();
}

/** The real time at `frac` (0..1) of the speech inside a group, skipping the silent gaps between its stretches. */
function timeAt(frac: number, group: Seg[]): number {
  let pos = frac * group.reduce((a, [s, e]) => a + (e - s), 0);
  for (const [s, e] of group) {
    if (pos <= e - s) return s + pos;
    pos -= e - s;
  }
  return group.at(-1)![1];
}

const norm = (t: string) => (t.match(/[\p{L}\p{M}\p{N}]/gu) ?? []).join("").toLowerCase();
const CLAUSE_END = /[,.;:!?…।॥—–]$/;

/** Place every word using the real pauses in the audio. Returns null when the audio cannot be matched to the script. */
export function alignByPauses(tokens: string[], w: Wav): TimedWord[] | null {
  const ranges: [number, number][] = [];
  let first = 0;
  tokens.forEach((t, i) => {
    if (CLAUSE_END.test(t) || i === tokens.length - 1) { ranges.push([first, i + 1]); first = i + 1; }
  });
  const weights = tokens.map((t) => norm(t).length + 1);
  const clauseW = ranges.map(([a, b]) => weights.slice(a, b).reduce((x, y) => x + y, 0));
  let groups: Seg[][] | null = null;
  for (const [noise, pause] of [[-40, 0.3], [-38, 0.25], [-42, 0.35], [-35, 0.3], [-45, 0.3], [-40, 0.2], [-40, 0.4]]) {
    const segs = speechSegments(w, noise, pause);
    if (segs.length === ranges.length) { groups = segs.map((s) => [s]); break; } // a perfect one-to-one match
    if (groups === null && segs.length > ranges.length) groups = groupSegments(segs, clauseW);
  }
  if (!groups) return null;
  const out: TimedWord[] = [];
  ranges.forEach(([a, b], ci) => {
    const wts = weights.slice(a, b), total = wts.reduce((x, y) => x + y, 0);
    const rel = [0];
    let acc = 0;
    for (const x of wts) { acc += x / total; rel.push(acc); }
    tokens.slice(a, b).forEach((token, k) => {
      out.push({ w: token, start: round(timeAt(rel[k], groups![ci])), end: round(timeAt(rel[k + 1], groups![ci])) });
    });
  });
  return out.map((x) => ({ ...x, end: Math.max(x.end, round(x.start + 0.05)) }));
}

/** Last resort when pauses cannot be matched: spread the words over the audio by length. */
export function estimateWords(tokens: string[], duration: number, lead = 0.15, tail = 0.25): TimedWord[] {
  const span = Math.max(0.1, duration - lead - tail);
  const wts = tokens.map((t) => norm(t).length + 1);
  const total = wts.reduce((a, b) => a + b, 0);
  let t = lead;
  return tokens.map((w, i) => {
    const step = (span * wts[i]) / total;
    const o = { w, start: round(t), end: round(t + step) };
    t += step;
    return o;
  });
}

const round = (x: number) => Math.round(x * 1000) / 1000;
