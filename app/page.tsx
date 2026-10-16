import Link from "next/link";
import type { CSSProperties } from "react";

type NavItem = { href: string; label: string };
type Round = { id: string; title: string; tag: string; description: string; hint: string };
type QuestionSet = { id: number; name: string; theme: string };

const navItems: NavItem[] = [
  { href: "/participant", label: "Participant" },
  { href: "/admin", label: "Admin" },
  { href: "/host", label: "Host" },
];

const rounds: Round[] = [
  {
    id: "01",
    title: "Round 1 — Guess the Tech Word",
    tag: "Round One",
    description:
      "Inspect the visual clue and identify the technology or technical word represented.",
    hint: "Visual clues. Direct typing.",
  },
  {
    id: "02",
    title: "Round 2 — AI or Real",
    tag: "Round Two",
    description:
      "Inspect the image and decide whether it is AI-generated or real.",
    hint: "AI vs Reality. Two choices.",
  },
  {
    id: "03",
    title: "Round 3 — Tech Taboo",
    tag: "Round Three",
    description:
      "Get your team to guess the tech term without saying any of the prohibited words on the card.",
    hint: "Explain carefully. Watch what you say.",
  },
];

const questionSets: QuestionSet[] = [
  { id: 1, name: "Set 01", theme: "Alpha" },
  { id: 2, name: "Set 02", theme: "Beta" },
  { id: 3, name: "Set 03", theme: "Gamma" },
  { id: 4, name: "Set 04", theme: "Delta" },
];

const gridStyle: CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
  backgroundSize: "48px 48px",
  maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
  WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
};

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-neutral-950 text-neutral-100">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0" style={gridStyle} aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-48 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-40 -right-32 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8"
        >
          <Link href="/" className="font-mono text-sm font-bold tracking-[0.25em] text-white">
            TECH<span className="text-cyan-300">/</span>SCRAMBLE
          </Link>
          <ul className="flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm text-neutral-400 transition-colors hover:bg-white/5 hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        {/* Hero */}
        <section className="pt-16 pb-20 sm:pt-24 sm:pb-28">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs uppercase tracking-[0.2em] text-neutral-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" aria-hidden="true" />
            College Tech Quiz Event
          </p>
          <h1 className="text-6xl font-black leading-[0.95] tracking-tighter sm:text-8xl lg:text-9xl">
            TECH
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
              SCRAMBLE
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-neutral-400 sm:text-xl">
            Three rounds. Four question sets. Exactly 5 questions per round. Team up, pick a set (Alpha, Beta, Gamma, or Delta),
            and prove your tech knowledge.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/participant"
              className="inline-flex items-center justify-center rounded-lg bg-white px-7 py-3.5 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
            >
              Join the game
            </Link>
            <Link
              href="/host"
              className="inline-flex items-center justify-center rounded-lg border border-white/15 px-7 py-3.5 text-sm font-semibold text-neutral-100 transition hover:border-violet-400 hover:text-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              Host screen
            </Link>
          </div>
        </section>

        {/* Rounds */}
        <section aria-labelledby="rounds-heading" className="pb-20 sm:pb-28">
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 id="rounds-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
              The rounds
            </h2>
            <p className="hidden font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 sm:block">
              03 rounds / 05 questions each
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {rounds.map((round) => (
              <article
                key={round.id}
                className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-violet-400/50 hover:bg-white/[0.06]"
              >
                <div className="mb-10 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300">
                    {round.tag}
                  </span>
                  <span className="font-mono text-4xl font-bold text-white/15 transition-colors group-hover:text-violet-400/60">
                    {round.id}
                  </span>
                </div>
                <h3 className="text-2xl font-bold leading-tight tracking-tight">{round.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-400">
                  {round.description}
                </p>
                <p className="mt-6 border-t border-white/10 pt-4 font-mono text-xs text-neutral-500">
                  {round.hint}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Question sets */}
        <section aria-labelledby="sets-heading" className="pb-24 sm:pb-32">
          <div className="mb-10">
            <h2 id="sets-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
              Question sets
            </h2>
            <p className="mt-3 max-w-lg text-sm text-neutral-400">
              Four official sets (15 questions each). Pick one when you join as a participant.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {questionSets.map((set) => (
              <li key={set.id}>
                <Link
                  href="/participant"
                  className="group block rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
                    {set.name}
                  </p>
                  <p className="mt-3 text-xl font-bold tracking-tight text-white transition-colors group-hover:text-cyan-300">
                    {set.theme}
                  </p>
                  <p className="mt-4 font-mono text-xs text-violet-300">3 rounds</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-mono tracking-[0.2em]">TECH/SCRAMBLE</p>
          <p>Think fast. Play smart.</p>
        </div>
      </footer>
    </div>
  );
}