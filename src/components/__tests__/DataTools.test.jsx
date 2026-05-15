import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DataTools } from '../DataTools';
import tournamentReducer from '../../features/tournament/tournamentSlice';
import { defaultTournament } from '../../features/tournament/defaultTournament';
import * as tournamentApi from '../../services/tournamentApi';
import * as exportService from '../../services/exportService';

// Mock parcial de tournamentApi, manteniendo las funciones reales que necesita tournamentSlice
vi.mock('../../services/tournamentApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    downloadJson: vi.fn(),
    copyText: vi.fn(),
    makeShareUrl: vi.fn(() => 'http://localhost/view.html#mock-share-link'),
    readJsonFile: vi.fn(),
    uploadImage: vi.fn(),
    clearTournament: vi.fn()
  };
});

vi.mock('../../services/exportService', () => ({
  exportTournamentZip: vi.fn(),
  importTournamentZip: vi.fn()
}));

// Helper para renderizar con Redux
function renderWithStore(initialState = defaultTournament) {
  const store = configureStore({
    reducer: { tournament: tournamentReducer },
    preloadedState: { tournament: initialState }
  });

  const notify = vi.fn();

  const rendered = render(
    <Provider store={store}>
      <DataTools notify={notify} />
    </Provider>
  );

  return { ...rendered, store, notify };
}

