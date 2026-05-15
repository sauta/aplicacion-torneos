import { useSelector } from "react-redux";
import { selectTournamentStats } from "../features/tournament/selectors";

export function MetricsGrid() {
  const stats = useSelector(selectTournamentStats);

  return (
    <section className="metrics-grid" aria-label="Resumen del torneo">
      <article className="metric-card">
        <span>Participantes</span>
        <strong>{stats.participants}</strong>
      </article>
      <article className="metric-card">
        <span>Partidas</span>
        <strong>{stats.matches}</strong>
      </article>
      <article className="metric-card">
        <span>Para ganar</span>
        <strong>{stats.targetWins}</strong>
      </article>
      <article className="metric-card">
        <span>Campeon</span>
        <strong>{stats.championName}</strong>
      </article>
    </section>
  );
}
