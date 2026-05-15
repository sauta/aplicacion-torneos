import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ParticipantsEditor } from '../ParticipantsEditor';
import tournamentReducer from '../../features/tournament/tournamentSlice';
import { defaultTournament } from '../../features/tournament/defaultTournament';
import * as tournamentApi from '../../services/tournamentApi';
import * as bracketEngine from '../../features/tournament/bracketEngine';

// Mock parcial de uploadImage, manteniendo las funciones reales que necesita tournamentSlice
vi.mock('../../services/tournamentApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    uploadImage: vi.fn()
  };
});

// Mock de hasScores
vi.mock('../../features/tournament/bracketEngine', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    hasScores: vi.fn(() => false)
  };
});

// Helper para renderizar con Redux
function renderWithStore(initialState = defaultTournament) {
  const store = configureStore({
    reducer: { tournament: tournamentReducer },
    preloadedState: { tournament: initialState }
  });

  const notify = vi.fn();

  const rendered = render(
    <Provider store={store}>
      <ParticipantsEditor notify={notify} />
    </Provider>
  );

  return { ...rendered, store, notify };
}

// Helper para crear un torneo sin los participantes por defecto
function createEmptyTournament() {
  return {
    ...defaultTournament,
    participants: []
  };
}

// Helper para crear un torneo con participantes
function createTournamentWithParticipants(count = 3) {
  return {
    ...defaultTournament,
    participants: Array.from({ length: count }, (_, i) => ({
      id: `p-${i + 1}`,
      name: `Player ${i + 1}`,
      kind: 'player',
      image: ''
    }))
  };
}

