import { useEffect, useRef, useState } from "react";
import bundledJson from "./content/generated/bank.json";
import { createSession, currentMode, reduce, rematchSession, type Action } from "./engine/reducer.ts";
import type { Bank, GameMode, Session, Settings, TeamDraft } from "./engine/types.ts";
import { clearExposure, loadExposure, rememberExposure } from "./lib/history.ts";
import { loadRemoteBank } from "./lib/remote.ts";
import { Lobby } from "./ui/Lobby.tsx";
import { Results } from "./ui/Results.tsx";
import { Stage } from "./ui/Stage.tsx";

const bundled = bundledJson as unknown as Bank;

export function App() {
  const [bank, setBank] = useState<Bank>(bundled);
  const [note, setNote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const sequences = useRef<Partial<Record<GameMode, string[]>>>({});
  const saved = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadRemoteBank().then((remote) => {
      if (cancelled) return;
      if (remote.bank) setBank(remote.bank);
      setNote(remote.note ?? "Using the question bank shipped with this app.");
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    if ((session.phase === "round-summary" || session.phase === "results") && session.queue.length > 0) {
      sequences.current = {
        ...sequences.current,
        [currentMode(session)]: session.queue.map((question) => question.question_id),
      };
    }
    if (session.phase === "results" && !saved.current) {
      saved.current = true;
      rememberExposure(session.seenQuestionIds, sequences.current);
    }
  }, [session]);

  function start(settings: Settings, teams: TeamDraft[]) {
    const exposure = loadExposure();
    sequences.current = {};
    saved.current = false;
    setSession(
      createSession({
        bank,
        settings,
        teams,
        recentQuestionIds: exposure.ids,
        previousSequences: exposure.sequences,
        now: Date.now(),
      }),
    );
  }

  function act(action: Action) {
    setSession((current) => (current ? reduce(current, action, bank) : current));
  }

  function rematch() {
    if (!session) return;
    const exposure = loadExposure();
    const previous = { ...exposure.sequences, ...sequences.current };
    rememberExposure(session.seenQuestionIds, previous);
    saved.current = false;
    sequences.current = {};
    setSession(
      rematchSession(
        session,
        bank,
        Date.now(),
        [...new Set([...exposure.ids, ...session.seenQuestionIds])],
        previous,
      ),
    );
  }

  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="brand">
          Tech<span>Verse</span>
        </div>
        {session && session.phase !== "results" ? (
          <div className="top-actions">
            <button className="btn" type="button" data-testid="pause" onClick={() => act({ type: session.status === "paused" ? "RESUME" : "PAUSE", now: Date.now() })}>
              {session.status === "paused" ? "Resume" : "Pause"}
            </button>
          </div>
        ) : null}
      </header>
      <main id="main">
        {!ready ? (
          <div className="page">
            <p className="lede">Loading the question bank…</p>
          </div>
        ) : null}
        {ready && !session ? (
          <Lobby
            bank={bank}
            note={note}
            onStart={start}
            onClearHistory={() => {
              clearExposure();
              setNote("Seen-question history was cleared. The next game can draw from the full set again.");
            }}
          />
        ) : null}
        {session && session.phase !== "results" ? <Stage session={session} bank={bank} onAction={act} /> : null}
        {session && session.phase === "results" ? (
          <Results
            session={session}
            onRematch={rematch}
            onLobby={() => setSession(null)}
          />
        ) : null}
      </main>
    </div>
  );
}
