import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createId,
  normalizeBestOf,
  winsNeeded,
  nextPowerOfTwo,
  buildBracket,
  recalculateBracket,
  setMatchScore,
  hasScores,
  countMatches,
  getChampionId
} from '../bracketEngine';

describe('bracketEngine - Utility Functions', () => {
  describe('createId', () => {
    it('should create an ID with the given prefix', () => {
      const id = createId('test');
      expect(id).toMatch(/^test-/);
    });

    it('should use "id" as default prefix', () => {
      const id = createId();
      expect(id).toMatch(/^id-/);
    });

    it('should create unique IDs', () => {
      const id1 = createId('p');
      const id2 = createId('p');
      expect(id1).not.toBe(id2);
    });
  });

  describe('normalizeBestOf', () => {
    it('should return 3 for invalid inputs', () => {
      expect(normalizeBestOf(null)).toBe(3);
      expect(normalizeBestOf(undefined)).toBe(3);
      expect(normalizeBestOf('invalid')).toBe(3);
      expect(normalizeBestOf(0)).toBe(3);
      expect(normalizeBestOf(-5)).toBe(3);
    });

    it('should convert even numbers to next odd number', () => {
      expect(normalizeBestOf(2)).toBe(3);
      expect(normalizeBestOf(4)).toBe(5);
      expect(normalizeBestOf(6)).toBe(7);
    });

    it('should keep odd numbers unchanged', () => {
      expect(normalizeBestOf(3)).toBe(3);
      expect(normalizeBestOf(5)).toBe(5);
      expect(normalizeBestOf(7)).toBe(7);
    });

    it('should cap at maximum value of 9', () => {
      expect(normalizeBestOf(10)).toBe(9);
      expect(normalizeBestOf(15)).toBe(9);
      expect(normalizeBestOf(100)).toBe(9);
    });

    it('should handle string inputs', () => {
      expect(normalizeBestOf('3')).toBe(3);
      expect(normalizeBestOf('5')).toBe(5);
    });
  });

  describe('winsNeeded', () => {
    it('should calculate wins needed correctly for Bo3', () => {
      expect(winsNeeded(3)).toBe(2);
    });

    it('should calculate wins needed correctly for Bo5', () => {
      expect(winsNeeded(5)).toBe(3);
    });

    it('should calculate wins needed correctly for Bo7', () => {
      expect(winsNeeded(7)).toBe(4);
    });

    it('should handle invalid inputs by normalizing first', () => {
      expect(winsNeeded(4)).toBe(3); // 4 -> 5, 5/2 + 1 = 3
      expect(winsNeeded('invalid')).toBe(2); // invalid -> 3, 3/2 + 1 = 2
    });
  });

  describe('nextPowerOfTwo', () => {
    it('should return the next power of 2', () => {
      expect(nextPowerOfTwo(1)).toBe(2);
      expect(nextPowerOfTwo(2)).toBe(2);
      expect(nextPowerOfTwo(3)).toBe(4);
      expect(nextPowerOfTwo(4)).toBe(4);
      expect(nextPowerOfTwo(5)).toBe(8);
      expect(nextPowerOfTwo(8)).toBe(8);
      expect(nextPowerOfTwo(9)).toBe(16);
    });

    it('should handle invalid inputs', () => {
      expect(nextPowerOfTwo(0)).toBe(2);
      expect(nextPowerOfTwo(-5)).toBe(2);
      expect(nextPowerOfTwo(null)).toBe(2);
    });
  });
});

