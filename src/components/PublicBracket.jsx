import { useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import { Avatar } from "./Avatar";
import { ChampionStrip } from "./ChampionStrip";
import { RefreshIcon } from "./RefreshIcon";
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

function BracketConnectors({ rounds, mapRef }) {
  const svgRef = useRef(null);

  useEffect(() => {
    // Pequeño delay para asegurar que el DOM esté montado
    const timer = setTimeout(() => {
      if (!svgRef.current || !mapRef?.current || !rounds?.length) return;

      const svg = svgRef.current;
      const map = mapRef.current;
      
      // Limpiar paths existentes
      svg.innerHTML = '';
      
      // Obtener dimensiones del contenedor
      const mapRect = map.getBoundingClientRect();
      svg.setAttribute('width', mapRect.width);
      svg.setAttribute('height', mapRect.height);

      // Para cada ronda excepto la final
      rounds.slice(0, -1).forEach((round, roundIndex) => {
        // Seleccionar directamente las secciones .public-round en lugar de usar nth-child
        const allRoundElements = map.querySelectorAll('.public-round');
        const currentRoundEl = allRoundElements[roundIndex];
        const nextRoundEl = allRoundElements[roundIndex + 1];
        
        if (!currentRoundEl || !nextRoundEl) return;
        
        const roundElements = currentRoundEl.querySelectorAll('.public-match-banner');
        const nextRoundElements = nextRoundEl.querySelectorAll('.public-match-banner');

        roundElements.forEach((matchEl, matchIndex) => {
          const matchRect = matchEl.getBoundingClientRect();
          const mapOffset = mapRect.left;
          const mapTop = mapRect.top;

          // Obtener el match actual para verificar si tiene ganador
          const currentMatch = round[matchIndex];
          const hasWinner = currentMatch && currentMatch.winner;

          // Punto de inicio (derecha del match actual, centro vertical)
          const startX = matchRect.right - mapOffset;
          const startY = matchRect.top + matchRect.height / 2 - mapTop;

          // Calcular el match de destino en la siguiente ronda
          const targetMatchIndex = Math.floor(matchIndex / 2);
          const targetMatch = nextRoundElements[targetMatchIndex];

          if (targetMatch) {
            const targetRect = targetMatch.getBoundingClientRect();
            
            // Determinar si es el match superior o inferior del par
            const isTopMatch = matchIndex % 2 === 0;
            
            // Punto final en el match de destino
            // Si es el match superior, conectar a 1/3 de la altura
            // Si es el match inferior, conectar a 2/3 de la altura
            const endX = targetRect.left - mapOffset;
            const targetYOffset = isTopMatch ? targetRect.height * 0.33 : targetRect.height * 0.67;
            const endY = targetRect.top + targetYOffset - mapTop;

            // Puntos de control para la curva Bézier
            const controlOffset = (endX - startX) * 0.5;
            const cp1X = startX + controlOffset;
            const cp1Y = startY;
            const cp2X = endX - controlOffset;
            const cp2Y = endY;

            // Crear path con curva Bézier cúbica
            const pathD = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', pathD);
            path.setAttribute('class', 'bracket-connector');
            path.setAttribute('id', `path-${roundIndex}-${matchIndex}`);
            
            svg.appendChild(path);

            // Solo agregar bolita animada si hay un ganador
            if (hasWinner) {
              // Crear círculo que se moverá a lo largo del path
              const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circle.setAttribute('r', '5');
              circle.setAttribute('class', 'bracket-connector-dot-animated');
              
              // Crear animación de movimiento a lo largo del path
              const animateMotion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
              animateMotion.setAttribute('dur', '3s');
              animateMotion.setAttribute('repeatCount', 'indefinite');
              animateMotion.setAttribute('path', pathD);
              
              circle.appendChild(animateMotion);
              svg.appendChild(circle);
            }
          }
        });
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [rounds]);

  return (
    <svg 
      ref={svgRef}
      className="bracket-connectors-svg"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
}

export function PublicBracket({ onRefresh, isRefreshing }) {
  const tournament = useSelector(selectTournament);
  const participantMap = useSelector(selectParticipantMap);
  const champion = useSelector(selectChampion);
  const mapRef = useRef(null);

  return (
    <section className="bracket-panel public-bracket">
      <div className="section-toolbar">
        <div>
          <span className="eyebrow">Vista publica</span>
          <h2>Cuadro del torneo</h2>
        </div>
        {onRefresh && (
          <button
            className="btn btn-refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Actualizar datos del torneo"
          >
            <RefreshIcon className={isRefreshing ? "refresh-icon-spinning" : "refresh-icon"} />
          </button>
        )}
      </div>

      {!tournament.rounds.length ? (
        <div className="empty-state">Sin bracket generado.</div>
      ) : (
        <>
          <ChampionStrip champion={champion} />
          <div className="public-bracket-scroll">
            <div className="public-bracket-map" ref={mapRef} style={{ position: 'relative' }}>
              <BracketConnectors rounds={tournament.rounds} mapRef={mapRef} />
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
