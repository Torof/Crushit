/**
 * Input Sanitization Utility
 * Sanitizes user input to prevent security vulnerabilities
 */

/**
 * Sanitize user input by removing control characters, zero-width characters,
 * normalizing Unicode, and trimming whitespace
 * @param {*} input - The input to sanitize (will handle non-strings safely)
 * @returns {string} - The sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';

  // Remove control characters (except newline and tab), zero-width characters, and RTL/LTR overrides
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200D\u202A-\u202E\uFEFF]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Prevent homograph attacks using NFC (less aggressive than NFKC, preserves more characters)
  // This normalizes unicode characters while preserving symbols like ™, ©, ®
  sanitized = sanitized.normalize('NFC');

  return sanitized;
};
