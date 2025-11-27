import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  sanitizeInput,
  loadCrushes,
  saveCrushes,
  clearAllCrushes,
  loadThemeColor,
  saveThemeColor,
  loadBackgroundColor,
  saveBackgroundColor,
  loadColorPresets,
  saveColorPresets,
  isPasswordSet,
  setPassword,
  verifyPassword,
  removePassword,
  loadFontNames,
  saveFontNames,
  loadFontHeaders,
  saveFontHeaders,
  loadFontItems,
  saveFontItems,
  loadFontTitles,
  saveFontTitles,
  getFontFamily,
  loadLanguage,
  saveLanguage,
  AVAILABLE_FONTS,
} from './storage';

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
      // Crushes should be migrated to include new fields
      expect(result).toEqual([{
        ...validCrushes[0],
        qualities: [],
        defects: [],
        feelings: 50,
        order: 0,
        status: 'active',
        diaryEntries: [],
        picture: null,
      }]);
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
      // Should have migrated fields
      expect(result[0]).toHaveProperty('qualities', []);
      expect(result[0]).toHaveProperty('defects', []);
      expect(result[0]).toHaveProperty('feelings', 50);
      expect(result[0]).toHaveProperty('order', 0);
      expect(result[0]).toHaveProperty('status', 'active');
      expect(result[0]).toHaveProperty('diaryEntries', []);
      expect(result[0]).toHaveProperty('picture', null);
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
      // Backup should be migrated to include new fields
      expect(result).toEqual([{
        ...validBackup[0],
        qualities: [],
        defects: [],
        feelings: 50,
        order: 0,
        status: 'active',
        diaryEntries: [],
        picture: null,
      }]);
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

    test('should reject crushes with non-array qualities', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          qualities: 'not an array',
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with non-array defects', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          defects: 'not an array',
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with invalid feelings value', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          feelings: 150, // Invalid - max is 100
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with negative feelings value', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          feelings: -10, // Invalid
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with non-number order', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          order: 'first', // Invalid - should be number
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with invalid status', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          status: 'invalid_status', // Invalid
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with non-array diaryEntries', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          diaryEntries: 'not an array',
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with invalid picture type', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          picture: 123, // Invalid - should be string or null
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with invalid qualities (missing id)', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          qualities: [{ text: 'Kind' }], // Missing id
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with quality text exceeding 50 chars', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          qualities: [{ id: 'q1', text: 'a'.repeat(51) }], // Too long
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with invalid defects (missing id)', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          defects: [{ text: 'Stubborn' }], // Missing id
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with defect text exceeding 50 chars', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          defects: [{ id: 'd1', text: 'a'.repeat(51) }], // Too long
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with invalid diary entry (missing id)', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          diaryEntries: [{ title: 'Entry', createdAt: new Date().toISOString() }], // Missing id
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with diary entry title exceeding 100 chars', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          diaryEntries: [{ id: 'e1', title: 'a'.repeat(101), createdAt: new Date().toISOString() }], // Too long
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with diary entry description exceeding 1000 chars', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          diaryEntries: [{ id: 'e1', title: 'Entry', description: 'a'.repeat(1001), createdAt: new Date().toISOString() }], // Too long
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with invalid diary entry date', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          diaryEntries: [{ id: 'e1', title: 'Entry', createdAt: 'invalid date' }],
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should reject crushes with action description exceeding 500 chars', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [{ id: 'p1', title: 'Good', description: 'a'.repeat(501) }],
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should accept valid crushes with all optional fields', async () => {
      const validCrushes = [
        {
          id: '1',
          name: 'Complete',
          description: 'A complete crush',
          mistakes: 2,
          pros: [{ id: 'p1', title: 'Good', description: 'Very good' }],
          cons: [{ id: 'c1', title: 'Bad', description: 'Kind of bad' }],
          createdAt: new Date().toISOString(),
          qualities: [{ id: 'q1', text: 'Kind' }],
          defects: [{ id: 'd1', text: 'Stubborn' }],
          feelings: 75,
          order: 0,
          status: 'active',
          diaryEntries: [{ id: 'e1', title: 'Entry', description: 'My entry', createdAt: new Date().toISOString() }],
          picture: 'file:///path/to/image.jpg',
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(validCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Complete');
    });

    test('should return empty array when data is not an array', async () => {
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ notAnArray: true }));
      const result = await loadCrushes();
      expect(result).toEqual([]);
    });

    test('should return empty array on storage error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await loadCrushes();
      expect(result).toEqual([]);
    });

    test('should return empty array when backup is also null', async () => {
      AsyncStorage.getItem
        .mockResolvedValueOnce('{ invalid json }') // Main corrupted
        .mockResolvedValueOnce(null); // No backup

      const result = await loadCrushes();
      expect(result).toEqual([]);
    });

    test('should sort crushes by order field', async () => {
      const crushes = [
        {
          id: '1',
          name: 'Second',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          order: 1,
        },
        {
          id: '2',
          name: 'First',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          order: 0,
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(crushes));
      const result = await loadCrushes();
      expect(result[0].name).toBe('First');
      expect(result[1].name).toBe('Second');
    });

    test('should handle null crush object', async () => {
      const invalidData = [null, undefined];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidData));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should handle crush with non-string id', async () => {
      const invalidCrushes = [
        {
          id: 123, // Should be string
          name: 'Test',
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

    test('should handle crush with non-string name', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 123, // Should be string
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

    test('should handle crush with non-number feelings', async () => {
      const invalidCrushes = [
        {
          id: '1',
          name: 'Test',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          feelings: 'happy', // Should be number
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(0);
    });

    test('should accept valid status values', async () => {
      const validCrushes = [
        {
          id: '1',
          name: 'Ended',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          status: 'ended',
        },
        {
          id: '2',
          name: 'Standby',
          description: '',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
          status: 'standby',
        },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(validCrushes));
      const result = await loadCrushes();
      expect(result).toHaveLength(2);
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
          qualities: [],
          defects: [],
          feelings: 50,
          order: 0,
          status: 'active',
          diaryEntries: [],
          picture: null,
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
          qualities: [],
          defects: [],
          feelings: 50,
          order: 0,
          status: 'active',
          diaryEntries: [],
          picture: null,
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
          qualities: [],
          defects: [],
          feelings: 50,
          order: 0,
          status: 'active',
          diaryEntries: [],
          picture: null,
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
        qualities: [],
        defects: [],
        feelings: 50,
        order: i,
        status: 'active',
        diaryEntries: [],
        picture: null,
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

  describe('Theme Color Management', () => {
    test('loadThemeColor should return saved color', async () => {
      AsyncStorage.getItem.mockResolvedValue('#FF0000');
      const result = await loadThemeColor();
      expect(result).toBe('#FF0000');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@theme_color');
    });

    test('loadThemeColor should return default when no color saved', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await loadThemeColor();
      expect(result).toBe('#FF6B9D');
    });

    test('loadThemeColor should return default on error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await loadThemeColor();
      expect(result).toBe('#FF6B9D');
    });

    test('saveThemeColor should save color', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      await saveThemeColor('#00FF00');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@theme_color', '#00FF00');
    });

    test('saveThemeColor should throw on error', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      await expect(saveThemeColor('#00FF00')).rejects.toThrow('Storage error');
    });
  });

  describe('Background Color Management', () => {
    test('loadBackgroundColor should return saved color', async () => {
      AsyncStorage.getItem.mockResolvedValue('#000000');
      const result = await loadBackgroundColor();
      expect(result).toBe('#000000');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@background_color');
    });

    test('loadBackgroundColor should return default when no color saved', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await loadBackgroundColor();
      expect(result).toBe('#FFF0F5');
    });

    test('loadBackgroundColor should return default on error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await loadBackgroundColor();
      expect(result).toBe('#FFF0F5');
    });

    test('saveBackgroundColor should save color', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      await saveBackgroundColor('#FFFFFF');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@background_color', '#FFFFFF');
    });

    test('saveBackgroundColor should throw on error', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      await expect(saveBackgroundColor('#FFFFFF')).rejects.toThrow('Storage error');
    });
  });

  describe('Color Presets Management', () => {
    test('loadColorPresets should return saved presets', async () => {
      const presets = [{ theme: '#FF0000', bg: '#000000' }, null];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(presets));
      const result = await loadColorPresets();
      expect(result).toEqual(presets);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@color_presets');
    });

    test('loadColorPresets should return default when no presets saved', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await loadColorPresets();
      expect(result).toEqual([null, null]);
    });

    test('loadColorPresets should return default on error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await loadColorPresets();
      expect(result).toEqual([null, null]);
    });

    test('saveColorPresets should save presets', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      const presets = [{ theme: '#FF0000', bg: '#000000' }, null];
      await saveColorPresets(presets);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@color_presets', JSON.stringify(presets));
    });

    test('saveColorPresets should throw on error', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      await expect(saveColorPresets([null, null])).rejects.toThrow('Storage error');
    });
  });

  describe('Password Management', () => {
    test('isPasswordSet should return true when password exists', async () => {
      AsyncStorage.getItem.mockResolvedValue('hashedpassword');
      const result = await isPasswordSet();
      expect(result).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@app_password');
    });

    test('isPasswordSet should return false when no password exists', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await isPasswordSet();
      expect(result).toBe(false);
    });

    test('isPasswordSet should return false on error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await isPasswordSet();
      expect(result).toBe(false);
    });

    test('setPassword should hash and save password', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      await setPassword('mypassword');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@app_password', expect.any(String));
      // Verify the stored value is not the plain password
      const savedHash = AsyncStorage.setItem.mock.calls[0][1];
      expect(savedHash).not.toBe('mypassword');
    });

    test('setPassword should throw on error', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      await expect(setPassword('mypassword')).rejects.toThrow('Storage error');
    });

    test('verifyPassword should return true for correct password', async () => {
      // First set a password to get the hash
      AsyncStorage.setItem.mockResolvedValue();
      await setPassword('testpassword');
      const storedHash = AsyncStorage.setItem.mock.calls[0][1];

      // Now verify the same password
      AsyncStorage.getItem.mockResolvedValue(storedHash);
      const result = await verifyPassword('testpassword');
      expect(result).toBe(true);
    });

    test('verifyPassword should return false for incorrect password', async () => {
      // First set a password to get the hash
      AsyncStorage.setItem.mockResolvedValue();
      await setPassword('testpassword');
      const storedHash = AsyncStorage.setItem.mock.calls[0][1];

      // Now verify with wrong password
      AsyncStorage.getItem.mockResolvedValue(storedHash);
      const result = await verifyPassword('wrongpassword');
      expect(result).toBe(false);
    });

    test('verifyPassword should return false when no password set', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await verifyPassword('anypassword');
      expect(result).toBe(false);
    });

    test('verifyPassword should return false on error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await verifyPassword('anypassword');
      expect(result).toBe(false);
    });

    test('removePassword should remove password', async () => {
      AsyncStorage.removeItem.mockResolvedValue();
      await removePassword();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@app_password');
    });

    test('removePassword should throw on error', async () => {
      AsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));
      await expect(removePassword()).rejects.toThrow('Storage error');
    });
  });

  describe('Font Management', () => {
    test('loadFontNames should return saved font', async () => {
      AsyncStorage.getItem.mockResolvedValue('Caveat');
      const result = await loadFontNames();
      expect(result).toBe('Caveat');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@font_names');
    });

    test('loadFontNames should return default when no font saved', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await loadFontNames();
      expect(result).toBe('DancingScript');
    });

    test('loadFontNames should return default on error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await loadFontNames();
      expect(result).toBe('DancingScript');
    });

    test('saveFontNames should save font', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      await saveFontNames('Caveat');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@font_names', 'Caveat');
    });

    test('saveFontNames should throw on error', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      await expect(saveFontNames('Caveat')).rejects.toThrow('Storage error');
    });

    test('loadFontHeaders should return saved font', async () => {
      AsyncStorage.getItem.mockResolvedValue('Pacifico');
      const result = await loadFontHeaders();
      expect(result).toBe('Pacifico');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@font_headers');
    });

    test('loadFontHeaders should return default when no font saved', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await loadFontHeaders();
      expect(result).toBe('DancingScript');
    });

    test('loadFontHeaders should return default on error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await loadFontHeaders();
      expect(result).toBe('DancingScript');
    });

    test('saveFontHeaders should save font', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      await saveFontHeaders('Pacifico');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@font_headers', 'Pacifico');
    });

    test('saveFontHeaders should throw on error', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      await expect(saveFontHeaders('Pacifico')).rejects.toThrow('Storage error');
    });

    test('loadFontItems should return saved font', async () => {
      AsyncStorage.getItem.mockResolvedValue('Lobster');
      const result = await loadFontItems();
      expect(result).toBe('Lobster');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@font_items');
    });

    test('loadFontItems should return default when no font saved', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await loadFontItems();
      expect(result).toBe('System');
    });

    test('loadFontItems should return default on error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await loadFontItems();
      expect(result).toBe('System');
    });

    test('saveFontItems should save font', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      await saveFontItems('Lobster');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@font_items', 'Lobster');
    });

    test('saveFontItems should throw on error', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      await expect(saveFontItems('Lobster')).rejects.toThrow('Storage error');
    });

    test('loadFontTitles should return saved font', async () => {
      AsyncStorage.getItem.mockResolvedValue('Satisfy');
      const result = await loadFontTitles();
      expect(result).toBe('Satisfy');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@font_titles');
    });

    test('loadFontTitles should return default when no font saved', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await loadFontTitles();
      expect(result).toBe('DancingScript');
    });

    test('loadFontTitles should return default on error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await loadFontTitles();
      expect(result).toBe('DancingScript');
    });

    test('saveFontTitles should save font', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      await saveFontTitles('Satisfy');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@font_titles', 'Satisfy');
    });

    test('saveFontTitles should throw on error', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      await expect(saveFontTitles('Satisfy')).rejects.toThrow('Storage error');
    });

    test('getFontFamily should return correct font family for valid ID', () => {
      expect(getFontFamily('DancingScript')).toBe('DancingScript_400Regular');
      expect(getFontFamily('Caveat')).toBe('Caveat_400Regular');
      expect(getFontFamily('Pacifico')).toBe('Pacifico_400Regular');
    });

    test('getFontFamily should return null for System font', () => {
      expect(getFontFamily('System')).toBe(null);
    });

    test('getFontFamily should return null for unknown font ID', () => {
      expect(getFontFamily('UnknownFont')).toBe(null);
    });

    test('AVAILABLE_FONTS should contain expected fonts', () => {
      expect(AVAILABLE_FONTS).toBeDefined();
      expect(AVAILABLE_FONTS.length).toBeGreaterThan(0);
      expect(AVAILABLE_FONTS.find(f => f.id === 'System')).toBeDefined();
      expect(AVAILABLE_FONTS.find(f => f.id === 'DancingScript')).toBeDefined();
    });
  });

  describe('Language Management', () => {
    test('loadLanguage should return saved language', async () => {
      AsyncStorage.getItem.mockResolvedValue('en');
      const result = await loadLanguage();
      expect(result).toBe('en');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@app_language');
    });

    test('loadLanguage should return default when no language saved', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const result = await loadLanguage();
      expect(result).toBe('fr');
    });

    test('loadLanguage should return default on error', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await loadLanguage();
      expect(result).toBe('fr');
    });

    test('saveLanguage should save language', async () => {
      AsyncStorage.setItem.mockResolvedValue();
      await saveLanguage('en');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@app_language', 'en');
    });

    test('saveLanguage should throw on error', async () => {
      AsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      await expect(saveLanguage('en')).rejects.toThrow('Storage error');
    });
  });
});
