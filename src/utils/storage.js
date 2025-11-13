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