describe('bracketEngine - Bracket Building', () => {
  const mockParticipants = [
    { id: 'p1', name: 'Player 1' },
    { id: 'p2', name: 'Player 2' },
    { id: 'p3', name: 'Player 3' },
    { id: 'p4', name: 'Player 4' }
  ];

  describe('buildBracket', () => {
    it('should create a bracket with correct number of rounds for 4 participants', () => {
      const rounds = buildBracket(mockParticipants, 3);
      
      // 4 participants = 2 rounds (semifinals + final)
      expect(rounds).toHaveLength(2);
      expect(rounds[0]).toHaveLength(2); // 2 matches in round 1
      expect(rounds[1]).toHaveLength(1); // 1 match in final
    });

    it('should create a bracket with correct number of rounds for 8 participants', () => {
      const manyParticipants = Array.from({ length: 8 }, (_, i) => ({
        id: `p${i + 1}`,
        name: `Player ${i + 1}`
      }));
      
      const rounds = buildBracket(manyParticipants, 3);
      
      // 8 participants = 3 rounds (quarters + semis + final)
      expect(rounds).toHaveLength(3);
      expect(rounds[0]).toHaveLength(4); // 4 matches in round 1
      expect(rounds[1]).toHaveLength(2); // 2 matches in round 2
      expect(rounds[2]).toHaveLength(1); // 1 match in final
    });

    it('should assign participants to first round slots', () => {
      const rounds = buildBracket(mockParticipants, 3);
      const firstRound = rounds[0];
      
      // Con orden secuencial: distribuye BYEs al final del bracket
      expect(firstRound[0].slots).toEqual(['p1', 'p2']);
      expect(firstRound[1].slots).toEqual(['p3', 'p4']);
    });

    it('should handle odd number of participants with byes', () => {
      const threeParticipants = mockParticipants.slice(0, 3);
      const rounds = buildBracket(threeParticipants, 3);
      
      // Should still create 4-slot bracket
      expect(rounds[0]).toHaveLength(2);
      
      // One slot should be null (bye)
      const allSlots = rounds[0].flatMap(m => m.slots);
      expect(allSlots.filter(s => s === null)).toHaveLength(1);
    });

    it('should filter out participants with empty names', () => {
      const mixedParticipants = [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: '' },
        { id: 'p3', name: '   ' },
        { id: 'p4', name: 'Player 4' }
      ];
      
      const rounds = buildBracket(mixedParticipants, 3);
      const firstRound = rounds[0];
      
      // Should only include p1 and p4
      const usedIds = firstRound.flatMap(m => m.slots).filter(Boolean);
      expect(usedIds).toHaveLength(2);
      expect(usedIds).toContain('p1');
      expect(usedIds).toContain('p4');
    });

    it('should create matches with correct structure', () => {
      const rounds = buildBracket(mockParticipants, 3);
      const firstMatch = rounds[0][0];
      
      expect(firstMatch).toHaveProperty('id');
      expect(firstMatch).toHaveProperty('round', 0);
      expect(firstMatch).toHaveProperty('index', 0);
      expect(firstMatch).toHaveProperty('slots');
      expect(firstMatch).toHaveProperty('scores');
      expect(firstMatch).toHaveProperty('winner');
      expect(firstMatch.scores).toEqual([0, 0]);
      expect(firstMatch.winner).toBeNull();
    });
  });

  describe('recalculateBracket', () => {
    it('should normalize all match scores', () => {
      const tournament = {
        bestOf: 3,
        rounds: [[
          { id: 'm1', round: 0, index: 0, slots: ['p1', 'p2'], scores: [5, 10], winner: null }
        ]]
      };
      
      const result = recalculateBracket(tournament);
      
      // Bo3 max is 2 wins, invalid scores should be capped
      expect(result.rounds[0][0].scores[0]).toBeLessThanOrEqual(2);
      expect(result.rounds[0][0].scores[1]).toBeLessThanOrEqual(2);
    });

    it('should determine winner when score reaches target', () => {
      const tournament = {
        bestOf: 3,
        rounds: [[
          { id: 'm1', round: 0, index: 0, slots: ['p1', 'p2'], scores: [2, 0], winner: null }
        ]]
      };
      
      const result = recalculateBracket(tournament);
      
      expect(result.rounds[0][0].winner).toBe('p1');
    });

    it('should propagate winner to next round', () => {
      const tournament = {
        bestOf: 3,
        rounds: [
          [
            { id: 'm1', round: 0, index: 0, slots: ['p1', 'p2'], scores: [2, 0], winner: null },
            { id: 'm2', round: 0, index: 1, slots: ['p3', 'p4'], scores: [0, 2], winner: null }
          ],
          [
            { id: 'm3', round: 1, index: 0, slots: [null, null], scores: [0, 0], winner: null }
          ]
        ]
      };
      
      const result = recalculateBracket(tournament);
      
      expect(result.rounds[1][0].slots).toEqual(['p1', 'p4']);
    });

    it('should auto-advance player when opponent is null (bye)', () => {
      const tournament = {
        bestOf: 3,
        rounds: [[
          { id: 'm1', round: 0, index: 0, slots: ['p1', null], scores: [0, 0], winner: null }
        ]]
      };
      
      const result = recalculateBracket(tournament);
      
      expect(result.rounds[0][0].winner).toBe('p1');
    });

    it('should reset scores when bracket structure changes', () => {
      const tournament = {
        bestOf: 3,
        rounds: [
          [
            { id: 'm1', round: 0, index: 0, slots: ['p1', 'p2'], scores: [2, 0], winner: 'p1' }
          ],
          [
            { id: 'm2', round: 1, index: 0, slots: ['p1', 'p3'], scores: [1, 1], winner: null }
          ]
        ]
      };
      
      // Change the first match winner
      tournament.rounds[0][0].scores = [0, 2];
      
      const result = recalculateBracket(tournament);
      
      // Second round should reset because slot changed
      expect(result.rounds[1][0].scores).toEqual([0, 0]);
      expect(result.rounds[1][0].slots[0]).toBe('p2');
    });
  });

  describe('setMatchScore', () => {
    it('should update the score for the specified slot', () => {
      const tournament = {
        bestOf: 3,
        rounds: [[
          { id: 'm1', round: 0, index: 0, slots: ['p1', 'p2'], scores: [0, 0], winner: null }
        ]]
      };
      
      const result = setMatchScore(tournament, 0, 0, 0, 2);
      
      expect(result.rounds[0][0].scores[0]).toBe(2);
    });

    it('should cap scores at wins needed value', () => {
      const tournament = {
        bestOf: 3, // wins needed = 2
        rounds: [[
          { id: 'm1', round: 0, index: 0, slots: ['p1', 'p2'], scores: [0, 0], winner: null }
        ]]
      };
      
      const result = setMatchScore(tournament, 0, 0, 0, 10);
      
      expect(result.rounds[0][0].scores[0]).toBe(2);
    });

    it('should prevent both players from reaching target simultaneously', () => {
      const tournament = {
        bestOf: 3,
        rounds: [[
          { id: 'm1', round: 0, index: 0, slots: ['p1', 'p2'], scores: [2, 1], winner: null }
        ]]
      };
      
      // Try to set opponent score to 2 (both would have 2)
      const result = setMatchScore(tournament, 0, 0, 1, 2);
      
      // Other player should be capped at 1
      expect(result.rounds[0][0].scores[1]).toBe(2);
      expect(result.rounds[0][0].scores[0]).toBe(1); // p1 reduced
    });

    it('should not modify scores if match has no opponents', () => {
      const tournament = {
        bestOf: 3,
        rounds: [[
          { id: 'm1', round: 0, index: 0, slots: [null, 'p2'], scores: [0, 0], winner: null }
        ]]
      };
      
      const result = setMatchScore(tournament, 0, 0, 0, 2);
      
      // Should remain unchanged
      expect(result.rounds[0][0].scores).toEqual([0, 0]);
    });

    it('should handle negative scores by clamping to 0', () => {
      const tournament = {
        bestOf: 3,
        rounds: [[
          { id: 'm1', round: 0, index: 0, slots: ['p1', 'p2'], scores: [0, 0], winner: null }
        ]]
      };
      
      const result = setMatchScore(tournament, 0, 0, 0, -5);
      
      expect(result.rounds[0][0].scores[0]).toBe(0);
    });
  });
});

