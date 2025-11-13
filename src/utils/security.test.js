/**
 * Security Tests - Standalone
 * These tests verify the security functions work correctly
 * without requiring React Native environment
 */

// Import functions from sanitize utility
const { sanitizeInput } = require('./sanitize');

describe('Security Tests - Input Sanitization', () => {
  describe('sanitizeInput', () => {
    test('should remove control characters', () => {
      const input = 'Hello\x00World\x1F';
      const result = sanitizeInput(input);
      expect(result).toBe('HelloWorld');
    });

    test('should remove zero-width characters', () => {
      const input = 'Hello\u200BWorld\u200C\u200D\uFEFF';
      const result = sanitizeInput(input);
      expect(result).toBe('HelloWorld');
    });

    test('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello World');
    });

    test('should normalize unicode (NFKC)', () => {
      const input = '\u00C5'; // Angstrom sign
      const result = sanitizeInput(input);
      expect(result).toBe('\u00C5');
    });

    test('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });

    test('should handle non-string input', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
      expect(sanitizeInput(123)).toBe('');
      expect(sanitizeInput({})).toBe('');
    });

    test('should preserve valid unicode emoji', () => {
      const input = 'Sarah 💕✨';
      const result = sanitizeInput(input);
      expect(result).toContain('💕');
      expect(result).toContain('✨');
    });

    test('should handle special HTML characters', () => {
      const input = '<script>&"\'</script>';
      const result = sanitizeInput(input);
      // Should preserve these (not HTML context, just text storage)
      expect(result).toContain('<');
      expect(result).toContain('>');
    });

    test('should handle newlines and tabs correctly', () => {
      const input = 'Hello\nWorld\tTest';
      const result = sanitizeInput(input);
      // Newlines and tabs should be preserved as they're valid
      expect(result).toBe('Hello\nWorld\tTest');
    });

    test('should handle very long strings', () => {
      const input = 'a'.repeat(1000);
      const result = sanitizeInput(input);
      expect(result.length).toBe(1000);
    });

    test('should handle trademark symbol', () => {
      const input = 'Test™';
      const result = sanitizeInput(input);
      expect(result).toContain('™');
    });

    test('should handle copyright symbol', () => {
      const input = 'Test©';
      const result = sanitizeInput(input);
      expect(result).toContain('©');
    });

    test('should handle registered trademark symbol', () => {
      const input = 'Test®';
      const result = sanitizeInput(input);
      expect(result).toContain('®');
    });

    test('should remove multiple consecutive control characters', () => {
      const input = 'Hello\x00\x01\x02World';
      const result = sanitizeInput(input);
      expect(result).toBe('HelloWorld');
    });

    test('should handle mixed whitespace and control characters', () => {
      const input = '  Hello\x00  World\x1F  ';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello  World');
    });

    test('should prevent homograph attack with similar-looking characters', () => {
      // This tests Unicode normalization
      const input1 = 'café'; // Using combining character
      const input2 = 'café'; // Using precomposed character
      const result1 = sanitizeInput(input1);
      const result2 = sanitizeInput(input2);
      // Both should normalize to the same result
      expect(result1).toBe(result2);
    });

    test('should handle input with only control characters', () => {
      const input = '\x00\x01\x02\x03';
      const result = sanitizeInput(input);
      expect(result).toBe('');
    });

    test('should handle input with only whitespace and control characters', () => {
      const input = '  \x00  \x01  ';
      const result = sanitizeInput(input);
      expect(result).toBe('');
    });

    test('should preserve apostrophes in names', () => {
      const input = "O'Brien";
      const result = sanitizeInput(input);
      expect(result).toBe("O'Brien");
    });

    test('should preserve hyphens in names', () => {
      const input = "Jean-Paul";
      const result = sanitizeInput(input);
      expect(result).toBe("Jean-Paul");
    });

    test('should handle accented characters', () => {
      const input = 'José';
      const result = sanitizeInput(input);
      expect(result).toBe('José');
    });

    test('should handle Cyrillic characters', () => {
      const input = 'Александр';
      const result = sanitizeInput(input);
      expect(result).toBe('Александр');
    });

    test('should handle Arabic characters', () => {
      const input = 'محمد';
      const result = sanitizeInput(input);
      expect(result).toBe('محمد');
    });

    test('should handle Chinese characters', () => {
      const input = '李明';
      const result = sanitizeInput(input);
      expect(result).toBe('李明');
    });

    test('should handle Japanese characters', () => {
      const input = '田中';
      const result = sanitizeInput(input);
      expect(result).toBe('田中');
    });

    test('should prevent injection of null bytes', () => {
      const input = 'test\x00.txt';
      const result = sanitizeInput(input);
      expect(result).toBe('test.txt');
      expect(result).not.toContain('\x00');
    });

    test('should prevent zero-width joiner attacks', () => {
      const input = 'test\u200Dattack';
      const result = sanitizeInput(input);
      expect(result).toBe('testattack');
    });

    test('should handle right-to-left override', () => {
      const input = 'test\u202Eoverride';
      const result = sanitizeInput(input);
      // RTL override should be removed
      expect(result).not.toContain('\u202E');
    });

    test('should handle multiple types of attacks combined', () => {
      const input = '  \x00Test\u200B\x1F™\u200C  ';
      const result = sanitizeInput(input);
      expect(result).toBe('Test™');
    });
  });
});
