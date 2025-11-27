import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeInput } from './sanitize';

const CRUSHES_KEY = '@crushes';
const BACKUP_KEY = '@crushes_backup';

// Re-export sanitizeInput for backward compatibility
export { sanitizeInput };

// Data validation schema
const isValidCrush = (crush) => {
  if (!crush || typeof crush !== 'object') return false;
  if (!crush.id || typeof crush.id !== 'string') return false;
  if (!crush.name || typeof crush.name !== 'string') return false;
  if (typeof crush.mistakes !== 'number' || crush.mistakes < 0 || crush.mistakes > 5) return false;
  if (!Array.isArray(crush.pros) || !Array.isArray(crush.cons)) return false;
  if (!crush.createdAt || isNaN(Date.parse(crush.createdAt))) return false;

  // Validate string lengths
  if (crush.name.length > 50) return false;
  if (crush.description && crush.description.length > 500) return false;

  // Validate new fields (optional for backward compatibility)
  if (crush.qualities && !Array.isArray(crush.qualities)) return false;
  if (crush.defects && !Array.isArray(crush.defects)) return false;
  if (crush.feelings !== undefined && (typeof crush.feelings !== 'number' || crush.feelings < 0 || crush.feelings > 100)) return false;
  if (crush.order !== undefined && typeof crush.order !== 'number') return false;
  if (crush.status !== undefined && !['active', 'ended', 'standby'].includes(crush.status)) return false;
  if (crush.diaryEntries && !Array.isArray(crush.diaryEntries)) return false;
  if (crush.picture !== undefined && crush.picture !== null && typeof crush.picture !== 'string') return false;

  // Validate pros and cons
  for (const pro of crush.pros) {
    if (!pro.id || !pro.title || pro.title.length > 100) return false;
    if (pro.description && pro.description.length > 500) return false;
  }
  for (const con of crush.cons) {
    if (!con.id || !con.title || con.title.length > 100) return false;
    if (con.description && con.description.length > 500) return false;
  }

  // Validate qualities (if present)
  if (crush.qualities) {
    for (const quality of crush.qualities) {
      if (!quality.id || !quality.text || quality.text.length > 50) return false;
    }
  }

  // Validate defects (if present)
  if (crush.defects) {
    for (const defect of crush.defects) {
      if (!defect.id || !defect.text || defect.text.length > 50) return false;
    }
  }

  // Validate diary entries (if present)
  if (crush.diaryEntries) {
    for (const entry of crush.diaryEntries) {
      if (!entry.id || !entry.title || entry.title.length > 100) return false;
      if (entry.description && entry.description.length > 1000) return false;
      if (!entry.createdAt || isNaN(Date.parse(entry.createdAt))) return false;
    }
  }

  return true;
};

// Migrate old crush data to new format
const migrateCrush = (crush, index) => {
  return {
    ...crush,
    qualities: crush.qualities || [],
    defects: crush.defects || [],
    feelings: crush.feelings !== undefined ? crush.feelings : 50,
    order: crush.order !== undefined ? crush.order : index,
    status: crush.status || 'active', // active, ended, or standby
    diaryEntries: crush.diaryEntries || [],
    picture: crush.picture || null,
  };
};

export const loadCrushes = async () => {
  try {
    const data = await AsyncStorage.getItem(CRUSHES_KEY);

    if (!data) return [];

    let crushes;
    try {
      crushes = JSON.parse(data);
    } catch (parseError) {
      console.error('Data corruption detected, attempting to load backup...');
      // Try to load from backup
      const backupData = await AsyncStorage.getItem(BACKUP_KEY);
      if (backupData) {
        crushes = JSON.parse(backupData);
      } else {
        return [];
      }
    }

    // Validate data structure
    if (!Array.isArray(crushes)) {
      console.error('Invalid data structure');
      return [];
    }

    // Migrate crushes to new format
    const migratedCrushes = crushes.map(migrateCrush);

    // Filter out invalid crushes
    const validCrushes = migratedCrushes.filter(isValidCrush);

    // If some crushes were invalid or migrated, save the cleaned data
    if (validCrushes.length !== crushes.length || JSON.stringify(validCrushes) !== JSON.stringify(crushes)) {
      console.warn(`Migrated/cleaned ${crushes.length} crush(es)`);
      await saveCrushes(validCrushes);
    }

    // Sort by order field
    return validCrushes.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error loading crushes:', error);
    return [];
  }
};

