import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeInput, loadCrushes, saveCrushes, clearAllCrushes } from './storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Blob for size checking
global.Blob = class Blob {
  constructor(parts) {
    this.size = JSON.stringify(parts).length;
  }
};

describe('Storage Utility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeInput - Security Tests', () => {
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
      expect(result).toBe('\u00C5'); // Should be normalized
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
  });

  describe('loadCrushes - Data Validation', () => {
    test('should return empty array when no data exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await loadCrushes();
      expect(result).toEqual([]);
    });

    test('should load valid crushes', async () => {
      const validCrushes = [
        {
          id: '1',
          name: 'Test',
          description: 'Desc',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(validCrushes));
      const result = await loadCrushes();
      expect(result).toEqual(validCrushes);
    });

    test('should filter out crushes with invalid structure', async () => {
      const mixedCrushes = [
        {
          id: '1',
          name: 'Valid',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Invalid - no mistakes field',
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
        {
          // Missing required fields
          id: '3',
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mixedCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Valid');
    });

    test('should reject crushes with invalid mistakes count', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: -1, // Invalid
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Test2',
          description: '',
          mistakes: 6, // Invalid (max is 5)
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with names exceeding 50 chars', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'a'.repeat(51), // Too long
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with descriptions exceeding 500 chars', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: 'a'.repeat(501), // Too long
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with invalid pros/cons structure', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: 'not an array', // Invalid
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with invalid action titles (>100 chars)', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [
            {
              id: '1',
              title: 'a'.repeat(101), // Too long
              description: '',
            },
          ],
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should handle corrupted JSON and try backup', async () => {
      const validBackup = [
        {
          id: '1',
          name: 'Backup',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];

      AsyncStorage.getItem
        .mockResolvedValueOnce('{ invalid json }') // Main storage corrupted
        .mockResolvedValueOnce(JSON.stringify(validBackup)); // Backup is valid

      const result = await loadCrushes();
      expect(result).toEqual(validBackup);
    });

    test('should return empty array if both main and backup are corrupted', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce('{ invalid json }') // Main corrupted
        .mockResolvedValueOnce('{ invalid json }'); // Backup corrupted

      const result = await loadCrushes();
      expect(result).toEqual([]);
    });

    test('should reject invalid date strings', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: 'not a valid date',
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });
  });

  describe('saveCrushes - Data Integrity', () => {
    test('should save valid crushes', async () => {
      const validCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue();

      await saveCrushes(validCrushes);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@crushes',
        JSON.stringify(validCrushes)
      );
    });

    test('should create backup before saving', async () => {
      const oldData = JSON.stringify([{ id: '1', name: 'Old' }]);
      const newData = [
        {
          id: '2',
          name: 'New',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(oldData);
      AsyncStorage.setItem.mockResolvedValue();

      await saveCrushes(newData);

      // Should create backup
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@crushes_backup', oldData);
      // Should save new data
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@crushes',
        JSON.stringify(newData)
      );
    });

    test('should filter out invalid crushes before saving', async () => {
      const mixedCrushes = [
        {
          id: '1',
          name: 'Valid',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Invalid - no mistakes',
          pros: [],
          cons: [],
        },
      ];

      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.setItem.mockResolvedValue();

      await saveCrushes(mixedCrushes);

      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].name).toBe('Valid');
    });

    test('should reject non-array input', async () => {
      await expect(saveCrushes('not an array')).rejects.toThrow(
        'Invalid crushes data: must be an array'
      );
    });

    test('should reject data exceeding 2MB limit', async () => {
      // Create enough data to exceed 2MB (each crush ~550 bytes, need ~3900+ crushes)
      const hugeCrushes = Array.from({ length: 5000 }, (_, i) => ({
        id: String(i),
        name: 'Test' + i,
        description: 'a'.repeat(500),
        mistakes: 0,
        pros: [],
        cons: [],
        createdAt: new Date().toISOString(),
      }));

      AsyncStorage.getItem.mockResolvedValue(null);

      await expect(saveCrushes(hugeCrushes)).rejects.toThrow(
        'Data size exceeds storage limit'
      );
    });
  });

  describe('clearAllCrushes - Backup Creation', () => {
    test('should create backup before clearing', async () => {
      const existingData = JSON.stringify([{ id: '1', name: 'Test' }]);
      AsyncStorage.getItem.mockResolvedValue(existingData);
      AsyncStorage.setItem.mockResolvedValue();
      AsyncStorage.removeItem.mockResolvedValue();

      await clearAllCrushes();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@crushes_backup', existingData);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@crushes');
    });

    test('should handle errors gracefully', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await expect(clearAllCrushes()).rejects.toThrow('Storage error');
    });
  });
});
