import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EventEditor } from '../EventEditor';
import tournamentReducer from '../../features/tournament/tournamentSlice';
import { defaultTournament } from '../../features/tournament/defaultTournament';
import * as tournamentApi from '../../services/tournamentApi';

// Mock parcial de uploadImage, manteniendo las funciones reales que necesita tournamentSlice
vi.mock('../../services/tournamentApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    uploadImage: vi.fn()
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
      <EventEditor notify={notify} />
    </Provider>
  );

  return { ...rendered, store, notify };
}

describe('EventEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all form inputs', () => {
      renderWithStore();

      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/juego/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/formato/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/banner/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/logo/i)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      renderWithStore();

      expect(screen.getByRole('button', { name: /quitar banner/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quitar logo/i })).toBeInTheDocument();
    });

    it('should display current tournament values', () => {
      const tournament = {
        ...defaultTournament,
        name: 'Championship',
        game: 'Chess',
        bestOf: 5
      };
      renderWithStore(tournament);

      expect(screen.getByLabelText(/nombre/i)).toHaveValue('Championship');
      expect(screen.getByLabelText(/juego/i)).toHaveValue('Chess');
      expect(screen.getByLabelText(/formato/i)).toHaveValue('5');
    });

    it('should have semantic heading', () => {
      renderWithStore();

      const heading = screen.getByText('Evento');
      expect(heading.tagName).toBe('H2');
    });
  });

  describe('Update Tournament Name', () => {
    it('should update name when typing', async () => {
      const { store } = renderWithStore();
      const user = userEvent.setup();

      const nameInput = screen.getByLabelText(/nombre/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Tournament');

      await waitFor(() => {
        expect(store.getState().tournament.name).toBe('New Tournament');
      });
    });

    it('should allow empty name', async () => {
      const { store } = renderWithStore();
      const user = userEvent.setup();

      const nameInput = screen.getByLabelText(/nombre/i);
      await user.clear(nameInput);

      await waitFor(() => {
        expect(store.getState().tournament.name).toBe('');
      });
    });

    it('should handle very long names', async () => {
      const { store } = renderWithStore();
      const user = userEvent.setup();

      const longName = 'A'.repeat(200);
      const nameInput = screen.getByLabelText(/nombre/i);
      await user.clear(nameInput);
      await user.type(nameInput, longName);

      await waitFor(() => {
        expect(store.getState().tournament.name).toBe(longName);
      });
    });

    it('should handle special characters', async () => {
      const { store } = renderWithStore();
      const user = userEvent.setup();

      const specialName = 'Tournament "2025" <Finals>';
      const nameInput = screen.getByLabelText(/nombre/i);
      await user.clear(nameInput);
      await user.type(nameInput, specialName);

      await waitFor(() => {
        expect(store.getState().tournament.name).toBe(specialName);
      });
    });
  });

  describe('Update Tournament Game', () => {
    it('should update game when typing', async () => {
      const { store } = renderWithStore();
      const user = userEvent.setup();

      const gameInput = screen.getByLabelText(/juego/i);
      await user.clear(gameInput);
      await user.type(gameInput, 'League of Legends');

      await waitFor(() => {
        expect(store.getState().tournament.game).toBe('League of Legends');
      });
    });

    it('should allow empty game', async () => {
      const { store } = renderWithStore();
      const user = userEvent.setup();

      const gameInput = screen.getByLabelText(/juego/i);
      await user.clear(gameInput);

      await waitFor(() => {
        expect(store.getState().tournament.game).toBe('');
      });
    });
  });

  describe('Update BestOf Format', () => {
    it('should have all bestOf options', () => {
      renderWithStore();

      const formatSelect = screen.getByLabelText(/formato/i);
      const options = Array.from(formatSelect.options).map(opt => opt.value);

      expect(options).toEqual(['1', '3', '5', '7', '9']);
    });

    it('should update bestOf when selecting', async () => {
      const { store } = renderWithStore();
      const user = userEvent.setup();

      const formatSelect = screen.getByLabelText(/formato/i);
      await user.selectOptions(formatSelect, '7');

      await waitFor(() => {
        expect(store.getState().tournament.bestOf).toBe(7);
      });
    });

    it('should display correct option labels', () => {
      renderWithStore();

      expect(screen.getByRole('option', { name: /mejor de 1/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /mejor de 3/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /mejor de 5/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /mejor de 7/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /mejor de 9/i })).toBeInTheDocument();
    });

    it('should default to bestOf 3', () => {
      renderWithStore();

      const formatSelect = screen.getByLabelText(/formato/i);
      expect(formatSelect).toHaveValue('3');
    });
  });

  describe('Upload Banner', () => {
    it('should upload banner when file is selected', async () => {
      tournamentApi.uploadImage.mockResolvedValue('http://localhost/uploads/banner.jpg');
      const { notify, store } = renderWithStore();
      const user = userEvent.setup();

      const bannerInput = screen.getByLabelText(/banner/i);
      const file = new File(['banner'], 'banner.jpg', { type: 'image/jpeg' });

      await user.upload(bannerInput, file);

      await waitFor(() => {
        expect(tournamentApi.uploadImage).toHaveBeenCalledWith(file);
      });

      expect(notify).toHaveBeenCalledWith('Banner actualizado');
      expect(store.getState().tournament.banner).toBe('http://localhost/uploads/banner.jpg');
    });

    it('should reset input after upload', async () => {
      tournamentApi.uploadImage.mockResolvedValue('http://localhost/uploads/banner.jpg');
      renderWithStore();
      const user = userEvent.setup();

      const bannerInput = screen.getByLabelText(/banner/i);
      const file = new File(['banner'], 'banner.jpg', { type: 'image/jpeg' });

      await user.upload(bannerInput, file);

      await waitFor(() => {
        expect(bannerInput.value).toBe('');
      });
    });

    it('should handle banner upload errors', async () => {
      tournamentApi.uploadImage.mockRejectedValue(new Error('Upload failed'));
      const { notify } = renderWithStore();
      const user = userEvent.setup();

      const bannerInput = screen.getByLabelText(/banner/i);
      const file = new File(['banner'], 'banner.jpg', { type: 'image/jpeg' });

      await user.upload(bannerInput, file);

      await waitFor(() => {
        expect(notify).toHaveBeenCalledWith('No se pudo subir la imagen', 'error');
      });
    });

    it('should accept only image files', () => {
      renderWithStore();

      const bannerInput = screen.getByLabelText(/banner/i);
      expect(bannerInput).toHaveAttribute('accept', 'image/*');
    });
  });

  describe('Upload Logo', () => {
    it('should upload logo when file is selected', async () => {
      tournamentApi.uploadImage.mockResolvedValue('http://localhost/uploads/logo.png');
      const { notify, store } = renderWithStore();
      const user = userEvent.setup();

      const logoInput = screen.getByLabelText(/^logo$/i);
      const file = new File(['logo'], 'logo.png', { type: 'image/png' });

      await user.upload(logoInput, file);

      await waitFor(() => {
        expect(tournamentApi.uploadImage).toHaveBeenCalledWith(file);
      });

      expect(notify).toHaveBeenCalledWith('Logo actualizado');
      expect(store.getState().tournament.logo).toBe('http://localhost/uploads/logo.png');
    });

    it('should reset input after logo upload', async () => {
      tournamentApi.uploadImage.mockResolvedValue('http://localhost/uploads/logo.png');
      renderWithStore();
      const user = userEvent.setup();

      const logoInput = screen.getByLabelText(/^logo$/i);
      const file = new File(['logo'], 'logo.png', { type: 'image/png' });

      await user.upload(logoInput, file);

      await waitFor(() => {
        expect(logoInput.value).toBe('');
      });
    });

    it('should handle logo upload errors', async () => {
      tournamentApi.uploadImage.mockRejectedValue(new Error('Upload failed'));
      const { notify } = renderWithStore();
      const user = userEvent.setup();

      const logoInput = screen.getByLabelText(/^logo$/i);
      const file = new File(['logo'], 'logo.png', { type: 'image/png' });

      await user.upload(logoInput, file);

      await waitFor(() => {
        expect(notify).toHaveBeenCalledWith('No se pudo subir la imagen', 'error');
      });
    });

    it('should accept only image files', () => {
      renderWithStore();

      const logoInput = screen.getByLabelText(/^logo$/i);
      expect(logoInput).toHaveAttribute('accept', 'image/*');
    });
  });

  describe('Remove Banner', () => {
    it('should remove banner when button is clicked', async () => {
      const tournament = { ...defaultTournament, banner: 'http://localhost/uploads/banner.jpg' };
      const { notify, store } = renderWithStore(tournament);
      const user = userEvent.setup();

      const removeButton = screen.getByRole('button', { name: /quitar banner/i });
      await user.click(removeButton);

      expect(notify).toHaveBeenCalledWith('Banner eliminado');
      expect(store.getState().tournament.banner).toBe('');
    });

    it('should work even if banner is already empty', async () => {
      const { notify, store } = renderWithStore();
      const user = userEvent.setup();

      const removeButton = screen.getByRole('button', { name: /quitar banner/i });
      await user.click(removeButton);

      expect(notify).toHaveBeenCalledWith('Banner eliminado');
      expect(store.getState().tournament.banner).toBe('');
    });
  });

  describe('Remove Logo', () => {
    it('should remove logo when button is clicked', async () => {
      const tournament = { ...defaultTournament, logo: 'http://localhost/uploads/logo.png' };
      const { notify, store } = renderWithStore(tournament);
      const user = userEvent.setup();

      const removeButton = screen.getByRole('button', { name: /quitar logo/i });
      await user.click(removeButton);

      expect(notify).toHaveBeenCalledWith('Logo eliminado');
      expect(store.getState().tournament.logo).toBe('');
    });

    it('should work even if logo is already empty', async () => {
      const { notify, store } = renderWithStore();
      const user = userEvent.setup();

      const removeButton = screen.getByRole('button', { name: /quitar logo/i });
      await user.click(removeButton);

      expect(notify).toHaveBeenCalledWith('Logo eliminado');
      expect(store.getState().tournament.logo).toBe('');
    });
  });

  describe('Integration Tests', () => {
    it('should handle multiple field updates in sequence', async () => {
      const { store } = renderWithStore();
      const user = userEvent.setup();

      // Cambiar nombre
      const nameInput = screen.getByLabelText(/nombre/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Finals');

      // Cambiar juego
      const gameInput = screen.getByLabelText(/juego/i);
      await user.clear(gameInput);
      await user.type(gameInput, 'CS2');

      // Cambiar formato
      const formatSelect = screen.getByLabelText(/formato/i);
      await user.selectOptions(formatSelect, '5');

      await waitFor(() => {
        const state = store.getState().tournament;
        expect(state.name).toBe('Finals');
        expect(state.game).toBe('CS2');
        expect(state.bestOf).toBe(5);
      });
    });

    it('should update images independently', async () => {
      tournamentApi.uploadImage
        .mockResolvedValueOnce('http://localhost/uploads/banner.jpg')
        .mockResolvedValueOnce('http://localhost/uploads/logo.png');
      const { store } = renderWithStore();
      const user = userEvent.setup();

      // Subir banner
      const bannerInput = screen.getByLabelText(/banner/i);
      const bannerFile = new File(['banner'], 'banner.jpg', { type: 'image/jpeg' });
      await user.upload(bannerInput, bannerFile);

      await waitFor(() => {
        expect(store.getState().tournament.banner).toBe('http://localhost/uploads/banner.jpg');
      });

      // Subir logo
      const logoInput = screen.getByLabelText(/^logo$/i);
      const logoFile = new File(['logo'], 'logo.png', { type: 'image/png' });
      await user.upload(logoInput, logoFile);

      await waitFor(() => {
        expect(store.getState().tournament.logo).toBe('http://localhost/uploads/logo.png');
      });

      // Ambas imágenes deberían estar presentes
      expect(store.getState().tournament.banner).toBe('http://localhost/uploads/banner.jpg');
      expect(store.getState().tournament.logo).toBe('http://localhost/uploads/logo.png');
    });

    it('should remove images independently', async () => {
      const tournament = {
        ...defaultTournament,
        banner: 'http://localhost/uploads/banner.jpg',
        logo: 'http://localhost/uploads/logo.png'
      };
      const { store } = renderWithStore(tournament);
      const user = userEvent.setup();

      // Quitar banner
      const removeBannerButton = screen.getByRole('button', { name: /quitar banner/i });
      await user.click(removeBannerButton);

      await waitFor(() => {
        expect(store.getState().tournament.banner).toBe('');
      });

      // Logo sigue presente
      expect(store.getState().tournament.logo).toBe('http://localhost/uploads/logo.png');

      // Quitar logo
      const removeLogoButton = screen.getByRole('button', { name: /quitar logo/i });
      await user.click(removeLogoButton);

      await waitFor(() => {
        expect(store.getState().tournament.logo).toBe('');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent uploads', async () => {
      let resolveBanner, resolveLogo;
      tournamentApi.uploadImage
        .mockImplementationOnce(() => new Promise(resolve => { resolveBanner = resolve; }))
        .mockImplementationOnce(() => new Promise(resolve => { resolveLogo = resolve; }));

      const { notify } = renderWithStore();
      const user = userEvent.setup();

      // Iniciar ambas subidas al mismo tiempo
      const bannerInput = screen.getByLabelText(/banner/i);
      const logoInput = screen.getByLabelText(/^logo$/i);

      const bannerFile = new File(['banner'], 'banner.jpg', { type: 'image/jpeg' });
      const logoFile = new File(['logo'], 'logo.png', { type: 'image/png' });

      await user.upload(bannerInput, bannerFile);
      await user.upload(logoInput, logoFile);

      // Resolver en orden inverso
      resolveLogo('http://localhost/uploads/logo.png');
      await waitFor(() => {
        expect(notify).toHaveBeenCalledWith('Logo actualizado');
      });

      resolveBanner('http://localhost/uploads/banner.jpg');
      await waitFor(() => {
        expect(notify).toHaveBeenCalledWith('Banner actualizado');
      });
    });

    it('should handle unicode characters in tournament name', async () => {
      const { store } = renderWithStore();
      const user = userEvent.setup();

      const unicodeName = '토너먼트 2025 🏆';
      const nameInput = screen.getByLabelText(/nombre/i);
      await user.clear(nameInput);
      await user.type(nameInput, unicodeName);

      await waitFor(() => {
        expect(store.getState().tournament.name).toBe(unicodeName);
      });
    });

    it('should preserve other fields when updating one field', async () => {
      const tournament = {
        ...defaultTournament,
        name: 'Original',
        game: 'Original Game',
        bestOf: 3,
        banner: 'http://localhost/uploads/banner.jpg'
      };
      const { store } = renderWithStore(tournament);
      const user = userEvent.setup();

      // Solo cambiar el nombre
      const nameInput = screen.getByLabelText(/nombre/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated');

      await waitFor(() => {
        const state = store.getState().tournament;
        expect(state.name).toBe('Updated');
        expect(state.game).toBe('Original Game');
        expect(state.bestOf).toBe(3);
        expect(state.banner).toBe('http://localhost/uploads/banner.jpg');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      renderWithStore();

      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/juego/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/formato/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/banner/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^logo$/i)).toBeInTheDocument();
    });

    it('should have autocomplete off for text inputs', () => {
      renderWithStore();

      const nameInput = screen.getByLabelText(/nombre/i);
      const gameInput = screen.getByLabelText(/juego/i);

      expect(nameInput).toHaveAttribute('autocomplete', 'off');
      expect(gameInput).toHaveAttribute('autocomplete', 'off');
    });

    it('should have semantic HTML structure', () => {
      renderWithStore();

      const section = screen.getByText('Evento').closest('section');
      expect(section).toHaveClass('card');

      const heading = screen.getByText('Evento');
      expect(heading.tagName).toBe('H2');
    });

    it('should have type="button" for action buttons', () => {
      renderWithStore();

      const removeBannerButton = screen.getByRole('button', { name: /quitar banner/i });
      const removeLogoButton = screen.getByRole('button', { name: /quitar logo/i });

      expect(removeBannerButton).toHaveAttribute('type', 'button');
      expect(removeLogoButton).toHaveAttribute('type', 'button');
    });
  });
});
