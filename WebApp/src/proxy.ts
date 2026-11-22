import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

/** Optimistic gate only: it reads the JWT cookie, no database. Real authorization happens in server code
 *  (requireUser / requireRole / getUser), because the token's role can be a few minutes old. */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secure = req.nextUrl.protocol === "https:";
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie: secure });
  if (!token?.uid) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && token.role !== "ADMIN") return NextResponse.redirect(new URL("/app", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/admin/:path*"] };
