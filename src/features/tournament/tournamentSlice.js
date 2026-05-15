import { createSlice } from "@reduxjs/toolkit";
import { defaultTournament } from "./defaultTournament";
import {
  buildBracket,
  createId,
  hasScores,
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
      state.participants = state.participants.filter((item) => item.id !== action.payload);
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
  updateEvent,
  updateImages,
  updateParticipant
} = tournamentSlice.actions;

export default tournamentSlice.reducer;
