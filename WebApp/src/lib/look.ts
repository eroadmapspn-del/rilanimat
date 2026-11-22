import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** Mirrors `Look` in remotion/src/art/characters.tsx. Stored in Character.look and passed straight to the renderer. */
export const lookSchema = z.object({
  skin: hex,
  hair: hex,
  outfit: hex,
  trim: hex.optional(),
  hairStyle: z.enum(["long", "short", "bun", "plait", "balding"]),
  extras: z
    .array(z.enum(["beard", "stubble", "mustache", "glasses", "headphones", "hood", "strap", "lanyard", "pallu", "collar", "badge", "camera", "cap", "whitecoat", "tie"]))
    .max(6),
  age: z.number().int().min(3).max(90),
  size: z.number().min(0.5).max(1.2).optional(),
});
export type Look = z.infer<typeof lookSchema>;
