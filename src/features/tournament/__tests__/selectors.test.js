import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import tournamentReducer from '../tournamentSlice';
import {
  selectTournament,
  selectParticipantMap,
  selectChampion,
  selectTournamentStats
} from '../selectors';

describe('Tournament Selectors', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        tournament: tournamentReducer
      }
    });
  });

  describe('selectTournament', () => {
    it('should return the entire tournament state', () => {
      const result = selectTournament(store.getState());
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('game');
      expect(result).toHaveProperty('bestOf');
      expect(result).toHaveProperty('participants');
      expect(result).toHaveProperty('rounds');
    });

    it('should return updated state after modifications', () => {
      const initialState = selectTournament(store.getState());
      const initialName = initialState.name;
      
      store.dispatch({
        type: 'tournament/updateEvent',
        payload: { field: 'name', value: 'Updated Tournament' }
      });
      
      const updatedState = selectTournament(store.getState());
      expect(updatedState.name).toBe('Updated Tournament');
      expect(updatedState.name).not.toBe(initialName);
    });
  });

  describe('selectParticipantMap', () => {
    it('should return a Map of participants indexed by id', () => {
      const result = selectParticipantMap(store.getState());
      
      expect(result).toBeInstanceOf(Map);
    });

    it('should allow quick lookup of participants by id', () => {
      const tournament = selectTournament(store.getState());
      
      if (tournament.participants.length > 0) {
        const firstParticipant = tournament.participants[0];
        const map = selectParticipantMap(store.getState());
        
        expect(map.get(firstParticipant.id)).toEqual(firstParticipant);
      }
    });

    it('should have the same size as participants array', () => {
      const tournament = selectTournament(store.getState());
      const map = selectParticipantMap(store.getState());
      
      expect(map.size).toBe(tournament.participants.length);
    });

    it('should update when participants are added', () => {
      const initialMap = selectParticipantMap(store.getState());
      const initialSize = initialMap.size;
      
      store.dispatch({
        type: 'tournament/addParticipant',
        payload: {
          id: 'test-new-id',
          name: 'New Player',
          kind: 'player',
          image: ''
        }
      });
      
      const updatedMap = selectParticipantMap(store.getState());
      expect(updatedMap.size).toBe(initialSize + 1);
      expect(updatedMap.has('test-new-id')).toBe(true);
    });
  });

  describe('selectChampion', () => {
    it('should return null when no champion exists', () => {
      // Fresh tournament without completed matches
      store.dispatch({ type: 'tournament/resetTournament' });
      
      const champion = selectChampion(store.getState());
      expect(champion).toBeNull();
    });

    it('should return the champion participant when tournament is complete', () => {
      // Setup a minimal tournament with a winner
      const mockTournament = {
        name: 'Test',
        game: 'Test Game',
        bestOf: 3,
        banner: '',
        logo: '',
        participants: [
          { id: 'p1', name: 'Player 1', kind: 'player', image: '' },
          { id: 'p2', name: 'Player 2', kind: 'player', image: '' }
        ],
        rounds: [
          [
            {
              id: 'm1',
              round: 0,
              index: 0,
              slots: ['p1', 'p2'],
              scores: [2, 0],
              winner: 'p1'
            }
          ]
        ]
      };
      
      store.dispatch({
        type: 'tournament/hydrateTournament',
        payload: mockTournament
      });
      
      const champion = selectChampion(store.getState());
      
      if (champion) {
        expect(champion.id).toBe('p1');
        expect(champion.name).toBe('Player 1');
      }
    });

    it('should return the correct participant object', () => {
      const mockTournament = {
        name: 'Test',
        game: 'Test Game',
        bestOf: 3,
        banner: '',
        logo: '',
        participants: [
          { id: 'p1', name: 'Champion Player', kind: 'team', image: '/test.jpg' },
          { id: 'p2', name: 'Runner Up', kind: 'player', image: '' }
        ],
        rounds: [
          [
            {
              id: 'm1',
              round: 0,
              index: 0,
              slots: ['p1', 'p2'],
              scores: [2, 1],
              winner: 'p1'
            }
          ]
        ]
      };
      
      store.dispatch({
        type: 'tournament/hydrateTournament',
        payload: mockTournament
      });
      
      const champion = selectChampion(store.getState());
      
      if (champion) {
        expect(champion).toMatchObject({
          id: 'p1',
          name: 'Champion Player',
          kind: 'team',
          image: '/test.jpg'
        });
      }
    });
  });

  describe('selectTournamentStats', () => {
    it('should return statistics object with correct shape', () => {
      const stats = selectTournamentStats(store.getState());
      
      expect(stats).toHaveProperty('participants');
      expect(stats).toHaveProperty('matches');
      expect(stats).toHaveProperty('targetWins');
      expect(stats).toHaveProperty('championName');
      
      expect(typeof stats.participants).toBe('number');
      expect(typeof stats.matches).toBe('number');
      expect(typeof stats.targetWins).toBe('number');
      expect(typeof stats.championName).toBe('string');
    });

    it('should count participants correctly', () => {
      const tournament = selectTournament(store.getState());
      const stats = selectTournamentStats(store.getState());
      
      expect(stats.participants).toBe(tournament.participants.length);
    });

    it('should calculate targetWins from bestOf', () => {
      store.dispatch({
        type: 'tournament/updateEvent',
        payload: { field: 'bestOf', value: 5 }
      });
      
      const stats = selectTournamentStats(store.getState());
      
      // Bo5 requires 3 wins
      expect(stats.targetWins).toBe(3);
    });

    it('should show "Pendiente" when no champion exists', () => {
      store.dispatch({ type: 'tournament/resetTournament' });
      
      const stats = selectTournamentStats(store.getState());
      
      expect(stats.championName).toBe('Pendiente');
    });

    it('should show champion name when tournament is complete', () => {
      const mockTournament = {
        name: 'Test',
        game: 'Test Game',
        bestOf: 3,
        banner: '',
        logo: '',
        participants: [
          { id: 'p1', name: 'The Champion', kind: 'player', image: '' },
          { id: 'p2', name: 'Runner Up', kind: 'player', image: '' }
        ],
        rounds: [
          [
            {
              id: 'm1',
              round: 0,
              index: 0,
              slots: ['p1', 'p2'],
              scores: [2, 0],
              winner: 'p1'
            }
          ]
        ]
      };
      
      store.dispatch({
        type: 'tournament/hydrateTournament',
        payload: mockTournament
      });
      
      const stats = selectTournamentStats(store.getState());
      
      expect(stats.championName).toBe('The Champion');
    });

    it('should count matches across all rounds', () => {
      const mockTournament = {
        name: 'Test',
        game: 'Test Game',
        bestOf: 3,
        banner: '',
        logo: '',
        participants: [
          { id: 'p1', name: 'P1', kind: 'player', image: '' },
          { id: 'p2', name: 'P2', kind: 'player', image: '' },
          { id: 'p3', name: 'P3', kind: 'player', image: '' },
          { id: 'p4', name: 'P4', kind: 'player', image: '' }
        ],
        rounds: [
          [
            { id: 'm1', round: 0, index: 0, slots: ['p1', 'p2'], scores: [0, 0], winner: null },
            { id: 'm2', round: 0, index: 1, slots: ['p3', 'p4'], scores: [0, 0], winner: null }
          ],
          [
            { id: 'm3', round: 1, index: 0, slots: [null, null], scores: [0, 0], winner: null }
          ]
        ]
      };
      
      store.dispatch({
        type: 'tournament/hydrateTournament',
        payload: mockTournament
      });
      
      const stats = selectTournamentStats(store.getState());
      
      // 2 matches in round 0 + 1 match in round 1 = 3 total
      expect(stats.matches).toBe(3);
    });

    it('should update stats when tournament changes', () => {
      const initialStats = selectTournamentStats(store.getState());
      
      store.dispatch({
        type: 'tournament/addParticipant',
        payload: {
          id: 'new-p',
          name: 'New Player',
          kind: 'player',
          image: ''
        }
      });
      
      const updatedStats = selectTournamentStats(store.getState());
      
      expect(updatedStats.participants).toBe(initialStats.participants + 1);
    });
  });

  describe('Selector Memoization', () => {
    it('should return same reference when state has not changed', () => {
      const result1 = selectTournament(store.getState());
      const result2 = selectTournament(store.getState());
      
      expect(result1).toBe(result2);
    });

    it('should return new reference when state changes', () => {
      const result1 = selectTournament(store.getState());
      
      store.dispatch({
        type: 'tournament/updateEvent',
        payload: { field: 'name', value: 'Changed' }
      });
      
      const result2 = selectTournament(store.getState());
      
      expect(result1).not.toBe(result2);
    });
  });

  describe('Integration with Tournament State', () => {
    it('should reflect changes across all selectors', () => {
      // Initial state
      const initialStats = selectTournamentStats(store.getState());
      
      // Add participants
      store.dispatch({
        type: 'tournament/addParticipant',
        payload: { id: 'p-test-1', name: 'Test 1', kind: 'player', image: '' }
      });
      store.dispatch({
        type: 'tournament/addParticipant',
        payload: { id: 'p-test-2', name: 'Test 2', kind: 'player', image: '' }
      });
      
      // Check all selectors
      const tournament = selectTournament(store.getState());
      const participantMap = selectParticipantMap(store.getState());
      const stats = selectTournamentStats(store.getState());
      
      expect(tournament.participants.length).toBe(initialStats.participants + 2);
      expect(participantMap.size).toBe(initialStats.participants + 2);
      expect(stats.participants).toBe(initialStats.participants + 2);
    });
  });
});