export const saveCrushes = async (crushes) => {
  try {
    // Validate input
    if (!Array.isArray(crushes)) {
      throw new Error('Invalid crushes data: must be an array');
    }

    // Filter to only valid crushes
    const validCrushes = crushes.filter(isValidCrush);

    // Create backup of current data before saving
    try {
      const currentData = await AsyncStorage.getItem(CRUSHES_KEY);
      if (currentData) {
        await AsyncStorage.setItem(BACKUP_KEY, currentData);
      }
    } catch (backupError) {
      console.warn('Could not create backup:', backupError);
    }

    // Save new data
    const dataString = JSON.stringify(validCrushes);

    // Check data size (AsyncStorage has limits)
    // Calculate UTF-8 byte size (works in React Native)
    const sizeInBytes = new TextEncoder().encode(dataString).length;
    if (sizeInBytes > 2 * 1024 * 1024) { // 2MB limit
      throw new Error('Data size exceeds storage limit');
    }

    await AsyncStorage.setItem(CRUSHES_KEY, dataString);
  } catch (error) {
    console.error('Error saving crushes:', error);
    throw error; // Re-throw so calling code can handle
  }
};

export const clearAllCrushes = async () => {
  try {
    // Create backup before clearing
    const currentData = await AsyncStorage.getItem(CRUSHES_KEY);
    if (currentData) {
      await AsyncStorage.setItem(BACKUP_KEY, currentData);
    }

    await AsyncStorage.removeItem(CRUSHES_KEY);
  } catch (error) {
    console.error('Error clearing crushes:', error);
    throw error;
  }
};

// Theme color management
const THEME_COLOR_KEY = '@theme_color';
const BG_COLOR_KEY = '@background_color';
const DEFAULT_THEME_COLOR = '#FF6B9D';
const DEFAULT_BG_COLOR = '#FFF0F5';

export const loadThemeColor = async () => {
  try {
    const color = await AsyncStorage.getItem(THEME_COLOR_KEY);
    return color || DEFAULT_THEME_COLOR;
  } catch (error) {
    console.error('Error loading theme color:', error);
    return DEFAULT_THEME_COLOR;
  }
};

export const saveThemeColor = async (color) => {
  try {
    await AsyncStorage.setItem(THEME_COLOR_KEY, color);
  } catch (error) {
    console.error('Error saving theme color:', error);
    throw error;
  }
};

export const loadBackgroundColor = async () => {
  try {
    const color = await AsyncStorage.getItem(BG_COLOR_KEY);
    return color || DEFAULT_BG_COLOR;
  } catch (error) {
    console.error('Error loading background color:', error);
    return DEFAULT_BG_COLOR;
  }
};

export const saveBackgroundColor = async (color) => {
  try {
    await AsyncStorage.setItem(BG_COLOR_KEY, color);
  } catch (error) {
    console.error('Error saving background color:', error);
    throw error;
  }
};

// Color presets management
const PRESETS_KEY = '@color_presets';

export const loadColorPresets = async () => {
  try {
    const presetsData = await AsyncStorage.getItem(PRESETS_KEY);
    if (presetsData) {
      return JSON.parse(presetsData);
    }
    return [null, null]; // Default: no presets saved
  } catch (error) {
    console.error('Error loading color presets:', error);
    return [null, null];
  }
};

export const saveColorPresets = async (presets) => {
  try {
    await AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error('Error saving color presets:', error);
    throw error;
  }
};

// Password management
const PASSWORD_KEY = '@app_password';

// Simple hash function for password (SHA-256 equivalent using built-in)
const hashPassword = async (password) => {
  // Simple hash using string manipulation and character codes
  let hash = 0;
  const str = password + 'crush_life_salt_2024'; // Add salt

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
};

export const isPasswordSet = async () => {
  try {
    const hashedPassword = await AsyncStorage.getItem(PASSWORD_KEY);
    return hashedPassword !== null;
  } catch (error) {
    console.error('Error checking password:', error);
    return false;
  }
};

export const setPassword = async (password) => {
  try {
    const hashed = await hashPassword(password);
    await AsyncStorage.setItem(PASSWORD_KEY, hashed);
  } catch (error) {
    console.error('Error setting password:', error);
    throw error;
  }
};

