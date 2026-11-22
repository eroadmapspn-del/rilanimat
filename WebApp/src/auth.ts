import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/limit";

const ROLE_REFRESH_MS = 5 * 60_000;
// Compared against when the email is unknown, so "no such user" and "wrong password" take the same time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

const credentialsSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/sign-in" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        if (!rateLimit(`login:${email}`, 8, 5 * 60_000)) return null;
        const user = await db.user.findUnique({ where: { email } });
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user?.passwordHash || !ok) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    /** Google/GitHub sign-in: find the user by email (this also adopts old Clerk users) or create them. */
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;
      const email = user.email?.toLowerCase();
      if (!email) return false; // accounts are keyed on email, so a provider that hides it cannot be used
      const row = await db.user.upsert({
        where: { email },
        // The provider has verified this email, so it now belongs to whoever is signing in. Dropping any password
        // stops someone who pre-registered the address with a password from keeping access.
        update: { name: user.name ?? undefined, image: user.image ?? undefined, passwordHash: null },
        create: { email, name: user.name ?? null, image: user.image ?? null },
      });
      user.id = row.id;
      return true;
    },
    /** The token carries our user id and role. The role is re-read from the database every few minutes, so a
     *  purchase or an admin change shows up without a new sign-in. Server code still re-checks the database. */
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        token.roleCheckedAt = 0;
      }
      if (token.uid && Date.now() - (token.roleCheckedAt ?? 0) > ROLE_REFRESH_MS) {
        const row = await db.user.findUnique({ where: { id: token.uid }, select: { role: true } });
        if (!row) return null; // user was deleted: end the session
        token.role = row.role;
        token.roleCheckedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as "FREE" | "PRO" | "STUDIO" | "ADMIN";
      return session;
    },
  },
});
