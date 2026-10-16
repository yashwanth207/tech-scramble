import { useEffect, useMemo, useRef, useState } from "react";
import { hashSeed, mulberry32, shuffle } from "../engine/rng.ts";
import {
  activeTeam,
  currentMode,
  currentQuestion,
  questionElapsedMs,
  turnElapsedMs,
  type Action,
} from "../engine/reducer.ts";
import { teamTotal } from "../engine/scoring.ts";
import type { Asset, Bank, GameMode, Session } from "../engine/types.ts";

const MODE_LABEL: Record<GameMode, string> = {
  term: "Guess the Tech Term",
  realai: "Real or AI?",
  taboo: "Tech Taboo",
};

interface Props {
  session: Session;
  bank: Bank;
  onAction: (action: Action) => void;
}

export function Stage({ session, bank, onAction }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [draft, setDraft] = useState("");
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">("loading");
  const [cardKey, setCardKey] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fired = useRef("");
  const mode = currentMode(session);
  const question = currentQuestion(session);
  const team = activeTeam(session);
  const asset = useMemo(() => {
    const id = question?.image_asset_ids[0];
    return id ? bank.assets.find((item) => item.asset_id === id) : undefined;
  }, [bank.assets, question]);
  const choices = useMemo(() => {
    if (!question?.choice_options || !session.settings.multipleChoice) return [];
    return shuffle(question.choice_options, mulberry32(hashSeed(question.question_id)));
  }, [question, session.settings.multipleChoice]);
  const nextCardKey = `${session.roundIndex}:${session.queueIndex}:${session.phase}`;
  if (cardKey !== nextCardKey) {
    setCardKey(nextCardKey);
    setDraft("");
    setImageState("loading");
  }

  useEffect(() => {
    if (session.status !== "playing" || session.phase !== "question") return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [session.status, session.phase, session.queueIndex, session.roundIndex, session.explainerReady, session.tabooTurnStartedAt]);

  useEffect(() => {
    if (session.status !== "playing" || session.phase !== "question") return;
    const key = `${session.roundIndex}:${session.queueIndex}:${session.tabooTurnStartedAt ?? 0}`;
    if (fired.current === key) return;
    if (mode === "taboo") {
      if (!session.explainerReady || session.tabooTurnStartedAt == null) return;
      if (turnElapsedMs(session, now) < session.settings.tabooSeconds * 1000) return;
    } else if (!question || questionElapsedMs(session, now) < question.time_limit * 1000) {
      return;
    }
    fired.current = key;
    onAction({ type: "TIMEOUT", now: Date.now() });
  }, [mode, now, onAction, question, session]);

  useEffect(() => {
    if (session.phase === "question" && mode !== "taboo" && !session.settings.multipleChoice) {
      inputRef.current?.focus();
    }
  }, [mode, session.phase, session.queueIndex, session.settings.multipleChoice]);

  const seconds = displaySeconds(session, mode, now);
  const timerClass = seconds <= 5 ? "timer dead" : seconds <= 10 ? "timer warn" : "timer";
  const skipsLeft = session.settings.skipLimit - (session.skipsThisRound[team.id] ?? 0);
  const paused = session.status === "paused";

  return (
    <div className="page">
      <div className="stage-head">
        <div>
          <p className="meta">
            Round {session.roundIndex + 1} of 3 · {MODE_LABEL[mode]}
            {question && session.phase === "question" ? ` · ${question.difficulty}` : ""}
          </p>
          <h1>{MODE_LABEL[mode]}</h1>
        </div>
        <div className={timerClass} aria-hidden="true">
          {seconds}
        </div>
      </div>
      <div className="score-strip">
        {session.teams.map((item) => (
          <div className={item.id === team.id ? "score-chip active" : "score-chip"} key={item.id}>
            <span className="meta">{item.name}</span>
            <b>{teamTotal(item.roundScores)}</b>
          </div>
        ))}
      </div>
      {session.notice ? <p className="notice">{session.notice}</p> : null}
      {paused ? <p className="notice">Paused. The timer is frozen.</p> : null}

      {session.phase === "round-intro" ? (
        <section className="stack">
          <p className="lede">
            {mode === "term"
              ? "Two clues, one technology term. Hints cost points. A faster correct answer scores more."
              : mode === "realai"
                ? "Decide whether the picture is a real photograph or an AI-generated image. The reveal cites the record."
                : "Pass the device to the explainer. They describe the term without the forbidden words."}
          </p>
          <p className="meta">
            {session.queue.length} questions · {team.name} {mode === "taboo" ? "explains first" : "answers first"}
          </p>
          <button className="btn primary" type="button" data-testid="continue" disabled={paused} onClick={() => onAction({ type: "CONTINUE", now: Date.now() })}>
            Start round
          </button>
        </section>
      ) : null}

      {session.phase === "turn-handoff" ? (
        <section className="stack">
          <h2>Pass the device to {team.name}</h2>
          <p>The next term stays hidden until that team is ready.</p>
          <button className="btn primary" type="button" data-testid="continue" disabled={paused} onClick={() => onAction({ type: "CONTINUE", now: Date.now() })}>
            We're ready to look
          </button>
        </section>
      ) : null}

      {session.phase === "round-summary" ? (
        <section className="stack">
          <h2>{MODE_LABEL[mode]} is complete</h2>
          <ul>
            {session.teams.map((item) => (
              <li key={item.id}>
                {item.name}: {item.roundScores[mode]} this round
              </li>
            ))}
          </ul>
          <button className="btn primary" type="button" data-testid="continue" onClick={() => onAction({ type: "CONTINUE", now: Date.now() })}>
            {session.roundIndex >= 2 ? "See final results" : "Next round"}
          </button>
        </section>
      ) : null}

      {session.phase === "question" && mode === "taboo" && question && !session.explainerReady ? (
        <section className="stack">
          <h2>Hand the device to {team.name}</h2>
          <p>Guessers should look away. The term appears only after the explainer starts the clock.</p>
          <button className="btn primary" type="button" data-testid="taboo-ready" disabled={paused} onClick={() => onAction({ type: "READY", now: Date.now() })}>
            I'm the explainer. Show the card.
          </button>
        </section>
      ) : null}

      {session.phase === "question" && question && (mode !== "taboo" || session.explainerReady) ? (
        <section>
          <p className="meta">
            Card {Math.min(session.queueIndex + 1, session.queue.length)} of {session.queue.length}
            {mode === "taboo" ? ` · ${session.turnsRemaining[team.id] ?? 0} turns left after this one` : ` · ${team.name} answers`}
          </p>
          {mode === "taboo" ? (
            <div className="term-card">
              <h2 data-testid="taboo-term">{question.answer}</h2>
              <div className="forbidden">
                {(question.forbidden_words ?? []).map((word) => (
                  <span key={word}>{word}</span>
                ))}
              </div>
            </div>
          ) : (
            <>
              <p className="lede">{question.prompt}</p>
              {asset ? <Picture asset={asset} state={imageState} onState={setImageState} hideDetail={mode === "realai"} /> : null}
            </>
          )}

          {mode === "term" && session.hintsRevealed > 0 ? (
            <ol className="hints">
              {question.hints.slice(0, session.hintsRevealed).map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ol>
          ) : null}

          {mode === "realai" ? (
            <div className="origin-grid">
              <button className="btn" type="button" data-testid="answer-real" disabled={paused || session.resolved} onClick={() => onAction({ type: "ANSWER", value: "real", now: Date.now() })}>
                Real photograph
              </button>
              <button className="btn" type="button" data-testid="answer-ai" disabled={paused || session.resolved} onClick={() => onAction({ type: "ANSWER", value: "ai", now: Date.now() })}>
                AI-generated
              </button>
            </div>
          ) : null}

          {mode === "term" && choices.length > 0 ? (
            <div className="choice-grid">
              {choices.map((choice) => (
                <button key={choice} className="btn" type="button" data-testid={`choice-${choice}`} disabled={paused || session.resolved} onClick={() => onAction({ type: "ANSWER", value: choice, now: Date.now() })}>
                  {choice}
                </button>
              ))}
            </div>
          ) : null}

          {mode === "term" && choices.length === 0 ? (
            <form
              className="answer-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (paused || session.resolved) return;
                onAction({ type: "ANSWER", value: draft, now: Date.now() });
              }}
            >
              <input
                ref={inputRef}
                aria-label="Your answer"
                data-testid="answer-input"
                value={draft}
                disabled={paused || session.resolved}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button className="btn primary" type="submit" data-testid="submit-answer" disabled={paused || session.resolved}>
                Submit
              </button>
            </form>
          ) : null}

          <div className="btn-row" style={{ marginTop: 12 }}>
            {mode === "term" ? (
              <button
                className="btn"
                type="button"
                data-testid="hint"
                disabled={paused || session.resolved || session.hintsRevealed >= question.hints.length}
                onClick={() => onAction({ type: "HINT", now: Date.now() })}
              >
                Hint (−{session.settings.hintPenalty})
              </button>
            ) : null}
            {mode === "taboo" ? (
              <>
                <button className="btn ok" type="button" data-testid="taboo-correct" disabled={paused} onClick={() => onAction({ type: "ANSWER", value: "got-it", now: Date.now() })}>
                  Got it
                </button>
                <button className="btn bad" type="button" data-testid="taboo-forbidden" disabled={paused} onClick={() => onAction({ type: "FORBIDDEN", now: Date.now() })}>
                  Forbidden word ({session.settings.tabooPenalty > 0 ? `−${session.settings.tabooPenalty}` : session.settings.tabooPenalty})
                </button>
              </>
            ) : null}
            <button className="btn ghost" type="button" data-testid="skip" disabled={paused || skipsLeft <= 0} onClick={() => onAction({ type: "SKIP", now: Date.now() })}>
              Skip ({Math.max(0, skipsLeft)} left)
            </button>
            <button className="btn ghost" type="button" onClick={() => dialogRef.current?.showModal()}>
              End game
            </button>
          </div>
          {mode === "taboo" && session.feedback ? (
            <p className="toast" role="status">
              {session.feedback.outcome === "correct"
                ? `+${session.feedback.pointsDelta} ${session.feedback.answer}`
                : session.feedback.outcome === "forbidden"
                  ? `${session.feedback.pointsDelta} for a forbidden word`
                  : "Skipped"}
            </p>
          ) : null}
        </section>
      ) : null}

      {session.phase === "feedback" && session.feedback ? (
        <section className={`feedback ${session.feedback.outcome}`} role="status" data-testid="feedback">
          <h2>
            {session.feedback.outcome === "correct"
              ? `Correct. +${session.feedback.pointsDelta}`
              : session.feedback.outcome === "timeout"
                ? "Time is up"
                : session.feedback.outcome === "skip"
                  ? "Skipped"
                  : "Not this time"}
          </h2>
          <p>
            Answer: <strong>{session.feedback.answer}</strong>
            {session.feedback.speedBonus > 0 ? ` · speed bonus ${session.feedback.speedBonus}` : ""}
          </p>
          <p>{session.feedback.explanation}</p>
          {asset && mode === "realai" ? <p className="attribution">{asset.attribution}. {asset.provenance}</p> : null}
          <button className="btn primary" type="button" data-testid="continue" onClick={() => onAction({ type: "CONTINUE", now: Date.now() })}>
            Next
          </button>
        </section>
      ) : null}

      <dialog ref={dialogRef} aria-labelledby="end-title">
        <h2 id="end-title">End the game?</h2>
        <p>The scores so far become the final result.</p>
        <div className="btn-row">
          <button
            className="btn bad"
            type="button"
            onClick={() => {
              dialogRef.current?.close();
              onAction({ type: "END", now: Date.now() });
            }}
          >
            End game
          </button>
          <button className="btn" type="button" onClick={() => dialogRef.current?.close()}>
            Keep playing
          </button>
        </div>
      </dialog>
    </div>
  );
}

