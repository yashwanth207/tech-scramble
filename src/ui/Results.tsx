import { teamTotal } from "../engine/scoring.ts";
import type { GameMode, Session } from "../engine/types.ts";

const MODE_LABEL: Record<GameMode, string> = {
  term: "Guess the Tech Term",
  realai: "Real or AI?",
  taboo: "Tech Taboo",
};

interface Props {
  session: Session;
  onRematch: () => void;
  onLobby: () => void;
}

export function Results({ session, onRematch, onLobby }: Props) {
  const ranked = session.teams
    .map((team) => ({ team, total: teamTotal(team.roundScores) }))
    .sort((a, b) => b.total - a.total);
  const best = ranked[0]?.total ?? 0;
  const winners = ranked.filter((row) => row.total === best);
  const tied = winners.length > 1;
  const answered = session.log.filter((entry) => entry.outcome === "correct" || entry.outcome === "wrong" || entry.outcome === "timeout");
  const correct = session.log.filter((entry) => entry.outcome === "correct").length;
  const accuracy = answered.length === 0 ? 0 : Math.round((correct / answered.length) * 100);

  return (
    <div className="page results" data-testid="results">
      <section>
        <p className="meta">Final results</p>
        <h1 style={{ fontSize: "clamp(3rem, 8vw, 5rem)", lineHeight: 0.9 }}>
          {tied ? "It's a tie" : `${winners[0]?.team.name ?? "Nobody"} wins`}
        </h1>
        <p className="lede">
          {correct} correct out of {answered.length} decided answers ({accuracy}%). Skips and forbidden-word calls are listed below and are not counted in that percentage.
        </p>
      </section>
      <section className="podium" aria-label="Scores">
        {ranked.map((row, index) => (
          <article key={row.team.id} className={row.total === best ? "winner" : undefined}>
            <p className="meta">{index === 0 ? "Top score" : `Place ${index + 1}`}</p>
            <h2>{row.team.name}</h2>
            <b>{row.total}</b>
            <p className="meta">
              Term {row.team.roundScores.term} · Real/AI {row.team.roundScores.realai} · Taboo {row.team.roundScores.taboo}
            </p>
          </article>
        ))}
      </section>
      <section>
        <h2>Round breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>{MODE_LABEL.term}</th>
              <th>{MODE_LABEL.realai}</th>
              <th>{MODE_LABEL.taboo}</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row) => (
              <tr key={row.team.id}>
                <td>{row.team.name}</td>
                <td>{row.team.roundScores.term}</td>
                <td>{row.team.roundScores.realai}</td>
                <td>{row.team.roundScores.taboo}</td>
                <td>{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Answer log</h2>
        <table>
          <thead>
            <tr>
              <th>Round</th>
              <th>Team</th>
              <th>Result</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {session.log.map((entry, index) => (
              <tr key={`${entry.questionId}-${index}`}>
                <td>{MODE_LABEL[entry.mode]}</td>
                <td>{session.teams.find((team) => team.id === entry.teamId)?.name ?? entry.teamId}</td>
                <td>{entry.outcome}</td>
                <td>{entry.pointsDelta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="btn-row">
        <button className="btn primary" type="button" data-testid="rematch" onClick={onRematch}>
          Rematch with a fresh draw
        </button>
        <button className="btn" type="button" onClick={onLobby}>
          Back to the lobby
        </button>
      </div>
    </div>
  );
}
