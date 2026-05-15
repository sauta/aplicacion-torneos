import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';

describe('ThemeToggle Component', () => {
  let mockMatchMedia;
  let mockLocalStorage;

  beforeEach(() => {
    // Mock matchMedia
    mockMatchMedia = vi.fn((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    window.matchMedia = mockMatchMedia;

    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Reset document.documentElement.setAttribute
    document.documentElement.setAttribute = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Theme', () => {
    it('should load theme from localStorage if available', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');

      render(<ThemeToggle />);

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('theme');
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      expect(screen.getByTitle('Cambiar a modo claro')).toBeInTheDocument();
    });

    it('should use system preference if no saved theme', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      render(<ThemeToggle />);

      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    });

    it('should default to light theme if no preference', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      render(<ThemeToggle />);

      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    });
  });

  describe('Theme Toggle', () => {
    it('should toggle from light to dark', () => {
      mockLocalStorage.getItem.mockReturnValue('light');

      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
      expect(screen.getByTitle('Cambiar a modo claro')).toBeInTheDocument();
    });

    it('should toggle from dark to light', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');

      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light');
      expect(screen.getByTitle('Cambiar a modo oscuro')).toBeInTheDocument();
    });
  });

  describe('Button Content', () => {
    it('should show moon icon in dark mode', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');

      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('🌙');
    });

    it('should show sun icon in light mode', () => {
      mockLocalStorage.getItem.mockReturnValue('light');

      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('☀️');
    });
  });

  describe('CSS Classes', () => {
    it('should have theme-toggle class', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('theme-toggle');
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate aria-label for dark mode', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');

      render(<ThemeToggle />);

      const button = screen.getByTitle('Cambiar a modo claro');
      expect(button).toBeInTheDocument();
    });

    it('should have appropriate aria-label for light mode', () => {
      mockLocalStorage.getItem.mockReturnValue('light');

      render(<ThemeToggle />);

      const button = screen.getByTitle('Cambiar a modo oscuro');
      expect(button).toBeInTheDocument();
    });
  });
});