describe('DataTools Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    window.open = vi.fn();
  });

  describe('Rendering', () => {
    it('should render all export/import buttons', () => {
      renderWithStore();

      expect(screen.getByRole('button', { name: /exportar json/i })).toBeInTheDocument();
      expect(screen.getByText(/📦 exportar zip completo/i)).toBeInTheDocument();
      expect(screen.getByText(/📥 importar zip completo/i)).toBeInTheDocument();
      expect(screen.getByText(/importar json/i)).toBeInTheDocument();
    });

    it('should render share link section', () => {
      renderWithStore();

      expect(screen.getByLabelText(/link publico/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copiar/i })).toBeInTheDocument();
    });

    it('should render action buttons (Abrir vista, Reiniciar)', () => {
      renderWithStore();

      expect(screen.getByRole('button', { name: /abrir vista/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reiniciar/i })).toBeInTheDocument();
    });

    it('should display the share link in the input', () => {
      renderWithStore();

      const input = screen.getByLabelText(/link publico/i);
      expect(input).toHaveValue('http://localhost/view.html#mock-share-link');
    });
  });

  describe('Export JSON', () => {
    it('should call downloadJson when "Exportar JSON" is clicked', async () => {
      const { notify } = renderWithStore();
      const user = userEvent.setup();

      const exportButton = screen.getByRole('button', { name: /exportar json/i });
      await user.click(exportButton);

      expect(tournamentApi.downloadJson).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith('JSON exportado');
    });

    it('should pass the current tournament to downloadJson', async () => {
      const customTournament = { ...defaultTournament, name: 'Custom Test' };
      renderWithStore(customTournament);
      const user = userEvent.setup();

      const exportButton = screen.getByRole('button', { name: /exportar json/i });
      await user.click(exportButton);

      expect(tournamentApi.downloadJson).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Custom Test' })
      );
    });
  });

  describe('Export ZIP', () => {
    it('should call exportTournamentZip when button is clicked', async () => {
      exportService.exportTournamentZip.mockResolvedValue();
      const { notify } = renderWithStore();
      const user = userEvent.setup();

      const exportZipButton = screen.getByRole('button', { name: /📦 exportar zip completo/i });
      await user.click(exportZipButton);

      await waitFor(() => {
        expect(exportService.exportTournamentZip).toHaveBeenCalledTimes(1);
      });

      expect(notify).toHaveBeenCalledWith('ZIP exportado correctamente');
    });

    it('should show "Exportando..." while export is in progress', async () => {
      let resolveExport;
      exportService.exportTournamentZip.mockReturnValue(
        new Promise((resolve) => { resolveExport = resolve; })
      );
      const user = userEvent.setup();
      renderWithStore();

      const exportZipButton = screen.getByRole('button', { name: /📦 exportar zip completo/i });
      await user.click(exportZipButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /exportando\.\.\./i })).toBeInTheDocument();
      });

      // Resolver y verificar que vuelve al estado normal
      resolveExport();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /📦 exportar zip completo/i })).toBeInTheDocument();
      });
    });

    it('should disable button while exporting', async () => {
      let resolveExport;
      exportService.exportTournamentZip.mockReturnValue(
        new Promise((resolve) => { resolveExport = resolve; })
      );
      const user = userEvent.setup();
      renderWithStore();

      const exportZipButton = screen.getByRole('button', { name: /📦 exportar zip completo/i });
      await user.click(exportZipButton);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /exportando\.\.\./i });
        expect(button).toBeDisabled();
      });

      resolveExport();
    });

    it('should handle export errors gracefully', async () => {
      exportService.exportTournamentZip.mockRejectedValue(new Error('Export failed'));
      const { notify } = renderWithStore();
      const user = userEvent.setup();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const exportZipButton = screen.getByRole('button', { name: /📦 exportar zip completo/i });
      await user.click(exportZipButton);

      await waitFor(() => {
        expect(notify).toHaveBeenCalledWith('Error al exportar ZIP', 'error');
      });

      consoleError.mockRestore();
    });
  });

  describe('Import JSON', () => {
    it('should trigger file input when "Importar JSON" is clicked', () => {
      renderWithStore();

      const label = screen.getByText(/importar json/i);
      const input = document.querySelector('#importJson');

      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('accept', 'application/json,.json');
      expect(label).toHaveAttribute('for', 'importJson');
    });

    it('should call readJsonFile and update store on valid file', async () => {
      const mockTournament = { ...defaultTournament, name: 'Imported' };
      tournamentApi.readJsonFile.mockResolvedValue(mockTournament);
      const { notify, store } = renderWithStore();

      const input = document.querySelector('#importJson');

      const file = new File([JSON.stringify(mockTournament)], 'tournament.json', { type: 'application/json' });
      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(tournamentApi.readJsonFile).toHaveBeenCalledWith(file);
      });

      expect(notify).toHaveBeenCalledWith('JSON importado');
      expect(store.getState().tournament.name).toBe('Imported');
    });

    it('should handle import errors', async () => {
      tournamentApi.readJsonFile.mockRejectedValue(new Error('Invalid JSON'));
      const { notify } = renderWithStore();

      const input = document.querySelector('#importJson');

      const file = new File(['invalid'], 'bad.json', { type: 'application/json' });
      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(notify).toHaveBeenCalledWith('No se pudo importar el JSON', 'error');
      });
    });

    it('should reset file input after import', async () => {
      tournamentApi.readJsonFile.mockResolvedValue(defaultTournament);
      renderWithStore();

      const input = document.querySelector('#importJson');

      const file = new File(['{}'], 'tournament.json', { type: 'application/json' });
      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('Import ZIP', () => {
    it('should call importTournamentZip on file upload', async () => {
      const mockTournament = { ...defaultTournament, name: 'ZIP Imported' };
      exportService.importTournamentZip.mockResolvedValue(mockTournament);
      const { notify } = renderWithStore();

      const input = document.querySelector('#importZip');

      const file = new File(['zip content'], 'tournament.zip', { type: 'application/zip' });
      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(exportService.importTournamentZip).toHaveBeenCalledWith(
          file,
          tournamentApi.uploadImage,
          expect.any(Function) // Progress callback
        );
      });

      expect(notify).toHaveBeenCalledWith('ZIP importado correctamente');
    });

    it('should show import progress', async () => {
      let progressCallback;
      exportService.importTournamentZip.mockImplementation((file, uploadFn, onProgress) => {
        progressCallback = onProgress;
        return new Promise((resolve) => {
          setTimeout(() => {
            progressCallback(2, 5, 'Subiendo imágenes');
            resolve(defaultTournament);
          }, 100);
        });
      });

      renderWithStore();

      const input = document.querySelector('#importZip');

      const file = new File(['zip'], 'tournament.zip', { type: 'application/zip' });
      await userEvent.upload(input, file);

      // Verificar que muestra "Extrayendo ZIP..." primero
      await waitFor(() => {
        expect(screen.getByText(/extrayendo zip\.\.\./i)).toBeInTheDocument();
      });

      // Luego muestra el progreso
      await waitFor(() => {
        expect(screen.getByText(/subiendo imágenes \(2\/5\)/i)).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should disable label while importing', async () => {
      let resolveImport;
      exportService.importTournamentZip.mockReturnValue(
        new Promise((resolve) => { resolveImport = resolve; })
      );
      renderWithStore();

      const input = document.querySelector('#importZip');

      const file = new File(['zip'], 'tournament.zip', { type: 'application/zip' });
      await userEvent.upload(input, file);

      await waitFor(() => {
        const labelElement = screen.getByText(/extrayendo zip\.\.\./i).closest('label');
        expect(labelElement).toHaveClass('disabled');
      });

      resolveImport(defaultTournament);
    });

    it('should handle import ZIP errors', async () => {
      exportService.importTournamentZip.mockRejectedValue(new Error('Corrupted ZIP'));
      const { notify } = renderWithStore();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const input = document.querySelector('#importZip');

      const file = new File(['bad zip'], 'bad.zip', { type: 'application/zip' });
      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(notify).toHaveBeenCalledWith(
          expect.stringContaining('Error al importar ZIP'),
          'error'
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('Share Link', () => {
    it('should call copyText when "Copiar" button is clicked', async () => {
      tournamentApi.copyText.mockResolvedValue();
      const { notify } = renderWithStore();
      const user = userEvent.setup();

      const copyButton = screen.getByRole('button', { name: /copiar/i });
      await user.click(copyButton);

      expect(tournamentApi.copyText).toHaveBeenCalledWith('http://localhost/view.html#mock-share-link');
      expect(notify).toHaveBeenCalledWith('Link publico copiado');
    });

    it('should handle copy errors gracefully', async () => {
      tournamentApi.copyText.mockRejectedValue(new Error('Clipboard denied'));
      const { notify } = renderWithStore();
      const user = userEvent.setup();

      const copyButton = screen.getByRole('button', { name: /copiar/i });
      await user.click(copyButton);

      await waitFor(() => {
        expect(notify).toHaveBeenCalledWith('No se pudo copiar el link', 'warning');
      });
    });

    it('should refresh share link when input is focused', async () => {
      tournamentApi.makeShareUrl.mockReturnValue('http://localhost/view.html#refreshed-link');
      renderWithStore();
      const user = userEvent.setup();

      const input = screen.getByLabelText(/link publico/i);
      await user.click(input);

      expect(input).toHaveValue('http://localhost/view.html#refreshed-link');
    });

    it('should update share link when tournament changes', async () => {
      const { store } = renderWithStore();

      // makeShareUrl devuelve diferentes valores según el estado
      let callCount = 0;
      tournamentApi.makeShareUrl.mockImplementation(() => {
        callCount++;
        return callCount === 1 
          ? 'http://localhost/view.html#initial' 
          : 'http://localhost/view.html#updated';
      });

      // Re-render para obtener el nuevo link
      const { rerender } = render(
        <Provider store={store}>
          <DataTools notify={vi.fn()} />
        </Provider>
      );

      const initialInput = screen.getByLabelText(/link publico/i);
      expect(initialInput).toHaveValue('http://localhost/view.html#initial');

      // Simular cambio en el store
      store.dispatch({ type: 'tournament/updateEvent', payload: { field: 'name', value: 'Updated' } });

      // Re-render
      rerender(
        <Provider store={store}>
          <DataTools notify={vi.fn()} />
        </Provider>
      );

      await waitFor(() => {
        const updatedInput = screen.getByLabelText(/link publico/i);
        expect(updatedInput).toHaveValue('http://localhost/view.html#updated');
      });
    });
  });

  describe('Open View', () => {
    it('should open public view in new tab', async () => {
      renderWithStore();
      const user = userEvent.setup();

      const openButton = screen.getByRole('button', { name: /abrir vista/i });
      await user.click(openButton);

      expect(window.open).toHaveBeenCalledWith(
        'http://localhost/view.html#mock-share-link',
        '_blank',
        'noopener'
      );
    });

    it('should fallback to /view.html if share link is empty', async () => {
      tournamentApi.makeShareUrl.mockReturnValue('');
      renderWithStore();
      const user = userEvent.setup();

      const openButton = screen.getByRole('button', { name: /abrir vista/i });
      await user.click(openButton);

      expect(window.open).toHaveBeenCalledWith('/view.html', '_blank', 'noopener');
    });
  });

  describe('Reset Tournament', () => {
    it('should show confirmation dialog before reset', async () => {
      window.confirm.mockReturnValue(false);
      renderWithStore();
      const user = userEvent.setup();

      const resetButton = screen.getByRole('button', { name: /reiniciar/i });
      await user.click(resetButton);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Esto reemplazara el torneo actual')
      );
      expect(tournamentApi.clearTournament).not.toHaveBeenCalled();
    });

    it('should clear tournament if user confirms', async () => {
      window.confirm.mockReturnValue(true);
      const { notify, store } = renderWithStore();
      const user = userEvent.setup();

      const resetButton = screen.getByRole('button', { name: /reiniciar/i });
      await user.click(resetButton);

      expect(tournamentApi.clearTournament).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith('Torneo reiniciado');
      
      // Verificar que el store se reinicia al estado por defecto
      const state = store.getState().tournament;
      expect(state.participants).toEqual(defaultTournament.participants);
      expect(state.rounds).toEqual(defaultTournament.rounds);
    });

    it('should not reset if user cancels', async () => {
      window.confirm.mockReturnValue(false);
      const { notify } = renderWithStore();
      const user = userEvent.setup();

      const resetButton = screen.getByRole('button', { name: /reiniciar/i });
      await user.click(resetButton);

      expect(tournamentApi.clearTournament).not.toHaveBeenCalled();
      expect(notify).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing file on import JSON', async () => {
      const { notify } = renderWithStore();

      const input = document.querySelector('#importJson');

      // Simular onChange sin archivo
      await userEvent.upload(input, []);

      // No debería llamar a readJsonFile ni mostrar notificación
      expect(tournamentApi.readJsonFile).not.toHaveBeenCalled();
      expect(notify).not.toHaveBeenCalled();
    });

    it('should handle missing file on import ZIP', async () => {
      renderWithStore();

      const label = screen.getByText(/📥 importar zip completo/i);
      const input = label.closest('label').querySelector('input[type="file"]');

      // Simular onChange sin archivo
      await userEvent.upload(input, []);

      // No debería llamar a importTournamentZip
      expect(exportService.importTournamentZip).not.toHaveBeenCalled();
    });

    it('should handle very long tournament names in share link', () => {
      const longName = 'A'.repeat(200);
      const tournament = { ...defaultTournament, name: longName };
      renderWithStore(tournament);

      const input = screen.getByLabelText(/link publico/i);
      expect(input).toBeInTheDocument();
      // El valor puede estar truncado o encoded, pero no debe fallar
      expect(input.value).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      renderWithStore();

      expect(screen.getByLabelText(/link publico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/importar json/i, { selector: 'label' })).toBeInTheDocument();
    });

    it('should have semantic HTML structure', () => {
      renderWithStore();

      const section = screen.getByRole('button', { name: /exportar json/i }).closest('section');
      expect(section).toHaveClass('card');
      
      const heading = screen.getByText('Datos');
      expect(heading.tagName).toBe('H2');
    });

    it('should have readonly attribute on share link input', () => {
      renderWithStore();

      const input = screen.getByLabelText(/link publico/i);
      expect(input).toHaveAttribute('readOnly');
    });
  });
});
