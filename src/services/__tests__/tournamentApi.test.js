import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clone,
  normalizeTournament,
  readJsonFile,
  encodeTournament,
  decodeTournament,
  clearTournament,
  STORAGE_KEY
} from '../tournamentApi';
import { defaultTournament } from '../../features/tournament/defaultTournament';

describe('tournamentApi.js - Core Functions', () => {
  // Limpiar localStorage antes de cada test
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('clone', () => {
    it('should create a deep copy of an object', () => {
      const original = { name: 'Test', nested: { value: 42 } };
      const copy = clone(original);
      
      expect(copy).toEqual(original);
      expect(copy).not.toBe(original);
      expect(copy.nested).not.toBe(original.nested);
    });

    it('should clone arrays', () => {
      const original = [1, 2, { value: 3 }];
      const copy = clone(original);
      
      expect(copy).toEqual(original);
      expect(copy).not.toBe(original);
      expect(copy[2]).not.toBe(original[2]);
    });

    it('should handle null and undefined', () => {
      expect(clone(null)).toBe(null);
      // JSON.stringify(undefined) devuelve undefined, que no es un JSON válido
      // Así que clone(undefined) lanzará error - esto es esperado
      expect(() => clone(undefined)).toThrow();
    });

    it('should lose non-serializable values', () => {
      const original = {
        func: () => {},
        date: new Date(),
        symbol: Symbol('test')
      };
      const copy = clone(original);
      
      expect(copy.func).toBeUndefined();
      expect(typeof copy.date).toBe('string'); // Las fechas se convierten a string en JSON
    });
  });

  describe('normalizeTournament', () => {
    it('should return default tournament when source is null', () => {
      const result = normalizeTournament(null);
      
      expect(result.name).toBe('Torneo Principal');
      expect(result.game).toBe('Juego competitivo');
      expect(result.format).toBe('single-elimination');
      expect(result.bestOf).toBe(3);
    });

    it('should merge source with defaults', () => {
      const source = {
        name: 'Mi Torneo Custom',
        game: 'Counter-Strike'
      };
      const result = normalizeTournament(source);
      
      expect(result.name).toBe('Mi Torneo Custom');
      expect(result.game).toBe('Counter-Strike');
      expect(result.format).toBe('single-elimination'); // Default
      expect(result.bestOf).toBe(3); // Default
    });

    it('should trim whitespace from name and game', () => {
      const source = {
        name: '  Test Tournament  ',
        game: '  League of Legends  '
      };
      const result = normalizeTournament(source);
      
      expect(result.name).toBe('Test Tournament');
      expect(result.game).toBe('League of Legends');
    });

    it('should use default name when name is empty after trim', () => {
      const source = { name: '   ' };
      const result = normalizeTournament(source);
      
      expect(result.name).toBe('Torneo Principal');
    });

    it('should normalize bestOf to odd numbers', () => {
      expect(normalizeTournament({ bestOf: 4 }).bestOf).toBe(5);
      expect(normalizeTournament({ bestOf: 2 }).bestOf).toBe(3);
      expect(normalizeTournament({ bestOf: 7 }).bestOf).toBe(7);
    });

    it('should cap bestOf at 9', () => {
      expect(normalizeTournament({ bestOf: 15 }).bestOf).toBe(9);
      expect(normalizeTournament({ bestOf: 100 }).bestOf).toBe(9);
    });

    it('should handle invalid bestOf values', () => {
      expect(normalizeTournament({ bestOf: 'invalid' }).bestOf).toBe(3);
      expect(normalizeTournament({ bestOf: -5 }).bestOf).toBe(3);
      expect(normalizeTournament({ bestOf: 0 }).bestOf).toBe(3);
    });

    describe('Participants Normalization', () => {
      it('should normalize participant IDs', () => {
        const source = {
          participants: [
            { name: 'Player 1' }, // Sin ID
            { id: '  ', name: 'Player 2' } // ID vacío
          ]
        };
        const result = normalizeTournament(source);
        
        expect(result.participants[0].id).toBeTruthy();
        expect(result.participants[1].id).toBeTruthy();
        expect(result.participants[0].id).not.toBe(result.participants[1].id);
      });

      it('should normalize participant names', () => {
        const source = {
          participants: [
            { name: '  John Doe  ' },
            { name: '' } // Nombre vacío
          ]
        };
        const result = normalizeTournament(source);
        
        expect(result.participants[0].name).toBe('John Doe');
        expect(result.participants[1].name).toBe('Participante 2');
      });

      it('should normalize participant kind', () => {
        const source = {
          participants: [
            { name: 'Test', kind: 'team' },
            { name: 'Test 2', kind: 'player' },
            { name: 'Test 3', kind: 'invalid' },
            { name: 'Test 4' } // Sin kind
          ]
        };
        const result = normalizeTournament(source);
        
        expect(result.participants[0].kind).toBe('team');
        expect(result.participants[1].kind).toBe('player');
        expect(result.participants[2].kind).toBe('player'); // Default
        expect(result.participants[3].kind).toBe('player'); // Default
      });

      it('should normalize participant images', () => {
        const source = {
          participants: [
            { name: 'Test', image: '/uploads/test.jpg' },
            { name: 'Test 2', image: null },
            { name: 'Test 3' } // Sin image
          ]
        };
        const result = normalizeTournament(source);
        
        expect(result.participants[0].image).toBe('/uploads/test.jpg');
        expect(result.participants[1].image).toBe('');
        expect(result.participants[2].image).toBe('');
      });

      it('should handle non-array participants', () => {
        const source = { participants: 'invalid' };
        const result = normalizeTournament(source);
        
        expect(result.participants).toEqual([]);
      });
    });

    describe('Rounds/Matches Normalization', () => {
      it('should normalize match IDs', () => {
        const source = {
          participants: [
            { id: 'p1', name: 'Player 1' },
            { id: 'p2', name: 'Player 2' }
          ],
          rounds: [
            [
              { slots: ['p1', 'p2'], scores: [0, 0] } // Sin ID
            ]
          ]
        };
        const result = normalizeTournament(source);
        
        expect(result.rounds[0][0].id).toBeTruthy();
      });

      it('should clamp scores to non-negative integers', () => {
        const source = {
          participants: [
            { id: 'p1', name: 'Player 1' },
            { id: 'p2', name: 'Player 2' }
          ],
          rounds: [
            [
              {
                slots: ['p1', 'p2'],
                scores: [-5, 'invalid'],
                winner: null
              }
            ]
          ]
        };
        const result = normalizeTournament(source);
        
        expect(result.rounds[0][0].scores).toEqual([0, 0]);
      });

      it('should limit slots to exactly 2 elements', () => {
        const source = {
          participants: [
            { id: 'p1', name: 'P1' },
            { id: 'p2', name: 'P2' },
            { id: 'p3', name: 'P3' }
          ],
          rounds: [
            [
              {
                slots: ['p1', 'p2', 'p3'], // Más de 2 slots
                scores: [0, 0]
              }
            ]
          ]
        };
        const result = normalizeTournament(source);
        
        expect(result.rounds[0][0].slots).toHaveLength(2);
        expect(result.rounds[0][0].slots).toEqual(['p1', 'p2']);
      });

      it('should fill missing slots with null', () => {
        const source = {
          participants: [
            { id: 'p1', name: 'Player 1' }
          ],
          rounds: [
            [
              {
                slots: ['p1'], // Solo 1 slot
                scores: [0, 0]
              }
            ]
          ]
        };
        const result = normalizeTournament(source);
        
        expect(result.rounds[0][0].slots).toEqual(['p1', null]);
      });

      it('should build bracket when rounds are empty and participants >= 2', () => {
        const source = {
          participants: [
            { id: 'p1', name: 'Player 1' },
            { id: 'p2', name: 'Player 2' },
            { id: 'p3', name: 'Player 3' },
            { id: 'p4', name: 'Player 4' }
          ],
          rounds: []
        };
        const result = normalizeTournament(source);
        
        expect(result.rounds.length).toBeGreaterThan(0);
        expect(Array.isArray(result.rounds[0])).toBe(true);
      });

      it('should not build bracket with less than 2 participants', () => {
        const source = {
          participants: [
            { id: 'p1', name: 'Player 1' }
          ],
          rounds: []
        };
        const result = normalizeTournament(source);
        
        expect(result.rounds).toEqual([]);
      });
    });

    describe('Banner and Logo', () => {
      it('should preserve valid banner and logo strings', () => {
        const source = {
          banner: '/uploads/banner.jpg',
          logo: '/uploads/logo.png'
        };
        const result = normalizeTournament(source);
        
        expect(result.banner).toBe('/uploads/banner.jpg');
        expect(result.logo).toBe('/uploads/logo.png');
      });

      it('should convert non-string banner/logo to empty string', () => {
        const source = {
          banner: null,
          logo: 123
        };
        const result = normalizeTournament(source);
        
        expect(result.banner).toBe('');
        expect(result.logo).toBe('');
      });
    });
  });

  describe('clearTournament', () => {
    it('should remove tournament from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ test: 'data' }));
      expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
      
      clearTournament();
      
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should not throw when localStorage is empty', () => {
      expect(() => clearTournament()).not.toThrow();
    });
  });

  describe('readJsonFile', () => {
    it('should read and normalize JSON from file', async () => {
      const jsonContent = JSON.stringify({
        name: 'Test Tournament',
        game: 'Test Game'
      });
      
      const file = new File([jsonContent], 'tournament.json', {
        type: 'application/json'
      });
      
      const result = await readJsonFile(file);
      
      expect(result.name).toBe('Test Tournament');
      expect(result.game).toBe('Test Game');
      expect(result.format).toBe('single-elimination'); // Normalizado
    });

    it('should reject on invalid JSON', async () => {
      const file = new File(['invalid json {'], 'tournament.json', {
        type: 'application/json'
      });
      
      await expect(readJsonFile(file)).rejects.toThrow();
    });

    it('should handle empty file', async () => {
      const file = new File([''], 'tournament.json', {
        type: 'application/json'
      });
      
      // Debería usar {} como fallback y normalizar al default
      const result = await readJsonFile(file);
      expect(result.name).toBe('Torneo Principal');
    });
  });

  describe('encodeTournament & decodeTournament', () => {
    it('should encode and decode tournament correctly', () => {
      const original = {
        name: 'Test Tournament',
        game: 'Rocket League',
        participants: [
          { id: 'p1', name: 'Player 1', kind: 'player', image: '' }
        ]
      };
      
      const encoded = encodeTournament(original);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      
      const decoded = decodeTournament(encoded);
      expect(decoded.name).toBe('Test Tournament');
      expect(decoded.game).toBe('Rocket League');
      expect(decoded.participants).toHaveLength(1);
    });

    it('should handle unicode characters', () => {
      const original = {
        name: 'Torneo Español ñáéíóú',
        game: '日本語 テスト'
      };
      
      const encoded = encodeTournament(original);
      const decoded = decodeTournament(encoded);
      
      expect(decoded.name).toBe('Torneo Español ñáéíóú');
      expect(decoded.game).toBe('日本語 テスト');
    });

    it('should handle empty tournament', () => {
      const original = {};
      
      const encoded = encodeTournament(original);
      const decoded = decodeTournament(encoded);
      
      // Debería normalizar a los defaults
      expect(decoded.name).toBe('Torneo Principal');
      expect(decoded.format).toBe('single-elimination');
    });

    it('should handle large tournaments', () => {
      const original = {
        name: 'Large Tournament',
        participants: Array.from({ length: 128 }, (_, i) => ({
          id: `p${i}`,
          name: `Player ${i}`,
          kind: 'player',
          image: ''
        }))
      };
      
      const encoded = encodeTournament(original);
      const decoded = decodeTournament(encoded);
      
      expect(decoded.participants).toHaveLength(128);
      expect(decoded.participants[0].name).toBe('Player 0');
      expect(decoded.participants[127].name).toBe('Player 127');
    });

    it('decodeTournament should handle URL-encoded input', () => {
      const original = { name: 'Test with spaces' };
      const encoded = encodeURIComponent(encodeTournament(original));
      
      const decoded = decodeTournament(encoded);
      expect(decoded.name).toBe('Test with spaces');
    });
  });

  describe('Integration: Full Tournament Lifecycle', () => {
    it('should normalize → encode → decode → normalize consistently', () => {
      const input = {
        name: '  My Tournament  ',
        bestOf: 4, // Será normalizado a 5
        participants: [
          { name: 'Player 1' }, // Sin ID
          { id: 'p2', name: '  Player 2  ', kind: 'team' }
        ]
      };
      
      const normalized1 = normalizeTournament(input);
      const encoded = encodeTournament(normalized1);
      const decoded = decodeTournament(encoded);
      const normalized2 = normalizeTournament(decoded);
      
      expect(normalized2.name).toBe('My Tournament');
      expect(normalized2.bestOf).toBe(5);
      expect(normalized2.participants[0].id).toBeTruthy();
      expect(normalized2.participants[1].name).toBe('Player 2');
      expect(normalized2.participants[1].kind).toBe('team');
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('normalizeTournament should handle circular references gracefully', () => {
      const circular = { name: 'Test' };
      circular.self = circular;
      
      // normalizeTournament internamente usa clone() que usa JSON.stringify
      // con referencias circulares, JSON.stringify lanza TypeError
      // Pero normalizeTournament lo atrapa con el spread operator ...
      // Así que en realidad NO lanza error, simplemente ignora la propiedad circular
      const result = normalizeTournament(circular);
      
      // Verifica que devuelve un torneo normalizado sin la referencia circular
      expect(result).toBeDefined();
      expect(result.name).toBe('Test');
      expect(result.format).toBe('single-elimination');
    });

    it('normalizeTournament should handle very long names', () => {
      const longName = 'A'.repeat(10000);
      const result = normalizeTournament({ name: longName });
      
      expect(result.name).toBe(longName);
    });

    it('normalizeTournament should handle special characters in names', () => {
      const source = {
        name: '<script>alert("xss")</script>',
        game: 'Test & "Quotes"'
      };
      const result = normalizeTournament(source);
      
      // normalizeTournament no sanitiza HTML (eso es responsabilidad de escapeHtml)
      expect(result.name).toBe('<script>alert("xss")</script>');
      expect(result.game).toBe('Test & "Quotes"');
    });
  });
});