describe('bracketEngine - Tournament State', () => {
  describe('hasScores', () => {
    it('should return false for empty tournament', () => {
      expect(hasScores(null)).toBe(false);
      expect(hasScores({})).toBe(false);
      expect(hasScores({ rounds: [] })).toBe(false);
    });

    it('should return false when all scores are 0', () => {
      const tournament = {
        rounds: [[
          { scores: [0, 0] },
          { scores: [0, 0] }
        ]]
      };
      
      expect(hasScores(tournament)).toBe(false);
    });

    it('should return true when any score is greater than 0', () => {
      const tournament = {
        rounds: [[
          { scores: [0, 0] },
          { scores: [1, 0] }
        ]]
      };
      
      expect(hasScores(tournament)).toBe(true);
    });
  });

  describe('countMatches', () => {
    it('should return 0 for empty tournament', () => {
      expect(countMatches(null)).toBe(0);
      expect(countMatches({})).toBe(0);
      expect(countMatches({ rounds: [] })).toBe(0);
    });

    it('should count total matches across all rounds', () => {
      const tournament = {
        rounds: [
          [{}, {}],    // 2 matches
          [{}],        // 1 match
        ]
      };
      
      expect(countMatches(tournament)).toBe(3);
    });

    it('should handle bracket with different round sizes', () => {
      const tournament = {
        rounds: [
          [{}, {}, {}, {}],  // 4 matches
          [{}, {}],          // 2 matches
          [{}]               // 1 match
        ]
      };
      
      expect(countMatches(tournament)).toBe(7);
    });
  });

  describe('getChampionId', () => {
    it('should return null for empty tournament', () => {
      expect(getChampionId(null)).toBeNull();
      expect(getChampionId({})).toBeNull();
      expect(getChampionId({ rounds: [] })).toBeNull();
    });

    it('should return the winner of the final match', () => {
      const tournament = {
        rounds: [
          [
            { winner: 'p1' },
            { winner: 'p2' }
          ],
          [
            { winner: 'p1' }
          ]
        ]
      };
      
      expect(getChampionId(tournament)).toBe('p1');
    });

    it('should return null if final match has no winner', () => {
      const tournament = {
        rounds: [
          [{ winner: 'p1' }],
          [{ winner: null }]
        ]
      };
      
      expect(getChampionId(tournament)).toBeNull();
    });
  });
});
