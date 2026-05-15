import { createSlice } from "@reduxjs/toolkit";
import { defaultTournament } from "./defaultTournament";
import {
  buildBracket,
  createId,
  hasScores,
  isTournamentStarted,
  normalizeBestOf,
  recalculateBracket,
  setMatchScore
} from "./bracketEngine";
import { clone, normalizeTournament } from "../../services/tournamentApi";

const initialState = normalizeTournament(defaultTournament);

function ensureBracket(state) {
  if (!state.rounds.length && state.participants.length >= 2) {
    state.rounds = buildBracket(state.participants, state.bestOf);
  }

  recalculateBracket(state);
}

function rebuildBracket(state) {
  state.rounds = buildBracket(state.participants, state.bestOf);
  recalculateBracket(state);
}

const tournamentSlice = createSlice({
  name: "tournament",
  initialState,
  reducers: {
    hydrateTournament: (state, action) => {
      return normalizeTournament(action.payload);
    },
    resetTournament: () => {
      const next = normalizeTournament(clone(defaultTournament));
      next.rounds = buildBracket(next.participants, next.bestOf);
      return next;
    },
    updateEvent: (state, action) => {
      const { field, value } = action.payload;

      if (field === "name") {
        state.name = String(value || "");
      }

      if (field === "game") {
        state.game = String(value || "");
      }

      if (field === "bestOf") {
        state.bestOf = normalizeBestOf(value);
        recalculateBracket(state);
      }
    },
    updateImages: (state, action) => {
      const { field, value } = action.payload;

      if (field === "banner" || field === "logo") {
        state[field] = typeof value === "string" ? value : "";
      }
    },
    addParticipant: {
      reducer: (state, action) => {
        state.participants.push(action.payload);

        if (!hasScores(state)) {
          rebuildBracket(state);
        } else {
          ensureBracket(state);
        }
      },
      prepare: ({ name, kind, image }) => ({
        payload: {
          id: createId("p"),
          name: String(name || "").trim() || "Participante",
          kind: kind === "team" ? "team" : "player",
          image: typeof image === "string" ? image : ""
        }
      })
    },
    updateParticipant: (state, action) => {
      const { id, changes } = action.payload;
      const participant = state.participants.find((item) => item.id === id);

      if (!participant) {
        return;
      }

      if (Object.hasOwn(changes, "name")) {
        participant.name = String(changes.name || "").trim() || "Participante";
      }

      if (Object.hasOwn(changes, "kind")) {
        participant.kind = changes.kind === "team" ? "team" : "player";
      }

      if (Object.hasOwn(changes, "image")) {
        participant.image = typeof changes.image === "string" ? changes.image : "";
      }

      recalculateBracket(state);
    },
    removeParticipant: (state, action) => {
      const participantId = action.payload;
      
      // Si el torneo ya empezó, no permitir eliminar
      // (En el futuro podríamos implementar WO aquí)
      if (isTournamentStarted(state)) {
        console.warn('No se puede eliminar un participante una vez iniciado el torneo');
        return;
      }
      
      state.participants = state.participants.filter((item) => item.id !== participantId);
      rebuildBracket(state);
    },
    reorderParticipant: (state, action) => {
      const { sourceIndex, targetIndex } = action.payload;

      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        sourceIndex === targetIndex ||
        sourceIndex >= state.participants.length ||
        targetIndex >= state.participants.length
      ) {
        return;
      }

      const [moved] = state.participants.splice(sourceIndex, 1);
      state.participants.splice(targetIndex, 0, moved);
      rebuildBracket(state);
    },
    rebuildTournamentBracket: (state) => {
      rebuildBracket(state);
    },
    setScore: (state, action) => {
      const { roundIndex, matchIndex, slotIndex, score } = action.payload;
      setMatchScore(state, roundIndex, matchIndex, slotIndex, score);
    },
    swapMatchParticipants: (state, action) => {
      const { fromRound, fromMatch, fromSlot, toRound, toMatch, toSlot } = action.payload;
      
      // Validar que las rondas y matches existen
      if (!state.rounds[fromRound]?.[fromMatch] || !state.rounds[toRound]?.[toMatch]) {
        return;
      }
      
      const sourceMatch = state.rounds[fromRound][fromMatch];
      const targetMatch = state.rounds[toRound][toMatch];
      
      // Intercambiar los participantes
      const temp = sourceMatch.slots[fromSlot];
      sourceMatch.slots[fromSlot] = targetMatch.slots[toSlot];
      targetMatch.slots[toSlot] = temp;
      
      // Recalcular el bracket después del cambio
      recalculateBracket(state);
    },
    importTournament: (state, action) => {
      return normalizeTournament(action.payload);
    }
  }
});

export const {
  addParticipant,
  hydrateTournament,
  importTournament,
  rebuildTournamentBracket,
  removeParticipant,
  reorderParticipant,
  resetTournament,
  setScore,
  swapMatchParticipants,
  updateEvent,
  updateImages,
  updateParticipant
} = tournamentSlice.actions;

export default tournamentSlice.reducer;
