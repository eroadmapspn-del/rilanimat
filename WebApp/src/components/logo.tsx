import Link from "next/link";
import { useId } from "react";

/** The Reel Studio mark: a gradient tile holding a vertical (9:16) reel with a play button and caption bars.
 *  Keep in sync with src/app/icon.svg, which is the same drawing used as the browser favicon. */
export function LogoMark({ size = 32 }: { size?: number }) {
  const g = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={g} x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${g})`} />
      <rect x="9.5" y="5" width="13" height="22" rx="3.5" fill="#fff" />
      <path d="M14.2 10v7.2c0 .5.5.8.9.5l5.4-3.6c.4-.3.4-.8 0-1.1l-5.4-3.6c-.4-.3-.9 0-.9.6Z" fill="#5B4BDB" />
      <rect x="12" y="21.2" width="8" height="1.8" rx=".9" fill="#C7D2FE" />
      <rect x="13.6" y="24" width="4.8" height="1.8" rx=".9" fill="#E0E7FF" />
    </svg>
  );
}

export function Logo({ href = "/", size = 32 }: { href?: string; size?: number }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 text-lg font-bold tracking-tight" aria-label="Reel Studio home">
      <LogoMark size={size} />
      <span>
        Reel<span className="text-brand"> Studio</span>
      </span>
    </Link>
  );
}
