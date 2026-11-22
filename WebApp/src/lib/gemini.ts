import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";

let client: GoogleGenAI | null = null;
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, apiVersion: "v1beta" }));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function extractJson(text: string): unknown {
  let t = text.trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(t);
}

/**
 * Ask Gemini for JSON and validate it with zod. If the reply is not valid JSON or fails the schema, the exact problem is
 * sent back once or twice so the model can fix it. Transient 429/5xx errors are retried with backoff.
 */
export async function generateJson<T>(opts: {
  system: string;
  prompt: string;
  schema: ZodType<T>;
  temperature?: number;
  model?: string;
  maxAttempts?: number;
}): Promise<T> {
  const model = opts.model ?? process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";
  const attempts = opts.maxAttempts ?? 3;
  let prompt = opts.prompt;
  let lastProblem = "";

  for (let i = 1; i <= attempts; i++) {
    let text = "";
    for (let retry = 0; ; retry++) {
      try {
        const res = await ai().models.generateContent({
          model,
          contents: prompt,
          config: { systemInstruction: opts.system, responseMimeType: "application/json", temperature: opts.temperature ?? 0.9 },
        });
        text = res.text ?? "";
        break;
      } catch (e) {
        const msg = String((e as Error)?.message ?? e);
        const transient = /429|500|502|503|504|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded/i.test(msg);
        if (!transient || retry >= 3) throw new Error(`Gemini request failed: ${msg.slice(0, 300)}`);
        await sleep(1500 * 2 ** retry);
      }
    }
    try {
      const parsed = opts.schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
      lastProblem = parsed.error.issues.slice(0, 8).map((x) => `${x.path.join(".") || "(root)"}: ${x.message}`).join("; ");
    } catch (e) {
      lastProblem = `not valid JSON (${(e as Error).message})`;
    }
    prompt = `${opts.prompt}\n\nYOUR PREVIOUS REPLY WAS REJECTED: ${lastProblem}\nReturn the complete corrected JSON only.`;
  }
  throw new Error(`Gemini did not return a usable result after ${attempts} attempts: ${lastProblem}`);
}
