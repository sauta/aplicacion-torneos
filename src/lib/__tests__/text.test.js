import { describe, it, expect } from 'vitest';
import { escapeHtml, initials, safeImage, participantLabel } from '../text';

describe('text.js - Utility Functions', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("It's working")).toBe('It&#039;s working');
    });

    it('should handle multiple special characters', () => {
      expect(escapeHtml('<a href="test">Link & \'text\'</a>'))
        .toBe('&lt;a href=&quot;test&quot;&gt;Link &amp; &#039;text&#039;&lt;/a&gt;');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should convert non-strings to string', () => {
      expect(escapeHtml(123)).toBe('123');
      expect(escapeHtml(null)).toBe('null');
      expect(escapeHtml(undefined)).toBe('undefined');
    });

    it('should not modify safe text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('initials', () => {
    it('should return initials from full name', () => {
      expect(initials('John Doe')).toBe('JD');
    });

    it('should handle single name', () => {
      expect(initials('John')).toBe('J');
    });

    it('should handle three or more names (only first two)', () => {
      expect(initials('John Paul Jones')).toBe('JP');
    });

    it('should handle names with extra spaces', () => {
      expect(initials('  John   Doe  ')).toBe('JD');
    });

    it('should return uppercase initials', () => {
      expect(initials('john doe')).toBe('JD');
    });

    it('should handle empty string', () => {
      expect(initials('')).toBe('?');
    });

    it('should handle null', () => {
      expect(initials(null)).toBe('?');
    });

    it('should handle undefined', () => {
      expect(initials(undefined)).toBe('?');
    });

    it('should handle whitespace-only string', () => {
      expect(initials('   ')).toBe('?');
    });

    it('should convert numbers to string and return first char', () => {
      expect(initials(123)).toBe('1');
    });

    it('should handle special characters', () => {
      expect(initials('Ángel García')).toBe('ÁG');
    });
  });

  describe('safeImage', () => {
    describe('Valid URLs', () => {
      it('should accept data: URLs', () => {
        const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
        expect(safeImage(dataUrl)).toBe(dataUrl);
      });

      it('should accept http:// URLs', () => {
        const url = 'http://example.com/image.jpg';
        expect(safeImage(url)).toBe(url);
      });

      it('should accept https:// URLs', () => {
        const url = 'https://example.com/image.jpg';
        expect(safeImage(url)).toBe(url);
      });

      it('should accept /assets/ paths', () => {
        const path = '/assets/images/logo.png';
        expect(safeImage(path)).toBe(path);
      });

      it('should accept /uploads/ paths', () => {
        const path = '/uploads/banner-123.jpg';
        expect(safeImage(path)).toBe(path);
      });
    });

    describe('Invalid/Unsafe URLs', () => {
      it('should reject relative paths', () => {
        expect(safeImage('images/logo.png')).toBe('');
      });

      it('should reject javascript: protocol', () => {
        expect(safeImage('javascript:alert("xss")')).toBe('');
      });

      it('should reject file:// protocol', () => {
        expect(safeImage('file:///etc/passwd')).toBe('');
      });

      it('should reject paths starting with ../', () => {
        expect(safeImage('../../../etc/passwd')).toBe('');
      });

      it('should reject ftp:// protocol', () => {
        expect(safeImage('ftp://example.com/image.jpg')).toBe('');
      });

      it('should handle empty string', () => {
        expect(safeImage('')).toBe('');
      });

      it('should handle null', () => {
        expect(safeImage(null)).toBe('');
      });

      it('should handle undefined', () => {
        expect(safeImage(undefined)).toBe('');
      });

      it('should handle numbers', () => {
        expect(safeImage(123)).toBe('');
      });

      it('should handle objects', () => {
        expect(safeImage({})).toBe('');
      });

      it('should trim whitespace before validation', () => {
        expect(safeImage('  /assets/logo.png  ')).toBe('/assets/logo.png');
      });

      it('should reject URLs with only whitespace', () => {
        expect(safeImage('   ')).toBe('');
      });
    });
  });

  describe('participantLabel', () => {
    it('should return "Equipo" for team participants', () => {
      const team = { id: 't1', name: 'Alpha', kind: 'team' };
      expect(participantLabel(team)).toBe('Equipo');
    });

    it('should return "Jugador" for player participants', () => {
      const player = { id: 'p1', name: 'John', kind: 'player' };
      expect(participantLabel(player)).toBe('Jugador');
    });

    it('should return "Jugador" for undefined kind', () => {
      const participant = { id: 'p1', name: 'John' };
      expect(participantLabel(participant)).toBe('Jugador');
    });

    it('should return "Jugador" for null kind', () => {
      const participant = { id: 'p1', name: 'John', kind: null };
      expect(participantLabel(participant)).toBe('Jugador');
    });

    it('should return "Jugador" for invalid kind values', () => {
      const participant = { id: 'p1', name: 'John', kind: 'invalid' };
      expect(participantLabel(participant)).toBe('Jugador');
    });

    it('should handle null participant', () => {
      expect(participantLabel(null)).toBe('Jugador');
    });

    it('should handle undefined participant', () => {
      expect(participantLabel(undefined)).toBe('Jugador');
    });

    it('should handle empty object', () => {
      expect(participantLabel({})).toBe('Jugador');
    });
  });

  describe('Edge Cases & Security', () => {
    it('escapeHtml should prevent XSS in img onerror', () => {
      const malicious = '<img src=x onerror="alert(1)">';
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
    });

    it('safeImage should block data URIs without proper image type', () => {
      expect(safeImage('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('safeImage should only allow data:image/ prefix', () => {
      expect(safeImage('data:image/svg+xml,<svg></svg>')).toBe('data:image/svg+xml,<svg></svg>');
      expect(safeImage('data:application/octet-stream,AAA')).toBe('');
    });

    it('initials should handle emoji names gracefully', () => {
      // Los emojis pueden comportarse diferente según el entorno
      const result = initials('😀 Player');
      // Verifica que al menos retorna algo válido (no vacío)
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('escapeHtml should handle unicode characters', () => {
      const unicode = 'Hola "José" & María';
      const escaped = escapeHtml(unicode);
      expect(escaped).toBe('Hola &quot;José&quot; &amp; María');
    });
  });
});
