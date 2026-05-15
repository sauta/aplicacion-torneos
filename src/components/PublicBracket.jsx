import { useSelector } from "react-redux";
import { Avatar } from "./Avatar";
import { ChampionStrip } from "./ChampionStrip";
import { getRoundLabel, winsNeeded } from "../features/tournament/bracketEngine";
import { selectChampion, selectParticipantMap, selectTournament } from "../features/tournament/selectors";
import { participantLabel } from "../lib/text";

function getPublicRoundStyle(roundIndex) {
  const matchHeight = 132;
  const baseGap = 18;
  const gap = Math.max(baseGap, (Math.pow(2, roundIndex) * (matchHeight + baseGap)) - matchHeight);
  const offset = roundIndex === 0 ? 0 : Math.max(0, ((matchHeight + baseGap) * Math.pow(2, roundIndex - 1)) - (matchHeight / 2));

  return {
    "--round-gap": `${gap}px`,
    "--round-offset": `${offset}px`
  };
}

function PublicPlayerBanner({ match, participantMap, slotIndex }) {
  const id = match.slots?.[slotIndex] || null;
  const opponentId = match.slots?.[slotIndex === 0 ? 1 : 0] || null;
  const participant = id ? participantMap.get(id) : null;
  const score = match.scores?.[slotIndex] || 0;
  const name = participant ? participant.name : (opponentId ? "BYE" : "Por definir");
  const label = participant ? participantLabel(participant) : (opponentId ? "Avance automatico" : "Pendiente");
  const className = [
    "public-player-banner",
    id && match.winner === id ? "is-winner" : "",
    !id ? "is-muted" : ""
  ].filter(Boolean).join(" ");

  return (
    <div className={className}>
      {participant ? <Avatar participant={participant} /> : <div className="avatar avatar-fallback">-</div>}
      <div className="public-player-copy">
        <strong title={name}>{name}</strong>
        <small>{label}</small>
      </div>
      <span className="public-score">{score}</span>
    </div>
  );
}

function PublicMatchBanner({ bestOf, match, participantMap }) {
  const winner = match.winner ? participantMap.get(match.winner) : null;
  const foot = winner
    ? `Avanza ${winner.name}`
    : (!match.slots?.[0] || !match.slots?.[1] ? "Esperando rival" : `Primero en llegar a ${winsNeeded(bestOf)} partidas`);

  return (
    <article className={`public-match-banner ${winner ? "is-complete" : ""}`}>
      <div className="public-match-head">
        <span>VS {match.index + 1}</span>
        <span>Mejor de {bestOf}</span>
      </div>
      <PublicPlayerBanner match={match} participantMap={participantMap} slotIndex={0} />
      <div className="public-vs-line"><span>vs</span></div>
      <PublicPlayerBanner match={match} participantMap={participantMap} slotIndex={1} />
      <div className="public-match-foot">{foot}</div>
    </article>
  );
}

export function PublicBracket() {
  const tournament = useSelector(selectTournament);
  const participantMap = useSelector(selectParticipantMap);
  const champion = useSelector(selectChampion);

  return (
    <section className="bracket-panel public-bracket">
      <div className="section-toolbar">
        <div>
          <span className="eyebrow">Vista publica</span>
          <h2>Cuadro del torneo</h2>
        </div>
      </div>

      {!tournament.rounds.length ? (
        <div className="empty-state">Sin bracket generado.</div>
      ) : (
        <>
          <ChampionStrip champion={champion} />
          <div className="public-bracket-scroll">
            <div className="public-bracket-map">
              {tournament.rounds.map((round, roundIndex) => (
                <section
                  className={`public-round ${roundIndex === tournament.rounds.length - 1 ? "is-final-round" : ""}`}
                  key={roundIndex}
                  style={getPublicRoundStyle(roundIndex)}
                >
                  <div className="round-title">{getRoundLabel(roundIndex, tournament.rounds.length)}</div>
                  <div className="public-match-list">
                    {round.map((match) => (
                      <PublicMatchBanner
                        bestOf={tournament.bestOf}
                        key={match.id}
                        match={match}
                        participantMap={participantMap}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
