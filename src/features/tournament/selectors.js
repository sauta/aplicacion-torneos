import { countMatches, getChampionId, winsNeeded } from "./bracketEngine";

export const selectTournament = (state) => state.tournament;

export const selectParticipantMap = (state) => (
  new Map(selectTournament(state).participants.map((participant) => [participant.id, participant]))
);

export const selectChampion = (state) => {
  const tournament = selectTournament(state);
  const championId = getChampionId(tournament);

  if (!championId) {
    return null;
  }

  return tournament.participants.find((participant) => participant.id === championId) || null;
};

export const selectTournamentStats = (state) => {
  const tournament = selectTournament(state);
  const champion = selectChampion(state);

  return {
    participants: tournament.participants.length,
    matches: countMatches(tournament),
    targetWins: winsNeeded(tournament.bestOf),
    championName: champion?.name || "Pendiente"
  };
};
