import { useMemo, useState } from "react";
import { availabilityForSet, maxQuestionsPerRound } from "../engine/select.ts";
import { DEFAULT_SETTINGS, type Bank, type GameMode, type Progression, type Settings, type TeamDraft } from "../engine/types.ts";

const MODES = [
  ["1", "Guess the Tech Term", "Decode symbols and clues."],
  ["2", "Real or AI?", "Judge an image from its record."],
  ["3", "Tech Taboo", "Explain the term. Dodge the forbidden words."],
] as const;

const ROUND_NAME: Record<GameMode, string> = {
  term: "Guess the Tech Term",
  realai: "Real or AI?",
  taboo: "Tech Taboo",
};

interface Props {
  bank: Bank;
  note: string | null;
  onStart: (settings: Settings, teams: TeamDraft[]) => void;
  onClearHistory: () => void;
}

export function Lobby({ bank, note, onStart, onClearHistory }: Props) {
  const [setId, setSetId] = useState(bank.sets[0]?.set_id ?? "foundations");
  const [progression, setProgression] = useState<Progression>("progressive");
  const [teams, setTeams] = useState<TeamDraft[]>([
    { id: "team-1", name: "Cyan" },
    { id: "team-2", name: "Violet" },
  ]);
  const [questionsPerRound, setQuestionsPerRound] = useState(DEFAULT_SETTINGS.questionsPerRound);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [tabooSeconds, setTabooSeconds] = useState(60);
  const [turnsPerTeam, setTurnsPerTeam] = useState(1);
  const [skipLimit, setSkipLimit] = useState(2);

  const availability = useMemo(() => availabilityForSet(bank, setId, progression), [bank, setId, progression]);
  const cap = maxQuestionsPerRound(availability);
  const problems = (Object.entries(availability) as [string, { problem?: string }][])
    .map(([, value]) => value.problem)
    .filter((problem): problem is string => Boolean(problem));
  const selected = bank.sets.find((set) => set.set_id === setId);
  const counts = selected
    ? {
        term: bank.questions.filter((q) => q.set_id === setId && q.game_mode === "term" && q.content_status === "published").length,
        realai: bank.questions.filter((q) => q.set_id === setId && q.game_mode === "realai" && q.content_status === "published").length,
        taboo: bank.questions.filter((q) => q.set_id === setId && q.game_mode === "taboo" && q.content_status === "published").length,
      }
    : { term: 0, realai: 0, taboo: 0 };

  const namesOk = teams.every((team) => team.name.trim().length > 0);
  const shortfalls = (Object.entries(counts) as [GameMode, number][])
    .filter(([, count]) => count < 6)
    .map(([mode, count]) => `${ROUND_NAME[mode]} has ${count} published questions. This set needs at least 6 in every round.`);
  const blockingShortfalls = progression === "progressive" ? shortfalls : [];
  const questionCount = cap > 0 ? Math.min(questionsPerRound, cap) : questionsPerRound;
  const canStart =
    problems.length === 0 &&
    blockingShortfalls.length === 0 &&
    cap > 0 &&
    namesOk &&
    questionCount >= 1 &&
    questionCount <= cap;

  return (
    <div className="page lobby">
      <section>
        <h1 style={{ fontSize: "clamp(3.2rem, 8vw, 5.5rem)", lineHeight: 0.88 }}>TechVerse</h1>
        <p className="lede">
          Three rounds, one sitting. Pick a question set, name the teams, and play a fresh draw that gets harder as the round goes on.
        </p>
        {note ? <p className="notice">{note}</p> : null}
        <div role="radiogroup" aria-label="Question set" className="set-list">
          {bank.sets.map((set, index) => {
            const total = bank.questions.filter((q) => q.set_id === set.set_id && q.content_status === "published").length;
            return (
              <button
                key={set.set_id}
                role="radio"
                aria-checked={set.set_id === setId}
                className="set-option"
                data-testid={`set-${set.set_id}`}
                onClick={() => setSetId(set.set_id)}
              >
                <span className="set-index">{index + 1}</span>
                <span>
                  <h2>{set.name}</h2>
                  <p>{set.description}</p>
                </span>
                <span className="range">
                  {set.difficulty_min}–{set.difficulty_max}
                  <br />
                  {total} questions
                </span>
              </button>
            );
          })}
        </div>
        {selected ? (
          <p className="meta">
            {selected.name}: {counts.term} term puzzles, {counts.realai} image questions, {counts.taboo} taboo cards.
          </p>
        ) : null}
      </section>
      <section className="rundown stack">
        <h2>Tonight's rundown</h2>
        <ol>
          {MODES.map(([number, title, copy]) => (
            <li key={number}>
              <span className="round-no">{number}</span>
              <span>
                <strong>{title}</strong>
                <div className="meta">{copy}</div>
              </span>
            </li>
          ))}
        </ol>
        <fieldset className="stack">
          <legend>Teams</legend>
          <div className="teams">
            {teams.map((team, index) => (
              <div className="team-row" key={team.id}>
                <input
                  aria-label={`Team ${index + 1} name`}
                  value={team.name}
                  onChange={(event) =>
                    setTeams((current) => current.map((item) => (item.id === team.id ? { ...item, name: event.target.value } : item)))
                  }
                />
                {teams.length > 1 ? (
                  <button className="btn ghost" type="button" onClick={() => setTeams((current) => current.filter((item) => item.id !== team.id))}>
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {teams.length < 4 ? (
            <button
              className="btn"
              type="button"
              onClick={() =>
                setTeams((current) => [...current, { id: `team-${crypto.randomUUID()}`, name: `Team ${current.length + 1}` }])
              }
            >
              Add a team
            </button>
          ) : null}
        </fieldset>
        <label className="field">
          <span>Questions per round (max {cap || 0})</span>
          <input
            type="number"
            min={1}
            max={Math.max(cap, 1)}
            value={questionCount}
            onChange={(event) => setQuestionsPerRound(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Difficulty</span>
          <select value={progression} onChange={(event) => setProgression(event.target.value as Progression)}>
            <option value="progressive">Progressive, easy toward expert</option>
            <option value="easy">Easy only</option>
            <option value="medium">Medium only</option>
            <option value="hard">Hard only</option>
            <option value="expert">Expert only</option>
          </select>
        </label>
        <details>
          <summary>Round settings</summary>
          <div className="stack" style={{ marginTop: 12 }}>
            <label className="field">
              <span>Multiple choice on term puzzles</span>
              <input type="checkbox" checked={multipleChoice} onChange={(event) => setMultipleChoice(event.target.checked)} />
            </label>
            <label className="field">
              <span>Taboo seconds per turn</span>
              <input type="number" min={15} max={180} value={tabooSeconds} onChange={(event) => setTabooSeconds(Number(event.target.value))} />
            </label>
            <label className="field">
              <span>Taboo turns per team</span>
              <input type="number" min={1} max={3} value={turnsPerTeam} onChange={(event) => setTurnsPerTeam(Number(event.target.value))} />
            </label>
            <label className="field">
              <span>Skips per team each round</span>
              <input type="number" min={0} max={5} value={skipLimit} onChange={(event) => setSkipLimit(Number(event.target.value))} />
            </label>
          </div>
        </details>
        {problems.map((problem) => (
          <p className="problem" key={problem} role="alert">
            {problem} This set cannot start until that round has published questions for the chosen difficulty.
          </p>
        ))}
        {blockingShortfalls.map((problem) => (
          <p className="problem" key={problem} role="alert">
            {problem}
          </p>
        ))}
        {!namesOk ? <p className="problem">Every team needs a name.</p> : null}
        <button
          className="btn primary wide"
          type="button"
          data-testid="start-game"
          disabled={!canStart}
          onClick={() =>
            onStart(
              {
                ...DEFAULT_SETTINGS,
                setId,
                progression,
                questionsPerRound: questionCount,
                multipleChoice,
                tabooSeconds,
                turnsPerTeam,
                skipLimit,
              },
              teams.map((team) => ({ ...team, name: team.name.trim() })),
            )
          }
        >
          Start game
        </button>
        <button className="btn ghost" type="button" onClick={onClearHistory}>
          Forget seen questions
        </button>
      </section>
    </div>
  );
}
