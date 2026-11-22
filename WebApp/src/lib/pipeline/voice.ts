import { GoogleGenAI } from "@google/genai";
import { alignByPauses, durationOf, encodeWav, estimateWords, normalize, parseWav, type TimedWord } from "./audio";
import type { EpisodeStory } from "./scriptwriter";

/** Gemini's built-in voices (names are the same for every language). */
export const VOICES = ["Kore", "Puck", "Charon", "Fenrir", "Aoede", "Zephyr", "Leda", "Orus"] as const;
export const DEFAULT_VOICE = "Kore";

export type VoiceResult = {
  provider: "gemini";
  voiceName: string;
  duration: number;
  /** pause-aligned: exact at every pause, approximate between two pauses. estimated: spread by word length. */
  timing: "pause-aligned" | "estimated";
  words: TimedWord[];
  notes: string[];
};

let client: GoogleGenAI | null = null;
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, apiVersion: "v1beta" }));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const narrationOf = (story: EpisodeStory) => story.scenes.map((s) => s.text.trim()).join(" ");

const STYLE_BY_LANGUAGE: Record<string, string> = {
  Hindi: "Say this in natural spoken Hindi, in a calm, slow storyteller's voice with quiet suspense, pausing briefly at every full stop",
  Hinglish: "Say this in natural spoken Hinglish, in a calm, slow storyteller's voice with quiet suspense, pausing briefly at every full stop",
  English: "Say this in a calm, slow storyteller's voice with quiet suspense, pausing briefly at every full stop",
};

export class QuotaError extends Error {}

async function tts(text: string, voiceName: string, language: string): Promise<Buffer> {
  const model = process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts";
  const prompt = `${STYLE_BY_LANGUAGE[language] ?? STYLE_BY_LANGUAGE.English}:\n\n${text}`;
  for (let retry = 0; ; retry++) {
    try {
      const res = await ai().models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
      });
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
      if (!part?.data) throw new Error("Gemini returned no audio.");
      const raw = Buffer.from(part.data, "base64");
      if (raw.toString("ascii", 0, 4) === "RIFF") return raw;
      // raw 16-bit PCM, mono, 24 kHz (the mime type says rate=...)
      const rate = Number(/rate=(\d+)/.exec(part.mimeType ?? "")?.[1] ?? 24000);
      const samples = new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 2));
      return encodeWav({ samples: Int16Array.from(samples), sampleRate: rate });
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      if (/RESOURCE_EXHAUSTED|quota|429/i.test(msg) && !/UNAVAILABLE/.test(msg)) throw new QuotaError("The voice service has reached its limit for now. Please try again later.");
      const transient = /500|502|503|504|UNAVAILABLE|overloaded|no audio/i.test(msg);
      if (!transient || retry >= 2) throw new Error(`Voice generation failed: ${msg.slice(0, 300)}`);
      await sleep(2000 * (retry + 1));
    }
  }
}

/** One continuous narration for the whole episode, normalised, with word timings measured from its real pauses. */
export async function makeVoice(story: EpisodeStory, voiceName: string, language: string): Promise<{ wav: Buffer; info: VoiceResult }> {
  const text = narrationOf(story);
  const tokens = text.split(/\s+/).filter(Boolean);
  const raw = parseWav(await tts(text, voiceName, language));
  const wav = normalize(raw);
  const duration = durationOf(wav);
  const aligned = alignByPauses(tokens, wav);
  const notes = ["Gemini returns no word timings: each clause is placed from the pauses in the audio, and words inside a clause are spread by length."];
  if (!aligned) notes.push("The pauses did not match the punctuation, so captions are spread by word length and may drift.");
  return {
    wav: encodeWav(wav),
    info: { provider: "gemini", voiceName, duration: Math.round(duration * 1000) / 1000, timing: aligned ? "pause-aligned" : "estimated", words: aligned ?? estimateWords(tokens, duration), notes },
  };
}
