import Link from "next/link";
import { auth } from "@/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PLANS } from "@/lib/plans";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Reel Studio",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  description: "Turn a story idea into a narrated, captioned, animated vertical reel with your own recurring 2D characters.",
  offers: (["FREE", "PRO", "STUDIO"] as const).map((id) => ({ "@type": "Offer", name: PLANS[id].label, priceCurrency: "INR", price: String(PLANS[id].pricePaise / 100) })),
};

const steps = [
  ["Describe your cast", "Say who your characters are in plain words. They are saved to your account and drawn the same way in every episode."],
  ["Pitch the story", "Give an idea, pick Hindi, Hinglish or English, and choose how many episodes. The AI plans the series and writes each script scene by scene, with a hook up front and a cliffhanger at the end."],
  ["Review the script", "Read it, edit any line, and approve it. Nothing moves on until you say so."],
  ["Approve the voice-over", "A narrator reads your script aloud. Listen, then approve it or record it again."],
  ["Render your reel", "Get a 9:16 MP4 with animated characters, camera moves and word-by-word captions timed to the voice."],
];

const reasons = [
  ["Posting every day is exhausting", "Faceless story channels win on volume. Turn an idea into a finished video in minutes instead of an editing evening."],
  ["No camera, voice or animator", "You do not need to be on screen, record audio or draw anything. You only need the story."],
  ["Characters people recognise", "Viewers follow a series because they know the faces. Your cast looks identical in every episode."],
  ["Made for how people watch", "Vertical 9:16, large captions that follow the voice, and short scenes. Ready for Instagram Reels and YouTube Shorts."],
  ["You stay in control", "You approve the script and the voice before anything renders, so you never use up a video you did not sign off on."],
  ["In your language", "Hindi, Hinglish and English, with narration and captions in the same language."],
];

const faqs = [
  ["What do I get for free?", "3 videos of up to 30 seconds each, with AI script writing, AI voice-over and 2D animation. No card needed."],
  ["How does paid pricing work?", "Pro is ₹499 a month for 180 videos of up to 1 minute. Studio is ₹999 a month for 600 videos. Each payment covers 30 days, and a failed render never counts against your videos."],
  ["Do I own the videos?", "The videos are rendered for you to download and post. Your characters and stories stay private to your account."],
  ["Do I need any editing skills?", "None. If you can describe a story, you can make a reel."],
  ["What happens when my plan ends?", "You drop back to the Free plan. Your series, characters and finished videos stay in your account."],
];

