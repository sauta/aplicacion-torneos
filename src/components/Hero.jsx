import { useSelector } from "react-redux";
import { selectTournament } from "../features/tournament/selectors";
import { initials, safeImage } from "../lib/text";

export function Hero() {
  const tournament = useSelector(selectTournament);
  const banner = safeImage(tournament.banner);
  const logo = safeImage(tournament.logo);
  const heroStyle = banner
    ? {
      backgroundImage: `linear-gradient(180deg, rgba(23, 32, 51, 0.24) 0%, rgba(23, 32, 51, 0.84) 100%), url("${banner}")`
    }
    : undefined;

  return (
    <section className="tournament-hero" style={heroStyle}>
      <div className="hero-content">
        <div className="hero-logo-wrap">
          {logo ? (
            <img className="tournament-logo" src={logo} alt="" />
          ) : (
            <div className="logo-fallback">{initials(tournament.name)}</div>
          )}
        </div>
        <div className="hero-copy">
          <span className="hero-kicker">{tournament.game}</span>
          <h1>{tournament.name}</h1>
          <p>
            {tournament.participants.length} participantes
            {tournament.rounds.length ? ` - ${tournament.rounds.length} rondas` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
