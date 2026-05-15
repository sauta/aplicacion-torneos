import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '../Avatar';

// Mock del módulo text.js
vi.mock('../lib/text', () => ({
  safeImage: vi.fn((image) => image || null),
  initials: vi.fn((name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name[0]?.toUpperCase() || '?';
  })
}));

describe('Avatar Component', () => {
  describe('With Image', () => {
    it('should render an img element when participant has image', () => {
      const participant = {
        id: 'p1',
        name: 'John Doe',
        image: '/uploads/avatar.jpg'
      };

      render(<Avatar participant={participant} />);
      
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/uploads/avatar.jpg');
    });

    it('should apply custom className to img', () => {
      const participant = {
        id: 'p1',
        name: 'Test',
        image: '/test.jpg'
      };

      render(<Avatar participant={participant} className="custom-class" />);
      
      const img = screen.getByRole('img');
      expect(img).toHaveClass('avatar');
      expect(img).toHaveClass('custom-class');
    });

    it('should have empty alt attribute', () => {
      const participant = {
        id: 'p1',
        name: 'Test',
        image: '/test.jpg'
      };

      render(<Avatar participant={participant} />);
      
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', '');
    });
  });

  describe('Without Image (Fallback)', () => {
    it('should render initials when no image', () => {
      const participant = {
        id: 'p1',
        name: 'John Doe',
        image: null
      };

      render(<Avatar participant={participant} />);
      
      const fallback = screen.getByText('JD');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveClass('avatar');
      expect(fallback).toHaveClass('avatar-fallback');
    });

    it('should apply custom className to fallback div', () => {
      const participant = {
        id: 'p1',
        name: 'Test User',
        image: ''
      };

      render(<Avatar participant={participant} className="large" />);
      
      const fallback = screen.getByText('TU');
      expect(fallback).toHaveClass('avatar');
      expect(fallback).toHaveClass('avatar-fallback');
      expect(fallback).toHaveClass('large');
    });

    it('should handle participant without image property', () => {
      const participant = {
        id: 'p1',
        name: 'Alice Bob'
      };

      render(<Avatar participant={participant} />);
      
      const fallback = screen.getByText('AB');
      expect(fallback).toBeInTheDocument();
    });

    it('should handle single word name', () => {
      const participant = {
        id: 'p1',
        name: 'Champion'
      };

      render(<Avatar participant={participant} />);
      
      const fallback = screen.getByText('C');
      expect(fallback).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null participant', () => {
      render(<Avatar participant={null} />);
      
      const fallback = screen.getByText('?');
      expect(fallback).toBeInTheDocument();
    });

    it('should handle undefined participant', () => {
      render(<Avatar participant={undefined} />);
      
      const fallback = screen.getByText('?');
      expect(fallback).toBeInTheDocument();
    });

    it('should handle participant with empty name', () => {
      const participant = {
        id: 'p1',
        name: ''
      };

      render(<Avatar participant={participant} />);
      
      const fallback = screen.getByText('?');
      expect(fallback).toBeInTheDocument();
    });

    it('should default className to empty string', () => {
      const participant = {
        id: 'p1',
        name: 'Test',
        image: '/test.jpg'
      };

      render(<Avatar participant={participant} />);
      
      const img = screen.getByRole('img');
      expect(img).toHaveClass('avatar');
      expect(img.className).toBe('avatar');
    });
  });

  describe('CSS Classes', () => {
    it('should always include "avatar" class', () => {
      const{ container } = render(
        <Avatar participant={{ id: 'p1', name: 'Test' }} />
      );
      
      const element = container.querySelector('.avatar');
      expect(element).toBeInTheDocument();
    });

    it('should trim whitespace from combined classes', () => {
      const participant = {
        id: 'p1',
        name: 'Test',
        image: '/test.jpg'
      };

      render(<Avatar participant={participant} className="  " />);
      
      const img = screen.getByRole('img');
      expect(img.className).toBe('avatar');
    });

    it('should combine multiple classes correctly', () => {
      const participant = {
        id: 'p1',
        name: 'Test'
      };

      render(<Avatar participant={participant} className="size-lg rounded" />);
      
      const fallback = screen.getByText('T');
      expect(fallback).toHaveClass('avatar');
      expect(fallback).toHaveClass('avatar-fallback');
      expect(fallback).toHaveClass('size-lg');
      expect(fallback).toHaveClass('rounded');
    });
  });
});