function displaySeconds(session: Session, mode: GameMode, now: number): number {
  if (mode === "taboo") {
    if (!session.explainerReady || session.tabooTurnStartedAt == null) return session.settings.tabooSeconds;
    return Math.max(0, Math.ceil((session.settings.tabooSeconds * 1000 - turnElapsedMs(session, now)) / 1000));
  }
  const question = currentQuestion(session);
  if (!question) return 0;
  if (session.phase !== "question") return question.time_limit;
  return Math.max(0, Math.ceil((question.time_limit * 1000 - questionElapsedMs(session, now)) / 1000));
}

function Picture({
  asset,
  state,
  onState,
  hideDetail,
}: {
  asset: Asset;
  state: "loading" | "ready" | "error";
  onState: (state: "loading" | "ready" | "error") => void;
  hideDetail: boolean;
}) {
  const frame = asset.kind === "original-svg" ? "puzzle" : "photo-frame";
  return (
    <div className={frame}>
      {state === "loading" ? <p className="meta">Loading image…</p> : null}
      {state === "error" ? (
        <p className="fallback">This image did not load. You can still answer, or skip.</p>
      ) : (
        <img
          src={asset.src}
          alt={hideDetail ? "Picture for the Real or AI round" : asset.alt}
          onLoad={() => onState("ready")}
          onError={() => onState("error")}
        />
      )}
    </div>
  );
}