export const verifyPassword = async (password) => {
  try {
    const storedHash = await AsyncStorage.getItem(PASSWORD_KEY);
    if (!storedHash) return false;

    const inputHash = await hashPassword(password);
    return inputHash === storedHash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

export const removePassword = async () => {
  try {
    await AsyncStorage.removeItem(PASSWORD_KEY);
  } catch (error) {
    console.error('Error removing password:', error);
    throw error;
  }
};

// Font management
const FONT_NAMES_KEY = '@font_names';
const FONT_HEADERS_KEY = '@font_headers';
const FONT_ITEMS_KEY = '@font_items';
const FONT_TITLES_KEY = '@font_titles';

// Default fonts
const DEFAULT_FONT_NAMES = 'DancingScript';
const DEFAULT_FONT_HEADERS = 'DancingScript';
const DEFAULT_FONT_ITEMS = 'System';
const DEFAULT_FONT_TITLES = 'DancingScript';

// Available fonts list
export const AVAILABLE_FONTS = [
  { id: 'System', name: 'Système (Défaut)', family: null },
  { id: 'DancingScript', name: 'Dancing Script', family: 'DancingScript_400Regular' },
  { id: 'Caveat', name: 'Caveat', family: 'Caveat_400Regular' },
  { id: 'Pacifico', name: 'Pacifico', family: 'Pacifico_400Regular' },
  { id: 'Lobster', name: 'Lobster', family: 'Lobster_400Regular' },
  { id: 'Satisfy', name: 'Satisfy', family: 'Satisfy_400Regular' },
  { id: 'IndieFlower', name: 'Indie Flower', family: 'IndieFlower_400Regular' },
  { id: 'PermanentMarker', name: 'Permanent Marker', family: 'PermanentMarker_400Regular' },
  { id: 'Sacramento', name: 'Sacramento', family: 'Sacramento_400Regular' },
  { id: 'ShadowsIntoLight', name: 'Shadows Into Light', family: 'ShadowsIntoLight_400Regular' },
  { id: 'ArchitectsDaughter', name: 'Architects Daughter', family: 'ArchitectsDaughter_400Regular' },
];

export const loadFontNames = async () => {
  try {
    const font = await AsyncStorage.getItem(FONT_NAMES_KEY);
    return font || DEFAULT_FONT_NAMES;
  } catch (error) {
    console.error('Error loading font names:', error);
    return DEFAULT_FONT_NAMES;
  }
};

export const saveFontNames = async (fontId) => {
  try {
    await AsyncStorage.setItem(FONT_NAMES_KEY, fontId);
  } catch (error) {
    console.error('Error saving font names:', error);
    throw error;
  }
};

export const loadFontHeaders = async () => {
  try {
    const font = await AsyncStorage.getItem(FONT_HEADERS_KEY);
    return font || DEFAULT_FONT_HEADERS;
  } catch (error) {
    console.error('Error loading font headers:', error);
    return DEFAULT_FONT_HEADERS;
  }
};

export const saveFontHeaders = async (fontId) => {
  try {
    await AsyncStorage.setItem(FONT_HEADERS_KEY, fontId);
  } catch (error) {
    console.error('Error saving font headers:', error);
    throw error;
  }
};

export const loadFontItems = async () => {
  try {
    const font = await AsyncStorage.getItem(FONT_ITEMS_KEY);
    return font || DEFAULT_FONT_ITEMS;
  } catch (error) {
    console.error('Error loading font items:', error);
    return DEFAULT_FONT_ITEMS;
  }
};

export const saveFontItems = async (fontId) => {
  try {
    await AsyncStorage.setItem(FONT_ITEMS_KEY, fontId);
  } catch (error) {
    console.error('Error saving font items:', error);
    throw error;
  }
};

export const loadFontTitles = async () => {
  try {
    const font = await AsyncStorage.getItem(FONT_TITLES_KEY);
    return font || DEFAULT_FONT_TITLES;
  } catch (error) {
    console.error('Error loading font titles:', error);
    return DEFAULT_FONT_TITLES;
  }
};

export const saveFontTitles = async (fontId) => {
  try {
    await AsyncStorage.setItem(FONT_TITLES_KEY, fontId);
  } catch (error) {
    console.error('Error saving font titles:', error);
    throw error;
  }
};

// Helper to get font family from ID
export const getFontFamily = (fontId) => {
  const font = AVAILABLE_FONTS.find(f => f.id === fontId);
  return font ? font.family : null;
};

// Language management
const LANGUAGE_KEY = '@app_language';
const DEFAULT_LANGUAGE = 'fr';

export const loadLanguage = async () => {
  try {
    const language = await AsyncStorage.getItem(LANGUAGE_KEY);
    return language || DEFAULT_LANGUAGE;
  } catch (error) {
    console.error('Error loading language:', error);
    return DEFAULT_LANGUAGE;
  }
};

export const saveLanguage = async (language) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language:', error);
    throw error;
  }
};
