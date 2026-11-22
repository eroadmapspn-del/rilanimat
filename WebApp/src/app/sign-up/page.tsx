import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return <AuthShell mode="sign-up" />;
}