function PhoneMock() {
  return (
    <div className="relative mx-auto w-full max-w-[17rem]" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[3rem] bg-brand/15 blur-2xl" />
      <div className="relative aspect-[9/16] overflow-hidden rounded-[2.25rem] border-[6px] border-slate-900 bg-gradient-to-b from-indigo-900 via-violet-800 to-slate-900 shadow-2xl">
        <div className="absolute inset-x-0 top-0 mx-auto mt-2 h-5 w-20 rounded-full bg-black/70" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-[34%] left-1/2 flex -translate-x-1/2 items-end gap-3">
          <div className="flex flex-col items-center">
            <div className="h-7 w-7 rounded-full bg-amber-200" />
            <div className="mt-1 h-16 w-10 rounded-t-2xl bg-emerald-500" />
          </div>
          <div className="flex flex-col items-center">
            <div className="h-6 w-6 rounded-full bg-orange-300" />
            <div className="mt-1 h-12 w-9 rounded-t-2xl bg-rose-500" />
          </div>
        </div>
        <div className="absolute inset-x-4 bottom-12 text-center text-[15px] leading-snug font-extrabold tracking-tight text-white drop-shadow">
          Raat ke <span className="rounded bg-yellow-300 px-1 text-slate-900">teen</span> baje, ghanti phir baji…
        </div>
        <div className="absolute inset-x-4 bottom-5 h-1 overflow-hidden rounded-full bg-white/25">
          <div className="h-full w-2/3 rounded-full bg-white" />
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const signedIn = Boolean((await auth())?.user?.id);
  const cta = signedIn ? { href: "/app", label: "Open your studio" } : { href: "/sign-up", label: "Start free" };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:p-3">Skip to content</a>
      <SiteHeader />

      <main id="content" className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-b from-brand-soft/60 to-background">
          <div className="container-page grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="flex flex-col items-start gap-6">
              <span className="badge">AI story reels · Hindi, Hinglish, English</span>
              <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">Story reels with characters that are yours</h1>
              <p className="max-w-xl text-lg text-muted text-pretty">
                Reel Studio turns a story idea into a narrated, captioned, animated vertical video. Describe your cast once, write a story,
                and get a reel ready for Instagram Reels and YouTube Shorts. No camera, no editor.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={cta.href} className="btn-primary btn-lg">{cta.label}</Link>
                <Link href="#how" className="btn-secondary btn-lg">See how it works</Link>
              </div>
              <p className="hint">Free to start: 3 videos on us. No card needed.</p>
            </div>
            <PhoneMock />
          </div>
        </section>

        {/* What */}
        <section className="container-page py-16 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
            <div>
              <p className="eyebrow">What it is</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-balance">A studio for faceless storytelling channels</h2>
            </div>
            <p className="text-lg text-muted text-pretty">
              You bring the idea and the characters. Reel Studio writes the script, records the narration, animates the scenes, adds the
              captions and hands you a finished MP4. Make a one-off reel, or a whole multi-episode series where the same characters
              come back every time.
            </p>
          </div>
        </section>

        {/* How */}
        <section id="how" className="scroll-mt-20 border-y border-border bg-subtle">
          <div className="container-page py-16 sm:py-20">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">From idea to reel in five steps</h2>
            <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {steps.map(([title, text], i) => (
                <li key={title} className="card flex flex-col gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-[color:var(--brand-fg)]">{i + 1}</span>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="text-sm text-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Why */}
        <section id="why" className="container-page scroll-mt-20 py-16 sm:py-20">
          <p className="eyebrow">Why Reel Studio</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Everything a story channel needs, none of the busywork</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reasons.map(([title, text]) => (
              <div key={title} className="card">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-y border-border bg-subtle">
          <div className="container-page py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Pricing</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Start free. Upgrade when you are posting daily.</h2>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {(["FREE", "PRO", "STUDIO"] as const).map((id) => {
                const p = PLANS[id];
                const featured = id === "PRO";
                return (
                  <div key={id} className={`card flex flex-col gap-5 ${featured ? "relative border-2 !border-brand shadow-lg" : ""}`}>
                    {featured && <span className="badge absolute -top-3 left-6">Most popular</span>}
                    <div>
                      <h3 className="text-lg font-semibold">{p.label}</h3>
                      <p className="mt-2 flex items-baseline gap-1">
                        <span className="text-4xl font-bold tracking-tight">₹{p.pricePaise / 100}</span>
                        {p.pricePaise ? <span className="text-muted">/ month</span> : <span className="text-muted">forever</span>}
                      </p>
                    </div>
                    <ul className="flex flex-1 flex-col gap-2.5 text-sm">
                      {p.features.map((f) => (
                        <li key={f} className="flex gap-2">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" /></svg>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={signedIn ? "/app/billing" : "/sign-up"} className={featured ? "btn-primary" : "btn-secondary"}>
                      {id === "FREE" ? "Start free" : `Get ${p.label}`}
                    </Link>
                  </div>
                );
              })}
            </div>
            <p className="hint mt-6 text-center">Each paid plan lasts 30 days from payment. Failed renders never count against your videos.</p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="container-page scroll-mt-20 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Questions, answered</h2>
            <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
              {faqs.map(([q, a]) => (
                <details key={q} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {q}
                    <span className="text-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container-page pb-20">
          <div className="flex flex-col items-start gap-5 rounded-3xl bg-brand p-8 text-[color:var(--brand-fg)] sm:p-12">
            <h2 className="max-w-xl text-3xl font-bold tracking-tight text-balance">Your first story is one idea away</h2>
            <p className="max-w-xl opacity-90">Sign up free, describe your characters and make your first 3 videos on us.</p>
            <Link href={cta.href} className="btn btn-lg bg-white !text-slate-900 hover:bg-slate-100">{cta.label}</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
