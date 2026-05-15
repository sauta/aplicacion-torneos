import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MetricsGrid } from '../MetricsGrid';
import tournamentReducer, { addParticipant, updateEvent } from '../../features/tournament/tournamentSlice';

function renderWithStore(initialState = {}) {
  const store = configureStore({
    reducer: {
      tournament: tournamentReducer
    },
    preloadedState: initialState
  });

  return {
    ...render(
      <Provider store={store}>
        <MetricsGrid />
      </Provider>
    ),
    store
  };
}

describe('MetricsGrid Component', () => {
  describe('Rendering', () => {
    it('should render all metric cards', () => {
      renderWithStore();
      
      expect(screen.getByText('Participantes')).toBeInTheDocument();
      expect(screen.getByText('Partidas')).toBeInTheDocument();
      expect(screen.getByText('Para ganar')).toBeInTheDocument();
      expect(screen.getByText('Campeon')).toBeInTheDocument();
    });

    it('should have accessible section label', () => {
      const { container } = renderWithStore();
      
      const section = container.querySelector('section');
      expect(section).toHaveAttribute('aria-label', 'Resumen del torneo');
    });

    it('should render with correct CSS classes', () => {
      const { container } = renderWithStore();
      
      expect(container.querySelector('.metrics-grid')).toBeInTheDocument();
      expect(container.querySelectorAll('.metric-card')).toHaveLength(4);
    });
  });

  describe('Stats Display', () => {
    it('should display default stats from initial state', () => {
      renderWithStore();
      
      // El estado inicial tiene 4 participantes por defecto
      const participantsValue = screen.getByText('Participantes').nextElementSibling;
      expect(participantsValue).toHaveTextContent('4');
    });

    it('should display zero participants when empty', () => {
      const initialState = {
        tournament: {
          name: 'Test',
          game: 'Test',
          bestOf: 3,
          participants: [],
          rounds: []
        }
      };
      
      renderWithStore(initialState);
      
      const participantsValue = screen.getByText('Participantes').nextElementSibling;
      expect(participantsValue).toHaveTextContent('0');
    });

    it('should display correct target wins based on bestOf', () => {
      const initialState = {
        tournament: {
          name: 'Test',
          game: 'Test',
          bestOf: 5,
          participants: [],
          rounds: []
        }
      };
      
      renderWithStore(initialState);
      
      const targetWinsValue = screen.getByText('Para ganar').nextElementSibling;
      expect(targetWinsValue).toHaveTextContent('3'); // Math.ceil(5/2) = 3
    });

    it('should display champion name when available', () => {
      // Configurar estado con un campeón
      const initialState = {
        tournament: {
          name: 'Test',
          game: 'Test',
          bestOf: 3,
          participants: [
            { id: 'p1', name: 'Champion Player', kind: 'player', image: '' },
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
        }
      };
      
      renderWithStore(initialState);
      
      const championValue = screen.getByText('Campeon').nextElementSibling;
      expect(championValue).toHaveTextContent('Champion Player');
    });

    it('should display "Pendiente" when no champion', () => {
      const initialState = {
        tournament: {
          name: 'Test',
          game: 'Test',
          bestOf: 3,
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
                scores: [0, 0], // Sin ganador aún
                winner: null
              }
            ]
          ]
        }
      };
      
      renderWithStore(initialState);
      
      const championValue = screen.getByText('Campeon').nextElementSibling;
      expect(championValue).toHaveTextContent('Pendiente');
    });
  });

  describe('Stats Calculation', () => {
    it('should count total matches across all rounds', () => {
      const initialState = {
        tournament: {
          name: 'Test',
          game: 'Test',
          bestOf: 3,
          participants: [
            { id: 'p1', name: 'P1', kind: 'player', image: '' },
            { id: 'p2', name: 'P2', kind: 'player', image: '' },
            { id: 'p3', name: 'P3', kind: 'player', image: '' },
            { id: 'p4', name: 'P4', kind: 'player', image: '' }
          ],
          rounds: [
            // Ronda 1: 2 partidas (semifinales)
            [
              {
                id: 'm1',
                round: 0,
                index: 0,
                slots: ['p1', 'p2'],
                scores: [0, 0],
                winner: null
              },
              {
                id: 'm2',
                round: 0,
                index: 1,
                slots: ['p3', 'p4'],
                scores: [0, 0],
                winner: null
              }
            ],
            // Ronda 2: 1 partida (final)
            [
              {
                id: 'm3',
                round: 1,
                index: 0,
                slots: [null, null],
                scores: [0, 0],
                winner: null
              }
            ]
          ]
        }
      };
      
      renderWithStore(initialState);
      
      const matchesValue = screen.getByText('Partidas').nextElementSibling;
      expect(matchesValue).toHaveTextContent('3'); // 2 + 1 = 3 partidas totales
    });

    it('should handle different bestOf values correctly', () => {
      const testCases = [
        { bestOf: 1, expectedWins: 1 },
        { bestOf: 3, expectedWins: 2 },
        { bestOf: 5, expectedWins: 3 },
        { bestOf: 7, expectedWins: 4 },
        { bestOf: 9, expectedWins: 5 }
      ];

      testCases.forEach(({ bestOf, expectedWins }) => {
        const initialState = {
          tournament: {
            name: 'Test',
            game: 'Test',
            bestOf,
            participants: [],
            rounds: []
          }
        };

        const { unmount } = renderWithStore(initialState);
        
        const targetWinsValue = screen.getByText('Para ganar').nextElementSibling;
        expect(targetWinsValue).toHaveTextContent(String(expectedWins));
        
        unmount(); // Limpiar antes del siguiente test
      });
    });
  });

  describe('Accessibility', () => {
    it('should use semantic HTML elements', () => {
      const { container } = renderWithStore();
      
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
      
      const articles = container.querySelectorAll('article');
      expect(articles).toHaveLength(4);
      
      articles.forEach((article) => {
        expect(article.querySelector('span')).toBeInTheDocument(); // Label
        expect(article.querySelector('strong')).toBeInTheDocument(); // Value
      });
    });

    it('should have strong elements for values (semantic importance)', () => {
      renderWithStore();
      
      const strongElements = screen.getAllByRole('strong');
      expect(strongElements.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Integration with Redux', () => {
    it('should update when store changes', async () => {
      const { store } = renderWithStore();
      
      // Estado inicial
      let participantsValue = screen.getByText('Participantes').nextElementSibling;
      expect(participantsValue).toHaveTextContent('4');
      
      // Agregar un participante
      store.dispatch(addParticipant({ id: 'p-new', name: 'New Player', kind: 'player', image: '' }));
      
      // Esperar actualización de React
      await waitFor(() => {
        participantsValue = screen.getByText('Participantes').nextElementSibling;
        expect(participantsValue).toHaveTextContent('5');
      });
    });

    it('should react to bestOf changes', async () => {
      const { store } = renderWithStore();
      
      let targetWinsValue = screen.getByText('Para ganar').nextElementSibling;
      expect(targetWinsValue).toHaveTextContent('2'); // bestOf 3 → 2 wins
      
      // Cambiar bestOf a 5
      store.dispatch(updateEvent({ field: 'bestOf', value: 5 }));
      
      // Esperar actualización de React
      await waitFor(() => {
        targetWinsValue = screen.getByText('Para ganar').nextElementSibling;
        expect(targetWinsValue).toHaveTextContent('3'); // bestOf 5 → 3 wins
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large participant count', () => {
      const participants = Array.from({ length: 1000 }, (_, i) => ({
        id: `p${i}`,
        name: `Player ${i}`,
        kind: 'player',
        image: ''
      }));

      const initialState = {
        tournament: {
          name: 'Test',
          game: 'Test',
          bestOf: 3,
          participants,
          rounds: []
        }
      };

      renderWithStore(initialState);
      
      const participantsValue = screen.getByText('Participantes').nextElementSibling;
      expect(participantsValue).toHaveTextContent('1000');
    });

    it('should handle champion with special characters in name', () => {
      const initialState = {
        tournament: {
          name: 'Test',
          game: 'Test',
          bestOf: 3,
          participants: [
            { id: 'p1', name: 'Player "The Beast" O\'Brien', kind: 'player', image: '' },
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
        }
      };

      renderWithStore(initialState);
      
      const championValue = screen.getByText('Campeon').nextElementSibling;
      expect(championValue).toHaveTextContent('Player "The Beast" O\'Brien');
    });
  });
});
