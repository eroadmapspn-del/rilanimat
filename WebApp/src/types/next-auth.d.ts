import type { DefaultSession } from "next-auth";

type Role = "FREE" | "PRO" | "STUDIO" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
    roleCheckedAt?: number;
  }
}
