#!/usr/bin/env node

/**
 * Standalone Security Test Runner
 * Runs security tests using plain Node.js (no Jest/Expo required)
 */

// Simple test framework
let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  ${error.message}`);
    failed++;
  }
}

function expect(value) {
  return {
    toBe(expected) {
      if (value !== expected) {
        throw new Error(`Expected "${expected}" but got "${value}"`);
      }
    },
    toContain(substring) {
      if (!value.includes(substring)) {
        throw new Error(`Expected "${value}" to contain "${substring}"`);
      }
    },
    not: {
      toContain(substring) {
        if (value.includes(substring)) {
          throw new Error(`Expected "${value}" not to contain "${substring}"`);
        }
      }
    }
  };
}

// Import the function to test
const { sanitizeInput } = require('./src/utils/sanitize.js');

console.log('\n=== SECURITY TESTS - INPUT SANITIZATION ===\n');

// Control character tests
test('should remove control characters', () => {
  const result = sanitizeInput('Hello\x00World\x1F');
  expect(result).toBe('HelloWorld');
});

test('should remove zero-width characters', () => {
  const result = sanitizeInput('Hello\u200BWorld\u200C\u200D\uFEFF');
  expect(result).toBe('HelloWorld');
});

// Whitespace tests
test('should trim whitespace', () => {
  const result = sanitizeInput('  Hello World  ');
  expect(result).toBe('Hello World');
});

test('should handle empty strings', () => {
  expect(sanitizeInput('')).toBe('');
  expect(sanitizeInput('   ')).toBe('');
});

// Type safety tests
test('should handle non-string input (null)', () => {
  expect(sanitizeInput(null)).toBe('');
});

test('should handle non-string input (undefined)', () => {
  expect(sanitizeInput(undefined)).toBe('');
});

test('should handle non-string input (number)', () => {
  expect(sanitizeInput(123)).toBe('');
});

test('should handle non-string input (object)', () => {
  expect(sanitizeInput({})).toBe('');
});

// Unicode tests
test('should preserve valid unicode emoji', () => {
  const result = sanitizeInput('Sarah 💕✨');
  expect(result).toContain('💕');
  expect(result).toContain('✨');
});

test('should preserve trademark symbol', () => {
  const result = sanitizeInput('Test™');
  expect(result).toContain('™');
});

test('should preserve copyright symbol', () => {
  const result = sanitizeInput('Test©');
  expect(result).toContain('©');
});

test('should preserve registered trademark symbol', () => {
  const result = sanitizeInput('Test®');
  expect(result).toContain('®');
});

// Special character tests
test('should handle special HTML characters (not in HTML context)', () => {
  const result = sanitizeInput('<script>&"\'</script>');
  expect(result).toContain('<');
  expect(result).toContain('>');
});

test('should handle newlines and tabs', () => {
  const result = sanitizeInput('Hello\nWorld\tTest');
  expect(result).toBe('Hello\nWorld\tTest');
});

// Length tests
test('should handle very long strings', () => {
  const input = 'a'.repeat(1000);
  const result = sanitizeInput(input);
  expect(result.length).toBe(1000);
});

// Attack prevention tests
test('should remove multiple consecutive control characters', () => {
  const result = sanitizeInput('Hello\x00\x01\x02World');
  expect(result).toBe('HelloWorld');
});

test('should handle mixed whitespace and control characters', () => {
  const result = sanitizeInput('  Hello\x00  World\x1F  ');
  expect(result).toBe('Hello  World');
});

test('should handle input with only control characters', () => {
  const result = sanitizeInput('\x00\x01\x02\x03');
  expect(result).toBe('');
});

test('should handle input with only whitespace and control characters', () => {
  const result = sanitizeInput('  \x00  \x01  ');
  expect(result).toBe('');
});

// Real-world name tests
test('should preserve apostrophes in names', () => {
  const result = sanitizeInput("O'Brien");
  expect(result).toBe("O'Brien");
});

test('should preserve hyphens in names', () => {
  const result = sanitizeInput("Jean-Paul");
  expect(result).toBe("Jean-Paul");
});

test('should handle accented characters', () => {
  const result = sanitizeInput('José');
  expect(result).toBe('José');
});

// International character tests
test('should handle Cyrillic characters', () => {
  const result = sanitizeInput('Александр');
  expect(result).toBe('Александр');
});

test('should handle Arabic characters', () => {
  const result = sanitizeInput('محمد');
  expect(result).toBe('محمد');
});

test('should handle Chinese characters', () => {
  const result = sanitizeInput('李明');
  expect(result).toBe('李明');
});

test('should handle Japanese characters', () => {
  const result = sanitizeInput('田中');
  expect(result).toBe('田中');
});

// Security attack tests
test('should prevent injection of null bytes', () => {
  const result = sanitizeInput('test\x00.txt');
  expect(result).toBe('test.txt');
  expect(result).not.toContain('\x00');
});

test('should prevent zero-width joiner attacks', () => {
  const result = sanitizeInput('test\u200Dattack');
  expect(result).toBe('testattack');
});

test('should handle right-to-left override', () => {
  const result = sanitizeInput('test\u202Eoverride');
  expect(result).not.toContain('\u202E');
});

test('should handle multiple types of attacks combined', () => {
  const result = sanitizeInput('  \x00Test\u200B\x1F™\u200C  ');
  expect(result).toBe('Test™');
});

// Summary
console.log(`\n=== TEST RESULTS ===`);
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log(`Total: ${passed + failed}\n`);

if (failed > 0) {
  process.exit(1);
}