describe('ParticipantsEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  describe('Rendering', () => {
    it('should render the form to add participants', () => {
      renderWithStore();

      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/imagen/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /agregar participante/i })).toBeInTheDocument();
    });

    it('should show empty state when no participants', () => {
      renderWithStore(createEmptyTournament());

      expect(screen.getByText(/sin participantes/i)).toBeInTheDocument();
    });

    it('should render participant list when participants exist', () => {
      const tournament = createTournamentWithParticipants(3);
      renderWithStore(tournament);

      expect(screen.getByDisplayValue('Player 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Player 2')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Player 3')).toBeInTheDocument();
      expect(screen.queryByText(/sin participantes/i)).not.toBeInTheDocument();
    });

    it('should have semantic heading', () => {
      renderWithStore();

      const heading = screen.getByText('Participantes');
      expect(heading.tagName).toBe('H2');
    });
  });

  describe('Add Participant', () => {
    it('should add a participant when form is submitted', async () => {
      const { notify, store } = renderWithStore(createEmptyTournament());
      const user = userEvent.setup();

      const nameInput = screen.getByLabelText(/nombre/i);
      await user.type(nameInput, 'New Player');

      const submitButton = screen.getByRole('button', { name: /agregar participante/i });
      await user.click(submitButton);

      expect(notify).toHaveBeenCalledWith('Participante agregado');
      expect(store.getState().tournament.participants).toHaveLength(1);
      expect(store.getState().tournament.participants[0].name).toBe('New Player');
    });

    it('should default to "player" kind', async () => {
      const { store } = renderWithStore(createEmptyTournament());
      const user = userEvent.setup();

      const nameInput = screen.getByLabelText(/nombre/i);
      await user.type(nameInput, 'Test Player');

      const submitButton = screen.getByRole('button', { name: /agregar participante/i });
      await user.click(submitButton);

      expect(store.getState().tournament.participants[0].kind).toBe('player');
    });

    it('should add a team when kind is changed', async () => {
      const { store } = renderWithStore(createEmptyTournament());
      const user = userEvent.setup();

      const nameInput = screen.getByLabelText(/nombre/i);
      await user.type(nameInput, 'Team Alpha');

      const kindSelect = screen.getByLabelText(/tipo/i);
      await user.selectOptions(kindSelect, 'team');

      const submitButton = screen.getByRole('button', { name: /agregar participante/i });
      await user.click(submitButton);

      expect(store.getState().tournament.participants[0].kind).toBe('team');
      expect(store.getState().tournament.participants[0].name).toBe('Team Alpha');
    });

    it('should reset form after adding participant', async () => {
      renderWithStore(createEmptyTournament());
      const user = userEvent.setup();

      const nameInput = screen.getByLabelText(/nombre/i);
      await user.type(nameInput, 'Player X');

      const submitButton = screen.getByRole('button', { name: /agregar participante/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(nameInput).toHaveValue('');
      });
    });

    it('should show warning if name is empty', async () => {
      const { notify } = renderWithStore(createEmptyTournament());
      const user = userEvent.setup();

      // Disparar submit directamente en el form (evita validación HTML5 de jsdom)
      const form = screen.getByRole('button', { name: /agregar participante/i }).closest('form');
      fireEvent.submit(form);

      expect(notify).toHaveBeenCalledWith('Ingresa un nombre', 'warning');
    });

    it('should trim whitespace from name', async () => {
      const { notify, store } = renderWithStore(createEmptyTournament());
      const user = userEvent.setup();

      const nameInput = screen.getByLabelText(/nombre/i);
      await user.type(nameInput, '   ');

      const submitButton = screen.getByRole('button', { name: /agregar participante/i });
      await user.click(submitButton);

      expect(notify).toHaveBeenCalledWith('Ingresa un nombre', 'warning');
      expect(store.getState().tournament.participants).toHaveLength(0);
    });

    it('should upload image before adding participant', async () => {
      tournamentApi.uploadImage.mockResolvedValue('http://localhost/uploads/test.jpg');
      const { notify, store } = renderWithStore(createEmptyTournament());
      const user = userEvent.setup();

      const nameInput = screen.getByLabelText(/nombre/i);
      await user.type(nameInput, 'Player with Image');

      const imageInput = screen.getByLabelText(/imagen/i);
      const file = new File(['image'], 'avatar.jpg', { type: 'image/jpeg' });
      await user.upload(imageInput, file);

      await waitFor(() => {
        expect(notify).toHaveBeenCalledWith('Imagen cargada');
      });

      const submitButton = screen.getByRole('button', { name: /agregar participante/i });
      await user.click(submitButton);

      expect(store.getState().tournament.participants[0].image).toBe('http://localhost/uploads/test.jpg');
    });

    it('should handle image upload errors', async () => {
      tournamentApi.uploadImage.mockRejectedValue(new Error('Upload failed'));
      const { notify } = renderWithStore(createEmptyTournament());
      const user = userEvent.setup();

      const imageInput = screen.getByLabelText(/imagen/i);
      const file = new File(['image'], 'avatar.jpg', { type: 'image/jpeg' });
      await user.upload(imageInput, file);

      await waitFor(() => {
        expect(notify).toHaveBeenCalledWith('No se pudo subir la imagen', 'error');
      });
    });
  });

  describe('Edit Participant', () => {
    it('should update participant name', async () => {
      const tournament = createTournamentWithParticipants(1);
      const { store } = renderWithStore(tournament);
      const user = userEvent.setup();

      const nameInput = screen.getByDisplayValue('Player 1');
      await user.tripleClick(nameInput);
      await user.type(nameInput, 'Updated Player');

      await waitFor(() => {
        expect(store.getState().tournament.participants[0].name).toBe('Updated Player');
      });
    });

    it('should update participant kind', async () => {
      const tournament = createTournamentWithParticipants(1);
      const { store } = renderWithStore(tournament);
      const user = userEvent.setup();

      // Buscar el select del participante (el del formulario tiene ID, el del participante no)
      const participantCard = screen.getByDisplayValue('Player 1').closest('article');
      const kindSelect = within(participantCard).getByRole('combobox');
      
      await user.selectOptions(kindSelect, 'team');

      await waitFor(() => {
        expect(store.getState().tournament.participants[0].kind).toBe('team');
      });
    });

    it('should update participant image', async () => {
      tournamentApi.uploadImage.mockResolvedValue('http://localhost/uploads/new.jpg');
      const tournament = createTournamentWithParticipants(1);
      const { notify, store } = renderWithStore(tournament);
      const user = userEvent.setup();

      // Buscar el botón de imagen (🖼️) del primer participante
      const participantCard = screen.getByDisplayValue('Player 1').closest('article');
      const imageButton = within(participantCard).getByTitle(/agregar imagen/i);
      const imageInput = imageButton.querySelector('input[type="file"]');

      const file = new File(['image'], 'new-avatar.jpg', { type: 'image/jpeg' });
      await user.upload(imageInput, file);

      await waitFor(() => {
        expect(notify).toHaveBeenCalledWith('Imagen actualizada');
      });

      expect(store.getState().tournament.participants[0].image).toBe('http://localhost/uploads/new.jpg');
    });

    it('should remove participant image', async () => {
      const tournament = createTournamentWithParticipants(1);
      tournament.participants[0].image = 'http://localhost/uploads/old.jpg';
      const { notify, store } = renderWithStore(tournament);
      const user = userEvent.setup();

      const participantCard = screen.getByDisplayValue('Player 1').closest('article');
      const removeImageButton = within(participantCard).getByTitle(/quitar imagen/i);

      await user.click(removeImageButton);

      expect(notify).toHaveBeenCalledWith('Imagen quitada');
      expect(store.getState().tournament.participants[0].image).toBe('');
    });
  });

  describe('Remove Participant', () => {
    it('should remove participant when delete button is clicked', async () => {
      const tournament = createTournamentWithParticipants(2);
      const { notify, store } = renderWithStore(tournament);
      const user = userEvent.setup();

      const participantCard = screen.getByDisplayValue('Player 1').closest('article');
      const deleteButton = within(participantCard).getByTitle(/eliminar participante/i);

      await user.click(deleteButton);

      expect(notify).toHaveBeenCalledWith('Participante eliminado');
      expect(store.getState().tournament.participants).toHaveLength(1);
      expect(store.getState().tournament.participants[0].name).toBe('Player 2');
    });

    it('should ask for confirmation if tournament has scores', async () => {
      bracketEngine.hasScores.mockReturnValue(true);
      window.confirm.mockReturnValue(false);
      const tournament = createTournamentWithParticipants(1);
      const { notify, store } = renderWithStore(tournament);
      const user = userEvent.setup();

      const deleteButton = screen.getByTitle(/eliminar participante/i);
      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(notify).not.toHaveBeenCalled();
      expect(store.getState().tournament.participants).toHaveLength(1);
    });

    it('should remove participant if user confirms and has scores', async () => {
      bracketEngine.hasScores.mockReturnValue(true);
      window.confirm.mockReturnValue(true);
      const tournament = createTournamentWithParticipants(1);
      const { notify, store } = renderWithStore(tournament);
      const user = userEvent.setup();

      const deleteButton = screen.getByTitle(/eliminar participante/i);
      await user.click(deleteButton);

      expect(notify).toHaveBeenCalledWith('Participante eliminado');
      expect(store.getState().tournament.participants).toHaveLength(0);
    });
  });

  describe('Reorder Participants (Buttons)', () => {
    it('should have up/down buttons for each participant', () => {
      const tournament = createTournamentWithParticipants(2);
      renderWithStore(tournament);

      const upButtons = screen.getAllByTitle(/subir/i);
      const downButtons = screen.getAllByTitle(/bajar/i);

      expect(upButtons).toHaveLength(2);
      expect(downButtons).toHaveLength(2);
    });

    it('should disable up button for first participant', () => {
      const tournament = createTournamentWithParticipants(2);
      renderWithStore(tournament);

      const firstCard = screen.getByDisplayValue('Player 1').closest('article');
      const upButton = within(firstCard).getByTitle(/subir/i);

      expect(upButton).toBeDisabled();
    });

    it('should disable down button for last participant', () => {
      const tournament = createTournamentWithParticipants(2);
      renderWithStore(tournament);

      const lastCard = screen.getByDisplayValue('Player 2').closest('article');
      const downButton = within(lastCard).getByTitle(/bajar/i);

      expect(downButton).toBeDisabled();
    });

    it('should move participant up', async () => {
      const tournament = createTournamentWithParticipants(3);
      const { notify, store } = renderWithStore(tournament);
      const user = userEvent.setup();

      const secondCard = screen.getByDisplayValue('Player 2').closest('article');
      const upButton = within(secondCard).getByTitle(/subir/i);

      await user.click(upButton);

      expect(notify).toHaveBeenCalledWith('Participante subido');
      const participants = store.getState().tournament.participants;
      expect(participants[0].name).toBe('Player 2');
      expect(participants[1].name).toBe('Player 1');
    });

    it('should move participant down', async () => {
      const tournament = createTournamentWithParticipants(3);
      const { notify, store } = renderWithStore(tournament);
      const user = userEvent.setup();

      const firstCard = screen.getByDisplayValue('Player 1').closest('article');
      const downButton = within(firstCard).getByTitle(/bajar/i);

      await user.click(downButton);

      expect(notify).toHaveBeenCalledWith('Participante bajado');
      const participants = store.getState().tournament.participants;
      expect(participants[0].name).toBe('Player 2');
      expect(participants[1].name).toBe('Player 1');
    });

    it('should ask confirmation before reordering if has scores', async () => {
      bracketEngine.hasScores.mockReturnValue(true);
      window.confirm.mockReturnValue(false);
      const tournament = createTournamentWithParticipants(2);
      const { notify, store } = renderWithStore(tournament);
      const user = userEvent.setup();

      const firstCard = screen.getByDisplayValue('Player 1').closest('article');
      const downButton = within(firstCard).getByTitle(/bajar/i);

      await user.click(downButton);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Cambiar el orden reiniciara los resultados')
      );
      expect(notify).not.toHaveBeenCalled();
      // Orden no cambia
      expect(store.getState().tournament.participants[0].name).toBe('Player 1');
    });
  });

  describe('Drag and Drop', () => {
    it('should set draggable attribute on participant cards', () => {
      const tournament = createTournamentWithParticipants(2);
      renderWithStore(tournament);

      const cards = screen.getAllByRole('article');
      cards.forEach(card => {
        expect(card).toHaveAttribute('draggable', 'true');
      });
    });

    it('should apply "is-dragging" class when dragging', async () => {
      const tournament = createTournamentWithParticipants(2);
      renderWithStore(tournament);

      const firstCard = screen.getByDisplayValue('Player 1').closest('article');

      // Simular dragStart
      const dragStartEvent = new Event('dragstart', { bubbles: true });
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: { effectAllowed: '', setData: vi.fn() }
      });
      firstCard.dispatchEvent(dragStartEvent);

      await waitFor(() => {
        expect(firstCard).toHaveClass('is-dragging');
      });
    });

    it('should reorder on drop', async () => {
      const tournament = createTournamentWithParticipants(3);
      const { notify, store } = renderWithStore(tournament);

      const firstCard = screen.getByDisplayValue('Player 1').closest('article');
      const thirdCard = screen.getByDisplayValue('Player 3').closest('article');

      // Simular drag de Player 1 usando fireEvent (ejecuta handlers de React)
      const dragStartData = { effectAllowed: '', data: {}, setData(type, val) { this.data[type] = val; } };
      fireEvent.dragStart(firstCard, { dataTransfer: dragStartData });

      // Simular dragOver (necesario para permitir drop)
      fireEvent.dragOver(thirdCard, { dataTransfer: dragStartData });

      // Simular drop en Player 3
      fireEvent.drop(thirdCard, { dataTransfer: dragStartData });

      await waitFor(() => {
        expect(notify).toHaveBeenCalledWith('Orden actualizado');
      });

      const participants = store.getState().tournament.participants;
      // Player 1 debería moverse después de Player 2 (antes de Player 3 original)
      expect(participants[0].name).toBe('Player 2');
      expect(participants[1].name).toBe('Player 1');
      expect(participants[2].name).toBe('Player 3');
    });

    it('should remove is-dragging class on dragEnd', async () => {
      const tournament = createTournamentWithParticipants(1);
      renderWithStore(tournament);

      const card = screen.getByDisplayValue('Player 1').closest('article');

      // Simular dragStart
      const dragStartEvent = new Event('dragstart', { bubbles: true });
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: { effectAllowed: '', setData: vi.fn() }
      });
      card.dispatchEvent(dragStartEvent);

      await waitFor(() => {
        expect(card).toHaveClass('is-dragging');
      });

      // Simular dragEnd
      const dragEndEvent = new Event('dragend', { bubbles: true });
      card.dispatchEvent(dragEndEvent);

      await waitFor(() => {
        expect(card).not.toHaveClass('is-dragging');
      });
    });

    it('should not reorder if dropping on same card', async () => {
      const tournament = createTournamentWithParticipants(2);
      const { notify } = renderWithStore(tournament);

      const firstCard = screen.getByDisplayValue('Player 1').closest('article');

      // Simular drag
      const dragStartEvent = new Event('dragstart', { bubbles: true });
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: { effectAllowed: '', setData: vi.fn() }
      });
      firstCard.dispatchEvent(dragStartEvent);

      // Drop en el mismo card
      const dropEvent = new Event('drop', { bubbles: true });
      firstCard.dispatchEvent(dropEvent);

      // No debería haber notificación de reorden
      expect(notify).not.toHaveBeenCalledWith('Orden actualizado');
    });
  });

  describe('Edge Cases', () => {
    it('should handle participant with very long name', async () => {
      const { store } = renderWithStore(createEmptyTournament());
      const user = userEvent.setup();

      const longName = 'A'.repeat(200);
      const nameInput = screen.getByLabelText(/nombre/i);
      await user.type(nameInput, longName);

      const submitButton = screen.getByRole('button', { name: /agregar participante/i });
      await user.click(submitButton);

      expect(store.getState().tournament.participants[0].name).toBe(longName);
    });

    it('should handle special characters in name', async () => {
      const { store } = renderWithStore(createEmptyTournament());
      const user = userEvent.setup();

      const specialName = 'Player "The Beast" O\'Brien <script>';
      const nameInput = screen.getByLabelText(/nombre/i);
      await user.type(nameInput, specialName);

      const submitButton = screen.getByRole('button', { name: /agregar participante/i });
      await user.click(submitButton);

      expect(store.getState().tournament.participants[0].name).toBe(specialName);
    });

    it('should handle 100+ participants', async () => {
      const tournament = createTournamentWithParticipants(100);
      const { container } = renderWithStore(tournament);

      const cards = container.querySelectorAll('.participant-card');
      expect(cards).toHaveLength(100);
    });

    it('should handle missing image file on update', async () => {
      const tournament = createTournamentWithParticipants(1);
      const { notify } = renderWithStore(tournament);

      const participantCard = screen.getByDisplayValue('Player 1').closest('article');
      const imageButton = within(participantCard).getByTitle(/agregar imagen/i);
      const imageInput = imageButton.querySelector('input[type="file"]');

      // Simular onChange sin archivo
      await userEvent.upload(imageInput, []);

      // No debería llamar a uploadImage ni mostrar notificación
      expect(tournamentApi.uploadImage).not.toHaveBeenCalled();
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all form inputs', () => {
      renderWithStore();

      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/imagen/i)).toBeInTheDocument();
    });

    it('should have title attributes for icon buttons', () => {
      const tournament = createTournamentWithParticipants(2);
      renderWithStore(tournament);

      expect(screen.getAllByTitle(/subir/i)[0]).toBeInTheDocument();
      expect(screen.getAllByTitle(/bajar/i)[0]).toBeInTheDocument();
      expect(screen.getAllByTitle(/agregar imagen/i)[0]).toBeInTheDocument();
      expect(screen.getAllByTitle(/quitar imagen/i)[0]).toBeInTheDocument();
      expect(screen.getAllByTitle(/eliminar participante/i)[0]).toBeInTheDocument();
    });

    it('should have required attribute on name input', () => {
      renderWithStore();

      const nameInput = screen.getByLabelText(/nombre/i);
      expect(nameInput).toBeRequired();
    });

    it('should have autocomplete off for name inputs', () => {
      const tournament = createTournamentWithParticipants(1);
      renderWithStore(tournament);

      const nameInputs = screen.getAllByDisplayValue(/player/i);
      nameInputs.forEach(input => {
        expect(input).toHaveAttribute('autocomplete', 'off');
      });
    });
  });
});
