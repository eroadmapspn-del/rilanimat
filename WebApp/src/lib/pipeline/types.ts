import { z } from "zod";
import { lookSchema } from "@/lib/look";

export const languageSchema = z.enum(["Hindi", "Hinglish", "English"]);

export const pollSchema = z.object({
  ask: z.string().min(3).max(300),
  a: z.string().min(1).max(120),
  b: z.string().min(1).max(120),
  /** The option the NEXT episode really shows. Never revealed before that episode. */
  answer: z.enum(["a", "b"]),
  /** One spoken sentence at the start of the next episode: "last time's question was ... the answer is ..." */
  reveal: z.string().min(3).max(500),
});
export type Poll = z.infer<typeof pollSchema>;

export const planSchema = z.object({
  title: z.string().min(1).max(100),
  premise: z.string().min(10).max(1200),
  tone: z.string().min(2).max(400),
  visualStyle: z.string().min(2).max(600),
  arc: z.string().min(10).max(1800),
  cast: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        role: z.string().max(400),
        description: z.string().min(5).max(1000),
        /** true when this is one of the user's saved characters (reuse by exact name, no new look) */
        existing: z.boolean(),
        look: lookSchema.optional(),
      }),
    )
    .min(1)
    .max(8),
  episodes: z
    .array(
      z.object({
        number: z.number().int().min(1),
        title: z.string().min(1).max(100),
        summary: z.string().min(10).max(1500),
        cliffhanger: z.string().min(5).max(700),
        poll: pollSchema,
      }),
    )
    .min(1)
    .max(12),
});
export type Plan = z.infer<typeof planSchema>;

/** What Gemini returns for one episode before we check and repair it. Enums are validated in code, not here,
 *  so one wrong prop name never throws away a whole script. */
export const draftSchema = z.object({
  title: z.string().min(1).max(100),
  hooks: z.array(z.object({ type: z.string(), line: z.string().min(3).max(400) })).min(3).max(3),
  chosenHook: z.number().int().min(0).max(2),
  scenes: z
    .array(
      z.object({
        text: z.string().min(3).max(700),
        camera: z.string().optional(),
        transition: z.string().optional(),
        art: z.object({
          location: z.string(),
          props: z.array(z.string()).max(4).default([]),
          characters: z
            .array(z.object({ name: z.string(), mood: z.string().optional(), action: z.string().optional() }))
            .max(3)
            .default([]),
          fog: z.number().min(0).max(1).optional(),
          rain: z.boolean().optional(),
          dust: z.boolean().optional(),
          view: z.string().optional(),
        }),
      }),
    )
    .min(5)
    .max(16),
});
export type Draft = z.infer<typeof draftSchema>;

export type CastMember = { id: string; name: string; description: string; look: z.infer<typeof lookSchema> | null };
