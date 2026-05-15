export function createId(prefix = "id") {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeBestOf(value) {
  let number = Number.parseInt(value, 10);

  if (!Number.isFinite(number) || number < 1) {
    number = 3;
  }

  if (number % 2 === 0) {
    number += 1;
  }

  return Math.min(number, 9);
}

export function winsNeeded(bestOf) {
  return Math.floor(normalizeBestOf(bestOf) / 2) + 1;
}

export function nextPowerOfTwo(value) {
  const number = Math.max(2, Number.parseInt(value, 10) || 2);
  let power = 1;

  while (power < number) {
    power *= 2;
  }

  return power;
}

function createMatch(roundIndex, matchIndex, slots = [null, null]) {
  return {
    id: createId("m"),
    round: roundIndex,
    index: matchIndex,
    slots,
    scores: [0, 0],
    winner: null
  };
}

export function buildBracket(participants, bestOf) {
  const active = (participants || []).filter((participant) => participant?.name?.trim());
  const size = nextPowerOfTwo(active.length || 2);
  const slots = active.map((participant) => participant.id);
  const rounds = [];
  let matchCount = size / 2;

  while (slots.length < size) {
    slots.push(null);
  }

  rounds.push(Array.from({ length: matchCount }, (_, index) => (
    createMatch(0, index, [slots[index * 2] || null, slots[index * 2 + 1] || null])
  )));

  let roundIndex = 1;
  matchCount = Math.floor(matchCount / 2);

  while (matchCount >= 1) {
    rounds.push(Array.from({ length: matchCount }, (_, index) => createMatch(roundIndex, index)));
    roundIndex += 1;
    matchCount = Math.floor(matchCount / 2);
  }

  return recalculateBracket({ bestOf: normalizeBestOf(bestOf), rounds }).rounds;
}

function normalizeScorePair(scores, bestOf) {
  const target = winsNeeded(bestOf);
  let first = Math.max(0, Number.parseInt(scores?.[0], 10) || 0);
  let second = Math.max(0, Number.parseInt(scores?.[1], 10) || 0);

  first = Math.min(first, target);
  second = Math.min(second, target);

  if (first >= target && second >= target) {
    if (first >= second) {
      second = Math.max(0, target - 1);
    } else {
      first = Math.max(0, target - 1);
    }
  }

  return [first, second];
}

function resolveWinner(match, bestOf, roundIndex) {
  const slots = match.slots || [null, null];
  const scores = match.scores || [0, 0];
  const target = winsNeeded(bestOf);

  // BYE automático solo en la primera ronda
  if (roundIndex === 0) {
    if (slots[0] && !slots[1]) {
      return slots[0];
    }

    if (!slots[0] && slots[1]) {
      return slots[1];
    }
  }

  // En rondas posteriores, ambos participantes deben estar presentes
  if (!slots[0] || !slots[1]) {
    return null;
  }

  if (scores[0] >= target && scores[0] > scores[1]) {
    return slots[0];
  }

  if (scores[1] >= target && scores[1] > scores[0]) {
    return slots[1];
  }

  return null;
}

export function recalculateBracket(tournament) {
  if (!tournament?.rounds?.length) {
    return tournament;
  }

  const bestOf = normalizeBestOf(tournament.bestOf);
  const previousSlots = tournament.rounds.map((round) => round.map((match) => (match.slots || [null, null]).join("|")));

  tournament.rounds.forEach((round, roundIndex) => {
    round.forEach((match, matchIndex) => {
      match.round = roundIndex;
      match.index = matchIndex;
      match.slots = Array.isArray(match.slots) ? [match.slots[0] || null, match.slots[1] || null] : [null, null];
      match.scores = normalizeScorePair(match.scores, bestOf);
    });
  });

  for (let resetRound = 1; resetRound < tournament.rounds.length; resetRound += 1) {
    tournament.rounds[resetRound].forEach((match) => {
      match.slots = [null, null];
    });
  }

  tournament.rounds.forEach((round, roundIndex) => {
    round.forEach((match, matchIndex) => {
      const currentSlots = (match.slots || [null, null]).join("|");

      if (roundIndex > 0 && currentSlots !== previousSlots[roundIndex][matchIndex]) {
        match.scores = [0, 0];
        match.winner = null;
      }

      match.scores = normalizeScorePair(match.scores, bestOf);
      match.winner = resolveWinner(match, bestOf, roundIndex);

      if (roundIndex < tournament.rounds.length - 1) {
        const nextMatch = tournament.rounds[roundIndex + 1][Math.floor(matchIndex / 2)];
        const nextSlot = matchIndex % 2;

        if (nextMatch) {
          nextMatch.slots[nextSlot] = match.winner || null;
        }
      }
    });
  });

  tournament.bestOf = bestOf;
  return tournament;
}

export function setMatchScore(tournament, roundIndex, matchIndex, slotIndex, score) {
  const match = tournament.rounds?.[roundIndex]?.[matchIndex];

  if (!match?.slots?.[0] || !match?.slots?.[1]) {
    return tournament;
  }

  const target = winsNeeded(tournament.bestOf);
  const value = Math.max(0, Math.min(target, Number.parseInt(score, 10) || 0));
  const otherSlot = slotIndex === 0 ? 1 : 0;

  match.scores[slotIndex] = value;

  if (value >= target && match.scores[otherSlot] >= target) {
    match.scores[otherSlot] = Math.max(0, target - 1);
  }

  return recalculateBracket(tournament);
}

export function hasScores(tournament) {
  return Boolean(tournament?.rounds?.some((round) => (
    round.some((match) => match.scores?.[0] > 0 || match.scores?.[1] > 0)
  )));
}

export function countMatches(tournament) {
  return tournament?.rounds?.reduce((total, round) => total + round.length, 0) || 0;
}

export function getChampionId(tournament) {
  if (!tournament?.rounds?.length) {
    return null;
  }

  const finalRound = tournament.rounds[tournament.rounds.length - 1];
  return finalRound?.[0]?.winner || null;
}

export function getRoundLabel(roundIndex, totalRounds) {
  const remaining = Math.pow(2, totalRounds - roundIndex);

  if (remaining === 2) return "Final";
  if (remaining === 4) return "Semifinales";
  if (remaining === 8) return "Cuartos";
  if (remaining === 16) return "Octavos";
  if (remaining === 32) return "Dieciseisavos";

  return `Ronda ${roundIndex + 1}`;
}
