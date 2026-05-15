import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { Avatar } from "./Avatar";
import { ChampionStrip } from "./ChampionStrip";
import { getRoundLabel, hasScores, winsNeeded } from "../features/tournament/bracketEngine";
import { selectChampion, selectParticipantMap, selectTournament } from "../features/tournament/selectors";
import { rebuildTournamentBracket, setScore, swapMatchParticipants } from "../features/tournament/tournamentSlice";
import { participantLabel } from "../lib/text";

function ScoreControl({ match, slotIndex }) {
  const dispatch = useDispatch();
  const bothReady = Boolean(match.slots?.[0] && match.slots?.[1]);
  const score = match.scores?.[slotIndex] || 0;

  function update(delta) {
    dispatch(setScore({
      roundIndex: match.round,
      matchIndex: match.index,
      slotIndex,
      score: score + delta
    }));
  }

  return (
    <div className="score-control">
      <button
        className="btn btn-light btn-sm score-btn"
        type="button"
        disabled={!bothReady}
        onClick={() => update(-1)}
        aria-label="Restar partida"
      >
        -
      </button>
      <span className="score-number">{score}</span>
      <button
        className="btn btn-light btn-sm score-btn"
        type="button"
        disabled={!bothReady}
        onClick={() => update(1)}
        aria-label="Sumar partida"
      >
        +
      </button>
    </div>
  );
}

function MatchSide({ match, slotIndex, participantMap, onDragStart, onDragOver, onDrop, isDragOver }) {
  const id = match.slots?.[slotIndex] || null;
  const opponentId = match.slots?.[slotIndex === 0 ? 1 : 0] || null;
  const participant = id ? participantMap.get(id) : null;
  const isBye = !id && opponentId;
  const isPending = !id && !opponentId;
  const className = [
    "match-side",
    id && match.winner === id ? "is-winner" : "",
    !id ? "is-muted" : "",
    isDragOver ? "drag-over" : ""
  ].filter(Boolean).join(" ");
  const name = participant ? participant.name : (isBye ? "BYE" : "Por definir");
  const label = participant ? participantLabel(participant) : (isPending ? "Pendiente" : "Avance automatico");

  const handleDragStart = (e) => {
    if (!participant) {
      e.preventDefault();
      return;
    }
    onDragStart(e, match, slotIndex);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    onDragOver(match, slotIndex);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    onDrop(match, slotIndex);
  };

  const handleDragLeave = () => {
    onDragOver(null, null);
  };

  return (
    <div 
      className={className}
      draggable={!!participant}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      style={{ cursor: participant ? 'grab' : 'default' }}
    >
      {participant ? <Avatar participant={participant} /> : <div className="avatar avatar-fallback">-</div>}
      <div className="match-player">
        <strong title={name}>{name}</strong>
        <small>{label}</small>
      </div>
      <ScoreControl match={match} slotIndex={slotIndex} />
    </div>
  );
}

function MatchStatus({ match, participantMap, bestOf }) {
  const winner = match.winner ? participantMap.get(match.winner) : null;

  if (winner) {
    return <>Avanza: <strong>{winner.name}</strong></>;
  }

  if (!match.slots?.[0] || !match.slots?.[1]) {
    return "Esperando rival";
  }

  return `Primero en llegar a ${winsNeeded(bestOf)} partidas`;
}

function MatchCard({ match, participantMap, bestOf, onDragStart, onDragOver, onDrop, dragOverSlot }) {
  return (
    <article className={`match-card ${match.winner ? "is-complete" : ""}`}>
      <div className="match-label">
        <span>VS {match.index + 1}</span>
        <span>Mejor de {bestOf}</span>
      </div>
      <MatchSide 
        match={match} 
        slotIndex={0} 
        participantMap={participantMap}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        isDragOver={dragOverSlot?.round === match.round && dragOverSlot?.match === match.index && dragOverSlot?.slot === 0}
      />
      <MatchSide 
        match={match} 
        slotIndex={1} 
        participantMap={participantMap}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        isDragOver={dragOverSlot?.round === match.round && dragOverSlot?.match === match.index && dragOverSlot?.slot === 1}
      />
      <div className="match-status">
        <MatchStatus match={match} participantMap={participantMap} bestOf={bestOf} />
      </div>
    </article>
  );
}

export function AdminBracket({ notify }) {
  const dispatch = useDispatch();
  const tournament = useSelector(selectTournament);
  const participantMap = useSelector(selectParticipantMap);
  const champion = useSelector(selectChampion);
  
  const [dragSource, setDragSource] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  function rebuild() {
    if (hasScores(tournament) && !window.confirm("Esto reiniciara los resultados actuales. Continuar?")) {
      return;
    }

    dispatch(rebuildTournamentBracket());
    notify("Bracket generado");
  }

  const handleDragStart = (e, match, slotIndex) => {
    setDragSource({
      round: match.round,
      match: match.index,
      slot: slotIndex,
      participantId: match.slots[slotIndex]
    });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (match, slotIndex) => {
    if (match === null) {
      setDragOverSlot(null);
      return;
    }
    setDragOverSlot({
      round: match.round,
      match: match.index,
      slot: slotIndex
    });
  };

  const handleDrop = (targetMatch, targetSlot) => {
    if (!dragSource) return;

    // No permitir drop en el mismo slot
    if (dragSource.round === targetMatch.round && 
        dragSource.match === targetMatch.index && 
        dragSource.slot === targetSlot) {
      setDragSource(null);
      setDragOverSlot(null);
      return;
    }

    dispatch(swapMatchParticipants({
      fromRound: dragSource.round,
      fromMatch: dragSource.match,
      fromSlot: dragSource.slot,
      toRound: targetMatch.round,
      toMatch: targetMatch.index,
      toSlot: targetSlot
    }));

    setDragSource(null);
    setDragOverSlot(null);
    notify("Participantes intercambiados");
  };

  return (
    <section className="bracket-panel">
      <div className="section-toolbar">
        <div>
          <span className="eyebrow">Llaves</span>
          <h2>Cuadro del torneo</h2>
        </div>
        <div className="toolbar-actions">
          <button
            className="btn btn-outline-secondary btn-sm"
            type="button"
            onClick={() => {
              dispatch(rebuildTournamentBracket());
              notify("Resultados limpiados");
            }}
          >
            Limpiar resultados
          </button>
          <button className="btn btn-dark btn-sm" type="button" onClick={rebuild}>
            Generar bracket
          </button>
        </div>
      </div>

      {!tournament.rounds.length ? (
        <div className="empty-state">Sin bracket generado.</div>
      ) : (
        <>
          <ChampionStrip champion={champion} />
          <div className="bracket-scroll">
            <div className="bracket-board">
              {tournament.rounds.map((round, roundIndex) => (
                <section className="round-column" key={roundIndex}>
                  <div className="round-title">{getRoundLabel(roundIndex, tournament.rounds.length)}</div>
                  {round.map((match) => (
                    <MatchCard
                      bestOf={tournament.bestOf}
                      key={match.id}
                      match={match}
                      participantMap={participantMap}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      dragOverSlot={dragOverSlot}
                    />
                  ))}
                </section>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
