import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import tournamentReducer, {
  hydrateTournament,
  resetTournament,
  updateEvent,
  updateImages,
  addParticipant,
  updateParticipant,
  removeParticipant,
  reorderParticipant,
  setScore,
  rebuildTournamentBracket
} from '../tournamentSlice';

describe('tournamentSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        tournament: tournamentReducer
      }
    });
  });

  describe('Initial State', () => {
    it('should have default tournament values', () => {
      const state = store.getState().tournament;
      
      expect(state).toHaveProperty('name');
      expect(state).toHaveProperty('game');
      expect(state).toHaveProperty('bestOf');
      expect(state).toHaveProperty('participants');
      expect(state).toHaveProperty('rounds');
      expect(Array.isArray(state.participants)).toBe(true);
      expect(Array.isArray(state.rounds)).toBe(true);
    });
  });

  describe('hydrateTournament', () => {
    it('should replace entire tournament state', () => {
      const newTournament = {
        name: 'Test Tournament',
        game: 'Test Game',
        bestOf: 5,
        participants: [
          { id: 'p1', name: 'Player 1', kind: 'player', image: '' }
        ],
        rounds: []
      };
      
      store.dispatch(hydrateTournament(newTournament));
      const state = store.getState().tournament;
      
      expect(state.name).toBe('Test Tournament');
      expect(state.game).toBe('Test Game');
      expect(state.bestOf).toBe(5);
      expect(state.participants).toHaveLength(1);
    });

    it('should normalize the tournament data', () => {
      const dirtyTournament = {
        name: 'Test',
        game: 'Game',
        bestOf: 4, // even number
        participants: [],
        rounds: []
      };
      
      store.dispatch(hydrateTournament(dirtyTournament));
      const state = store.getState().tournament;
      
      // bestOf should be normalized to odd (5)
      expect(state.bestOf).toBe(5);
    });
  });

  describe('resetTournament', () => {
    it('should reset to default tournament', () => {
      // First modify the state
      store.dispatch(updateEvent({ field: 'name', value: 'Modified' }));
      store.dispatch(addParticipant({ name: 'Test Player', kind: 'player' }));
      
      // Then reset
      store.dispatch(resetTournament());
      const state = store.getState().tournament;
      
      expect(state.name).not.toBe('Modified');
      expect(state.participants.length).toBeGreaterThan(0); // default has participants
    });
  });

  describe('updateEvent', () => {
    it('should update tournament name', () => {
      store.dispatch(updateEvent({ field: 'name', value: 'New Tournament Name' }));
      const state = store.getState().tournament;
      
      expect(state.name).toBe('New Tournament Name');
    });

    it('should allow empty names and spaces', () => {
      store.dispatch(updateEvent({ field: 'name', value: '   ' }));
      const state = store.getState().tournament;
      
      expect(state.name).toBe('   ');
    });

    it('should update game name', () => {
      store.dispatch(updateEvent({ field: 'game', value: 'Counter Strike' }));
      const state = store.getState().tournament;
      
      expect(state.game).toBe('Counter Strike');
    });

    it('should update bestOf and recalculate bracket', () => {
      // Add participants first
      store.dispatch(addParticipant({ name: 'Player 1', kind: 'player' }));
      store.dispatch(addParticipant({ name: 'Player 2', kind: 'player' }));
      
      store.dispatch(updateEvent({ field: 'bestOf', value: 5 }));
      const state = store.getState().tournament;
      
      expect(state.bestOf).toBe(5);
      // Bracket should be recalculated
      expect(state.rounds.length).toBeGreaterThan(0);
    });

    it('should normalize bestOf to odd number', () => {
      store.dispatch(updateEvent({ field: 'bestOf', value: 4 }));
      const state = store.getState().tournament;
      
      expect(state.bestOf).toBe(5);
    });
  });

  describe('updateImages', () => {
    it('should update banner image', () => {
      store.dispatch(updateImages({ field: 'banner', value: '/uploads/banner.jpg' }));
      const state = store.getState().tournament;
      
      expect(state.banner).toBe('/uploads/banner.jpg');
    });

    it('should update logo image', () => {
      store.dispatch(updateImages({ field: 'logo', value: '/uploads/logo.png' }));
      const state = store.getState().tournament;
      
      expect(state.logo).toBe('/uploads/logo.png');
    });

    it('should only accept string values', () => {
      store.dispatch(updateImages({ field: 'banner', value: 123 }));
      const state = store.getState().tournament;
      
      expect(state.banner).toBe('');
    });

    it('should ignore invalid fields', () => {
      const initialState = store.getState().tournament;
      store.dispatch(updateImages({ field: 'invalid', value: 'test' }));
      const newState = store.getState().tournament;
      
      expect(newState).toEqual(initialState);
    });
  });

  describe('addParticipant', () => {
    it('should add a new participant with generated ID', () => {
      const initialCount = store.getState().tournament.participants.length;
      
      store.dispatch(addParticipant({ name: 'New Player', kind: 'player', image: '' }));
      const state = store.getState().tournament;
      
      expect(state.participants).toHaveLength(initialCount + 1);
      
      const newParticipant = state.participants[state.participants.length - 1];
      expect(newParticipant.name).toBe('New Player');
      expect(newParticipant.kind).toBe('player');
      expect(newParticipant.id).toMatch(/^p-/);
    });

    it('should default to "player" kind', () => {
      store.dispatch(addParticipant({ name: 'Test', kind: 'invalid' }));
      const state = store.getState().tournament;
      
      const participant = state.participants[state.participants.length - 1];
      expect(participant.kind).toBe('player');
    });

    it('should accept "team" kind', () => {
      store.dispatch(addParticipant({ name: 'Team A', kind: 'team' }));
      const state = store.getState().tournament;
      
      const participant = state.participants[state.participants.length - 1];
      expect(participant.kind).toBe('team');
    });

    it('should default empty names', () => {
      store.dispatch(addParticipant({ name: '', kind: 'player' }));
      const state = store.getState().tournament;
      
      const participant = state.participants[state.participants.length - 1];
      expect(participant.name).toBe('Participante');
    });

    it('should rebuild bracket when no scores exist', () => {
      // Start fresh
      store.dispatch(resetTournament());
      
      // Remove all participants
      const state1 = store.getState().tournament;
      state1.participants.forEach(p => {
        store.dispatch(removeParticipant(p.id));
      });
      
      // Add two participants
      store.dispatch(addParticipant({ name: 'Player 1', kind: 'player' }));
      store.dispatch(addParticipant({ name: 'Player 2', kind: 'player' }));
      
      const state = store.getState().tournament;
      expect(state.rounds.length).toBeGreaterThan(0);
    });
  });

  describe('updateParticipant', () => {
    it('should update participant name', () => {
      const state1 = store.getState().tournament;
      const participantId = state1.participants[0]?.id;
      
      if (!participantId) {
        // Add a participant first
        store.dispatch(addParticipant({ name: 'Test', kind: 'player' }));
        const state2 = store.getState().tournament;
        const newId = state2.participants[state2.participants.length - 1].id;
        
        store.dispatch(updateParticipant({ id: newId, changes: { name: 'Updated Name' } }));
        const state3 = store.getState().tournament;
        
        const participant = state3.participants.find(p => p.id === newId);
        expect(participant.name).toBe('Updated Name');
      } else {
        store.dispatch(updateParticipant({ id: participantId, changes: { name: 'Updated Name' } }));
        const state = store.getState().tournament;
        
        const participant = state.participants.find(p => p.id === participantId);
        expect(participant.name).toBe('Updated Name');
      }
    });

    it('should update participant kind', () => {
      store.dispatch(addParticipant({ name: 'Test', kind: 'player' }));
      const state1 = store.getState().tournament;
      const participantId = state1.participants[state1.participants.length - 1].id;
      
      store.dispatch(updateParticipant({ id: participantId, changes: { kind: 'team' } }));
      const state2 = store.getState().tournament;
      
      const participant = state2.participants.find(p => p.id === participantId);
      expect(participant.kind).toBe('team');
    });

    it('should update participant image', () => {
      store.dispatch(addParticipant({ name: 'Test', kind: 'player' }));
      const state1 = store.getState().tournament;
      const participantId = state1.participants[state1.participants.length - 1].id;
      
      store.dispatch(updateParticipant({ id: participantId, changes: { image: '/uploads/avatar.jpg' } }));
      const state2 = store.getState().tournament;
      
      const participant = state2.participants.find(p => p.id === participantId);
      expect(participant.image).toBe('/uploads/avatar.jpg');
    });

    it('should not update if participant not found', () => {
      const initialState = store.getState().tournament;
      
      store.dispatch(updateParticipant({ id: 'non-existent', changes: { name: 'Test' } }));
      const newState = store.getState().tournament;
      
      expect(newState).toEqual(initialState);
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant by id', () => {
      store.dispatch(addParticipant({ name: 'ToRemove', kind: 'player' }));
      const state1 = store.getState().tournament;
      const participantId = state1.participants[state1.participants.length - 1].id;
      const initialCount = state1.participants.length;
      
      store.dispatch(removeParticipant(participantId));
      const state2 = store.getState().tournament;
      
      expect(state2.participants).toHaveLength(initialCount - 1);
      expect(state2.participants.find(p => p.id === participantId)).toBeUndefined();
    });

    it('should rebuild bracket after removal', () => {
      // Ensure we have participants
      store.dispatch(addParticipant({ name: 'P1', kind: 'player' }));
      store.dispatch(addParticipant({ name: 'P2', kind: 'player' }));
      
      const state1 = store.getState().tournament;
      const participantId = state1.participants[0].id;
      
      store.dispatch(removeParticipant(participantId));
      const state2 = store.getState().tournament;
      
      // Bracket should be rebuilt
      expect(state2.rounds).toBeDefined();
    });
  });

  describe('reorderParticipant', () => {
    beforeEach(() => {
      // Reset and add fresh participants
      store.dispatch(resetTournament());
      const state = store.getState().tournament;
      state.participants.forEach(p => store.dispatch(removeParticipant(p.id)));
      
      store.dispatch(addParticipant({ name: 'Player 1', kind: 'player' }));
      store.dispatch(addParticipant({ name: 'Player 2', kind: 'player' }));
      store.dispatch(addParticipant({ name: 'Player 3', kind: 'player' }));
    });

    it('should reorder participants', () => {
      const state1 = store.getState().tournament;
      const originalOrder = state1.participants.map(p => p.name);
      
      // Move index 0 to index 2
      store.dispatch(reorderParticipant({ sourceIndex: 0, targetIndex: 2 }));
      const state2 = store.getState().tournament;
      
      expect(state2.participants[2].name).toBe(originalOrder[0]);
    });

    it('should not reorder if sourceIndex equals targetIndex', () => {
      const state1 = store.getState().tournament;
      const originalOrder = state1.participants.map(p => p.id);
      
      store.dispatch(reorderParticipant({ sourceIndex: 1, targetIndex: 1 }));
      const state2 = store.getState().tournament;
      
      expect(state2.participants.map(p => p.id)).toEqual(originalOrder);
    });

    it('should not reorder if indices are out of bounds', () => {
      const state1 = store.getState().tournament;
      const originalOrder = state1.participants.map(p => p.id);
      
      store.dispatch(reorderParticipant({ sourceIndex: -1, targetIndex: 0 }));
      const state2 = store.getState().tournament;
      
      expect(state2.participants.map(p => p.id)).toEqual(originalOrder);
    });

    it('should rebuild bracket after reordering', () => {
      store.dispatch(reorderParticipant({ sourceIndex: 0, targetIndex: 1 }));
      const state = store.getState().tournament;
      
      // Bracket should exist after reorder
      expect(state.rounds.length).toBeGreaterThan(0);
    });
  });

  describe('setScore', () => {
    beforeEach(() => {
      // Setup tournament with 2 participants
      store.dispatch(resetTournament());
      const state = store.getState().tournament;
      state.participants.forEach(p => store.dispatch(removeParticipant(p.id)));
      
      store.dispatch(addParticipant({ name: 'Player 1', kind: 'player' }));
      store.dispatch(addParticipant({ name: 'Player 2', kind: 'player' }));
    });

    it('should set match score', () => {
      const state1 = store.getState().tournament;
      
      store.dispatch(setScore({ roundIndex: 0, matchIndex: 0, slotIndex: 0, score: 2 }));
      const state2 = store.getState().tournament;
      
      expect(state2.rounds[0][0].scores[0]).toBe(2);
    });

    it('should determine winner when score is sufficient', () => {
      store.dispatch(setScore({ roundIndex: 0, matchIndex: 0, slotIndex: 0, score: 2 }));
      const state = store.getState().tournament;
      
      const match = state.rounds[0][0];
      expect(match.winner).not.toBeNull();
      expect(match.winner).toBe(match.slots[0]);
    });

    it('should cap score at wins needed', () => {
      const state1 = store.getState().tournament;
      const winsNeeded = Math.floor(state1.bestOf / 2) + 1;
      
      store.dispatch(setScore({ roundIndex: 0, matchIndex: 0, slotIndex: 0, score: 100 }));
      const state2 = store.getState().tournament;
      
      expect(state2.rounds[0][0].scores[0]).toBe(winsNeeded);
    });
  });

  describe('rebuildTournamentBracket', () => {
    it('should rebuild the bracket', () => {
      store.dispatch(resetTournament());
      const state1 = store.getState().tournament;
      
      // Verify bracket exists
      expect(state1.rounds.length).toBeGreaterThan(0);
      
      store.dispatch(rebuildTournamentBracket());
      const state2 = store.getState().tournament;
      
      // Bracket should still exist after rebuild
      expect(state2.rounds.length).toBeGreaterThan(0);
    });
  });
});
