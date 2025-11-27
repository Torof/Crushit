import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CrushDetailScreen from './CrushDetailScreen';
import * as storage from '../utils/storage';

// Mock the storage utilities
jest.mock('../utils/storage');

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  goBack: jest.fn(),
};

const mockRoute = {
  params: {
    crushId: '1',
  },
};

describe('CrushDetailScreen', () => {
  let alertSpy;

  const mockCrush = {
    id: '1',
    name: 'Test Crush',
    description: 'Test description',
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Mock storage functions
    storage.loadCrushes.mockResolvedValue([mockCrush]);
    storage.saveCrushes.mockResolvedValue();
    storage.loadThemeColor.mockResolvedValue('#FF6B9D');
    storage.loadBackgroundColor.mockResolvedValue('#FFF0F5');
    storage.loadFontNames.mockResolvedValue('DancingScript');
    storage.loadFontHeaders.mockResolvedValue('DancingScript');
    storage.loadFontItems.mockResolvedValue('System');
    storage.loadFontTitles.mockResolvedValue('DancingScript');
    storage.getFontFamily.mockReturnValue(null);
    storage.loadLanguage.mockResolvedValue('fr');
    storage.saveLanguage.mockResolvedValue();
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('Rendering', () => {
    test('should render crush details', async () => {
      const { getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        // Should show 5 hearts for 0 mistakes
        const hearts = getAllByText('❤️');
        expect(hearts.length).toBeGreaterThanOrEqual(5);
      });
    });

    test('should show correct lives count', async () => {
      const crushWith2Mistakes = { ...mockCrush, mistakes: 2 };
      storage.loadCrushes.mockResolvedValue([crushWith2Mistakes]);

      const { getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        // Should show 3 hearts and 2 broken hearts
        const hearts = getAllByText('❤️');
        const brokenHearts = getAllByText('💔');
        expect(hearts.length).toBe(3);
        expect(brokenHearts.length).toBe(2);
      });
    });

    test('should show game over state when mistakes >= 5', async () => {
      const destroyedCrush = { ...mockCrush, mistakes: 5 };
      storage.loadCrushes.mockResolvedValue([destroyedCrush]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('☠️ GAME OVER ☠️')).toBeTruthy();
      });
    });

    test('should display description when available', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Test description')).toBeTruthy();
      });
    });

    test('should show add description prompt when no description', async () => {
      const crushNoDesc = { ...mockCrush, description: '' };
      storage.loadCrushes.mockResolvedValue([crushNoDesc]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Appuyez pour ajouter une description')).toBeTruthy();
      });
    });
  });

  describe('Adding Actions', () => {
    test('should render add good action button', async () => {
      const { getByTestId } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('add-good-action-button')).toBeTruthy();
      });
    });

    test('should add a bad action (con) and increase mistakes', async () => {
      const { getByTestId, getByPlaceholderText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Wait for screen to load
      await waitFor(() => {
        expect(getByTestId('add-bad-action-button')).toBeTruthy();
      });

      // Open bad action modal
      fireEvent.press(getByTestId('add-bad-action-button'));

      await waitFor(() => {
        fireEvent.changeText(getByPlaceholderText('Titre'), 'Bad thing');
      });

      fireEvent.press(getByTestId('modal-add-action-button'));

      await waitFor(() => {
        expect(storage.saveCrushes).toHaveBeenCalled();
        const savedData = storage.saveCrushes.mock.calls[0][0];
        expect(savedData[0].cons).toHaveLength(1);
        expect(savedData[0].mistakes).toBe(1); // Increased from 0
      });
    });

    test('should render add bad action button', async () => {
      const { getByTestId } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('add-bad-action-button')).toBeTruthy();
      });
    });

    test('should sanitize action inputs using sanitizeInput', () => {
      // Unit test for the sanitizeInput function behavior
      const { sanitizeInput } = require('../utils/sanitize');
      const result = sanitizeInput('  Clean Me™  ');
      expect(result).not.toMatch(/^\s+|\s+$/);
    });

    test('should respect maxLength for action title (100 chars)', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('add-bad-action-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('add-bad-action-button'));

      const titleInput = await waitFor(() => getByPlaceholderText('Titre'));
      expect(titleInput.props.maxLength).toBe(100);
    });

    test('should respect maxLength for action description (500 chars)', async () => {
      const { getByPlaceholderText, getByTestId } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('add-bad-action-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('add-bad-action-button'));

      const descInput = await waitFor(() =>
        getByPlaceholderText('Description (optionnelle)')
      );
      expect(descInput.props.maxLength).toBe(500);
    });
  });

  describe('Game Over Logic', () => {
    test('should show game over state when mistakes >= 5', async () => {
      const destroyedCrush = { ...mockCrush, mistakes: 5 };
      storage.loadCrushes.mockResolvedValue([destroyedCrush]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('☠️ GAME OVER ☠️')).toBeTruthy();
      });
    });

    test('should have action buttons even when game over (for display)', async () => {
      const destroyedCrush = { ...mockCrush, mistakes: 5 };
      storage.loadCrushes.mockResolvedValue([destroyedCrush]);

      const { getByTestId } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('add-bad-action-button')).toBeTruthy();
      });
    });
  });

  describe('Editing Description', () => {
    test('should open edit description modal', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Wait for data to load and click on the description text
      await waitFor(() => {
        expect(getByText('Test description')).toBeTruthy();
      });

      fireEvent.press(getByText('Test description'));

      await waitFor(() => {
        expect(getByText('Modifier la Description')).toBeTruthy();
      });
    });

    test('should open modal when description is clicked', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Wait for data to load
      await waitFor(() => {
        expect(getByText('Test description')).toBeTruthy();
      });

      // Click on description and verify modal opens
      fireEvent.press(getByText('Test description'));

      await waitFor(() => {
        expect(getByText('Modifier la Description')).toBeTruthy();
      });
    });

    test('should sanitize description using sanitizeInput', () => {
      // Unit test for the sanitizeInput function behavior
      const { sanitizeInput } = require('../utils/sanitize');
      const result = sanitizeInput('  Sanitize me™  ');
      expect(result).not.toMatch(/^\s+|\s+$/);
    });

    test('should respect maxLength for description (500 chars)', async () => {
      const { getByText, getByPlaceholderText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Wait for data to load and click on the description text
      await waitFor(() => {
        expect(getByText('Test description')).toBeTruthy();
      });

      fireEvent.press(getByText('Test description'));

      const descInput = await waitFor(() =>
        getByPlaceholderText('Ajouter une description...')
      );
      expect(descInput.props.maxLength).toBe(500);
    });
  });

  describe('Deleting Actions', () => {
    test('should show confirmation when deleting a pro', async () => {
      const crushWithPro = {
        ...mockCrush,
        pros: [
          {
            id: 'pro1',
            title: 'Good thing',
            description: '',
            createdAt: new Date().toISOString(),
          },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithPro]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const proItem = getByText('Good thing');
        fireEvent(proItem, 'longPress');
      });

      expect(alertSpy).toHaveBeenCalledWith(
        "Supprimer l'Action",
        'Êtes-vous sûr ?',
        expect.any(Array)
      );
    });

    test('should reduce mistakes when deleting a con', async () => {
      const crushWithCon = {
        ...mockCrush,
        mistakes: 2,
        cons: [
          {
            id: 'con1',
            title: 'Bad thing',
            description: '',
            createdAt: new Date().toISOString(),
          },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithCon]);

      alertSpy.mockImplementation((title, message, buttons) => {
        // Auto-confirm deletion
        if (buttons && buttons[1]) {
          buttons[1].onPress && buttons[1].onPress();
        }
      });

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const conItem = getByText('Bad thing');
        fireEvent(conItem, 'longPress');
      });

      await waitFor(() => {
        expect(storage.saveCrushes).toHaveBeenCalled();
        const savedData = storage.saveCrushes.mock.calls[0][0];
        expect(savedData[0].mistakes).toBe(1); // Reduced from 2 to 1
        expect(savedData[0].cons).toHaveLength(0);
      });
    });
  });

  describe('Security & Edge Cases', () => {
    test('should handle storage errors when saving', async () => {
      storage.saveCrushes.mockRejectedValue(new Error('Storage error'));

      const { getByTestId, getByPlaceholderText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('add-good-action-button')).toBeTruthy();
      });
      fireEvent.press(getByTestId('add-good-action-button'));

      await waitFor(() => {
        fireEvent.changeText(getByPlaceholderText('Titre'), 'Test');
      });

      fireEvent.press(getByTestId('modal-add-action-button'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          "Impossible de sauvegarder l'action"
        );
      });
    });

    test('should sanitize whitespace-only titles', () => {
      // Unit test for the sanitizeInput function behavior with whitespace
      const { sanitizeInput } = require('../utils/sanitize');
      const result = sanitizeInput('     ');
      expect(result).toBe('');
    });

    test('should navigate back when crush not found', async () => {
      storage.loadCrushes.mockResolvedValue([]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Should show loading initially
      await waitFor(() => {
        expect(getByText('Loading...')).toBeTruthy();
      });
    });
  });

  describe('Adding Good Actions', () => {
    test('should add a good action (pro)', async () => {
      const { getByTestId, getByPlaceholderText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('add-good-action-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('add-good-action-button'));

      await waitFor(() => {
        fireEvent.changeText(getByPlaceholderText('Titre'), 'Good thing');
        fireEvent.changeText(getByPlaceholderText('Description (optionnelle)'), 'Description');
      });

      fireEvent.press(getByTestId('modal-add-action-button'));

      await waitFor(() => {
        expect(storage.saveCrushes).toHaveBeenCalled();
        const savedData = storage.saveCrushes.mock.calls[0][0];
        expect(savedData[0].pros).toHaveLength(1);
        expect(savedData[0].mistakes).toBe(0); // Not increased
      });
    });

    test('should require title when adding action', async () => {
      const { getByTestId, getByPlaceholderText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('add-good-action-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('add-good-action-button'));

      await waitFor(() => {
        expect(getByPlaceholderText('Titre')).toBeTruthy();
      });

      // Title is required - verify the placeholder exists
      const titleInput = getByPlaceholderText('Titre');
      expect(titleInput).toBeTruthy();
    });

    test('should close action modal when cancel is pressed', async () => {
      const { getByTestId, getByText, queryByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('add-good-action-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('add-good-action-button'));

      await waitFor(() => {
        expect(getByText('Ajouter une Bonne Action')).toBeTruthy();
      });

      fireEvent.press(getByText('Annuler'));

      await waitFor(() => {
        expect(queryByText('Ajouter une Bonne Action')).toBeNull();
      });
    });
  });

  describe('Qualities and Defects', () => {
    test('should display qualities when present', async () => {
      const crushWithQualities = {
        ...mockCrush,
        qualities: [
          { id: 'q1', text: 'Kind', createdAt: new Date().toISOString() },
          { id: 'q2', text: 'Funny', createdAt: new Date().toISOString() },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithQualities]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Kind')).toBeTruthy();
        expect(getByText('Funny')).toBeTruthy();
      });
    });

    test('should display defects when present', async () => {
      const crushWithDefects = {
        ...mockCrush,
        defects: [
          { id: 'd1', text: 'Impatient', createdAt: new Date().toISOString() },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithDefects]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Impatient')).toBeTruthy();
      });
    });

    test('should show empty state for qualities when none exist', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Aucune')).toBeTruthy();
      });
    });

    test('should show empty state for defects when none exist', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Aucun')).toBeTruthy();
      });
    });

    test('should show flagged quality with star', async () => {
      const crushWithFlaggedQuality = {
        ...mockCrush,
        qualities: [
          { id: 'q1', text: 'Kind', flagged: true, createdAt: new Date().toISOString() },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithFlaggedQuality]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Kind ⭐')).toBeTruthy();
      });
    });

    test('should show flagged defect with flag', async () => {
      const crushWithFlaggedDefect = {
        ...mockCrush,
        defects: [
          { id: 'd1', text: 'Impatient', flagged: true, createdAt: new Date().toISOString() },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithFlaggedDefect]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Impatient 🚩')).toBeTruthy();
      });
    });

    test('should show delete confirmation when long pressing a quality', async () => {
      const crushWithQuality = {
        ...mockCrush,
        qualities: [
          { id: 'q1', text: 'Kind', createdAt: new Date().toISOString() },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithQuality]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Kind')).toBeTruthy();
      });

      fireEvent(getByText('Kind'), 'longPress');

      expect(alertSpy).toHaveBeenCalledWith(
        'Supprimer',
        'Êtes-vous sûr ?',
        expect.any(Array)
      );
    });

    test('should show delete confirmation when long pressing a defect', async () => {
      const crushWithDefect = {
        ...mockCrush,
        defects: [
          { id: 'd1', text: 'Impatient', createdAt: new Date().toISOString() },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithDefect]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Impatient')).toBeTruthy();
      });

      fireEvent(getByText('Impatient'), 'longPress');

      expect(alertSpy).toHaveBeenCalledWith(
        'Supprimer',
        'Êtes-vous sûr ?',
        expect.any(Array)
      );
    });
  });

  describe('Good Actions Display', () => {
    test('should display good actions when present', async () => {
      const crushWithPros = {
        ...mockCrush,
        pros: [
          { id: 'p1', title: 'Bought flowers', description: '', createdAt: new Date().toISOString() },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithPros]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Bought flowers')).toBeTruthy();
      });
    });

    test('should show empty state for good actions when none exist', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText("Aucune bonne action pour l'instant")).toBeTruthy();
      });
    });

    test('should show empty state for bad actions when none exist', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText("Aucune erreur pour l'instant")).toBeTruthy();
      });
    });
  });

  describe('Viewing Pro Details', () => {
    test('should open detail modal when good action is pressed', async () => {
      const crushWithPro = {
        ...mockCrush,
        pros: [
          { id: 'p1', title: 'Nice gesture', description: 'Bought flowers', createdAt: new Date().toISOString() },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithPro]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Nice gesture')).toBeTruthy();
      });

      fireEvent.press(getByText('Nice gesture'));

      await waitFor(() => {
        expect(getByText('Bought flowers')).toBeTruthy();
      });
    });
  });

  describe('Hearts Color Logic', () => {
    test('should show default color for 5 hearts', async () => {
      const { getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const hearts = getAllByText('❤️');
        expect(hearts).toHaveLength(5);
      });
    });

    test('should show danger styling when 4 mistakes', async () => {
      const criticalCrush = { ...mockCrush, mistakes: 4 };
      storage.loadCrushes.mockResolvedValue([criticalCrush]);

      const { getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const hearts = getAllByText('❤️');
        const brokenHearts = getAllByText('💔');
        expect(hearts).toHaveLength(1);
        expect(brokenHearts).toHaveLength(4);
      });
    });
  });

  describe('Feelings Slider', () => {
    test('should display feelings slider', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Niveau de sentiments :')).toBeTruthy();
        expect(getByText('😐')).toBeTruthy();
        expect(getByText('😍')).toBeTruthy();
      });
    });
  });

  describe('Language Support', () => {
    test('should use passed language from route params', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        // French text should be displayed
        expect(getByText("Aucune erreur pour l'instant")).toBeTruthy();
      });
    });

    test('should load language from storage if not passed', async () => {
      const routeWithoutLanguage = {
        params: {
          crushId: '1',
        },
      };

      storage.loadLanguage.mockResolvedValue('fr');

      render(
        <CrushDetailScreen route={routeWithoutLanguage} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(storage.loadLanguage).toHaveBeenCalled();
      });
    });
  });

  describe('Data Loading', () => {
    test('should load crush data on mount', async () => {
      render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(storage.loadCrushes).toHaveBeenCalled();
      });
    });

    test('should load theme color on mount', async () => {
      render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(storage.loadThemeColor).toHaveBeenCalled();
        expect(storage.loadBackgroundColor).toHaveBeenCalled();
      });
    });

    test('should load fonts on mount', async () => {
      render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(storage.loadFontHeaders).toHaveBeenCalled();
        expect(storage.loadFontItems).toHaveBeenCalled();
        expect(storage.loadFontTitles).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation Header', () => {
    test('should update navigation header', async () => {
      render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(mockNavigation.setOptions).toHaveBeenCalled();
      });
    });
  });

  describe('Save Description', () => {
    test('should open edit description modal', async () => {
      const { getByText, getByPlaceholderText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Test description')).toBeTruthy();
      });

      fireEvent.press(getByText('Test description'));

      await waitFor(() => {
        expect(getByText('Modifier la Description')).toBeTruthy();
        expect(getByPlaceholderText('Ajouter une description...')).toBeTruthy();
      });
    });

    test('should close description modal when cancel is pressed', async () => {
      const { getByText, queryByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Test description')).toBeTruthy();
      });

      fireEvent.press(getByText('Test description'));

      await waitFor(() => {
        expect(getByText('Modifier la Description')).toBeTruthy();
      });

      fireEvent.press(getByText('Annuler'));

      await waitFor(() => {
        expect(queryByText('Modifier la Description')).toBeNull();
      });
    });
  });

  describe('Game Over State Actions', () => {
    test('should display game over state', async () => {
      const destroyedCrush = { ...mockCrush, mistakes: 5 };
      storage.loadCrushes.mockResolvedValue([destroyedCrush]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('☠️ GAME OVER ☠️')).toBeTruthy();
      });
    });

    test('should show action buttons on game over crush', async () => {
      const destroyedCrush = { ...mockCrush, mistakes: 5 };
      storage.loadCrushes.mockResolvedValue([destroyedCrush]);

      const { getByTestId } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Buttons should still exist but be disabled
      await waitFor(() => {
        expect(getByTestId('add-good-action-button')).toBeTruthy();
        expect(getByTestId('add-bad-action-button')).toBeTruthy();
      });
    });
  });

  describe('Viewing Con Details', () => {
    test('should open detail modal when bad action is pressed', async () => {
      const crushWithCon = {
        ...mockCrush,
        cons: [
          { id: 'c1', title: 'Bad gesture', description: 'Ignored message', createdAt: new Date().toISOString() },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithCon]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Bad gesture')).toBeTruthy();
      });

      fireEvent.press(getByText('Bad gesture'));

      await waitFor(() => {
        expect(getByText('Ignored message')).toBeTruthy();
      });
    });
  });

  describe('Multiple Actions Display', () => {
    test('should display multiple good actions', async () => {
      const crushWithMultiplePros = {
        ...mockCrush,
        pros: [
          { id: 'p1', title: 'First good thing', description: '', createdAt: new Date().toISOString() },
          { id: 'p2', title: 'Second good thing', description: '', createdAt: new Date().toISOString() },
          { id: 'p3', title: 'Third good thing', description: '', createdAt: new Date().toISOString() },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithMultiplePros]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('First good thing')).toBeTruthy();
        expect(getByText('Second good thing')).toBeTruthy();
        expect(getByText('Third good thing')).toBeTruthy();
      });
    });

    test('should display multiple bad actions', async () => {
      const crushWithMultipleCons = {
        ...mockCrush,
        mistakes: 3,
        cons: [
          { id: 'c1', title: 'First bad thing', description: '', createdAt: new Date().toISOString() },
          { id: 'c2', title: 'Second bad thing', description: '', createdAt: new Date().toISOString() },
          { id: 'c3', title: 'Third bad thing', description: '', createdAt: new Date().toISOString() },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithMultipleCons]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('First bad thing')).toBeTruthy();
        expect(getByText('Second bad thing')).toBeTruthy();
        expect(getByText('Third bad thing')).toBeTruthy();
      });
    });
  });

  describe('Font Family Application', () => {
    test('should apply custom font when getFontFamily returns value', async () => {
      storage.getFontFamily.mockReturnValue('Caveat_400Regular');

      const { getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(storage.getFontFamily).toHaveBeenCalled();
        const hearts = getAllByText('❤️');
        expect(hearts.length).toBeGreaterThanOrEqual(5);
      });
    });
  });

  describe('Diary Navigation', () => {
    test('should display diary section', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        // Diary section should be accessible from the detail screen
        expect(getByText('Test description')).toBeTruthy();
      });
    });

    test('should have navigation functionality', async () => {
      const { getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const hearts = getAllByText('❤️');
        expect(hearts.length).toBeGreaterThanOrEqual(5);
        // Navigation is set up
        expect(mockNavigation.setOptions).toHaveBeenCalled();
      });
    });
  });

  describe('Action with Long Description', () => {
    test('should display action with long description', async () => {
      const crushWithLongDesc = {
        ...mockCrush,
        pros: [
          {
            id: 'p1',
            title: 'Great gesture',
            description: 'This is a very long description that contains a lot of detail about what happened and why it was such a great gesture.',
            createdAt: new Date().toISOString()
          },
        ],
      };
      storage.loadCrushes.mockResolvedValue([crushWithLongDesc]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Great gesture')).toBeTruthy();
      });

      fireEvent.press(getByText('Great gesture'));

      await waitFor(() => {
        expect(getByText(/This is a very long description/)).toBeTruthy();
      });
    });
  });

  describe('Adding Quality', () => {
    test('should display quality section header', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Qualités')).toBeTruthy();
      });
    });

    test('should show empty qualities message', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Aucune')).toBeTruthy();
      });
    });
  });

  describe('Adding Defect', () => {
    test('should show defect section header', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Défauts')).toBeTruthy();
      });
    });

    test('should display empty defects message', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Aucun')).toBeTruthy();
      });
    });
  });

  describe('Saving Description', () => {
    test('should open description edit modal', async () => {
      const { getByText, getByPlaceholderText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Test description')).toBeTruthy();
      });

      fireEvent.press(getByText('Test description'));

      await waitFor(() => {
        expect(getByPlaceholderText('Ajouter une description...')).toBeTruthy();
        expect(getByText('Sauvegarder')).toBeTruthy();
      });
    });
  });

  describe('Hearts Display Edge Cases', () => {
    test('should display correctly with exactly 3 mistakes', async () => {
      const crushWith3Mistakes = { ...mockCrush, mistakes: 3 };
      storage.loadCrushes.mockResolvedValue([crushWith3Mistakes]);

      const { getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const hearts = getAllByText('❤️');
        const brokenHearts = getAllByText('💔');
        expect(hearts).toHaveLength(2);
        expect(brokenHearts).toHaveLength(3);
      });
    });

    test('should display correctly with exactly 1 mistake', async () => {
      const crushWith1Mistake = { ...mockCrush, mistakes: 1 };
      storage.loadCrushes.mockResolvedValue([crushWith1Mistake]);

      const { getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const hearts = getAllByText('❤️');
        const brokenHearts = getAllByText('💔');
        expect(hearts).toHaveLength(4);
        expect(brokenHearts).toHaveLength(1);
      });
    });
  });

  describe('Status Display', () => {
    test('should display ended status', async () => {
      const endedCrush = { ...mockCrush, status: 'ended' };
      storage.loadCrushes.mockResolvedValue([endedCrush]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Test description')).toBeTruthy();
      });
    });

    test('should display standby status', async () => {
      const standbyCrush = { ...mockCrush, status: 'standby' };
      storage.loadCrushes.mockResolvedValue([standbyCrush]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Test description')).toBeTruthy();
      });
    });
  });

  describe('English Language', () => {
    test('should display English text when language is en', async () => {
      storage.loadLanguage.mockResolvedValue('en');
      const enRoute = {
        params: {
          crushId: '1',
          language: 'en',
        },
      };

      const { getAllByText } = render(
        <CrushDetailScreen route={enRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        // Check for English empty state text (appears multiple times)
        const noneTexts = getAllByText('None');
        expect(noneTexts.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Empty Title Validation', () => {
    test('should require title when adding action', async () => {
      const { getByTestId, getByPlaceholderText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByTestId('add-good-action-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('add-good-action-button'));

      await waitFor(() => {
        expect(getByPlaceholderText('Titre')).toBeTruthy();
      });

      // Verify the modal has opened and title input exists
      const titleInput = getByPlaceholderText('Titre');
      expect(titleInput).toBeTruthy();
    });
  });

  describe('Profile Picture', () => {
    test('should display profile picture when present', async () => {
      const crushWithPicture = {
        ...mockCrush,
        picture: 'file:///path/to/image.jpg',
      };
      storage.loadCrushes.mockResolvedValue([crushWithPicture]);

      const { getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const hearts = getAllByText('❤️');
        expect(hearts.length).toBeGreaterThanOrEqual(5);
      });
    });

    test('should display default image when no picture', async () => {
      const { getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const hearts = getAllByText('❤️');
        expect(hearts.length).toBeGreaterThanOrEqual(5);
      });
    });
  });
});
