import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CrushDetailScreen from './CrushDetailScreen';
import { loadCrushes, saveCrushes } from '../utils/storage';

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

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock Animated API
jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    Animated: {
      ...actualRN.Animated,
      timing: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback()),
      })),
      loop: jest.fn(() => ({
        start: jest.fn(),
      })),
      parallel: jest.fn(() => ({
        start: jest.fn((callback) => callback && callback()),
      })),
      sequence: jest.fn(() => ({
        start: jest.fn(),
      })),
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        interpolate: jest.fn(() => ({
          interpolate: jest.fn(),
        })),
        stopAnimation: jest.fn(),
      })),
      createAnimatedComponent: jest.fn((component) => component),
    },
  };
});

describe('CrushDetailScreen', () => {
  const mockCrush = {
    id: '1',
    name: 'Test Crush',
    description: 'Test description',
    mistakes: 0,
    pros: [],
    cons: [],
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    loadCrushes.mockResolvedValue([mockCrush]);
    saveCrushes.mockResolvedValue();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    test('should render crush details', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('5 VIES RESTANTES')).toBeTruthy();
      });
    });

    test('should show correct lives count', async () => {
      const crushWith2Mistakes = { ...mockCrush, mistakes: 2 };
      loadCrushes.mockResolvedValue([crushWith2Mistakes]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('3 VIES RESTANTES')).toBeTruthy();
      });
    });

    test('should show game over state when mistakes >= 5', async () => {
      const destroyedCrush = { ...mockCrush, mistakes: 5 };
      loadCrushes.mockResolvedValue([destroyedCrush]);

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
      loadCrushes.mockResolvedValue([crushNoDesc]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Appuyez pour ajouter une description')).toBeTruthy();
      });
    });
  });

  describe('Adding Actions', () => {
    test('should add a good action (pro)', async () => {
      const { getByText, getByPlaceholderText, getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('✅ Bonnes Actions (0)')).toBeTruthy();
      });

      // Open good action modal
      const addButtons = getAllByText('+');
      fireEvent.press(addButtons[1]); // Second + button (for pros)

      await waitFor(() => {
        fireEvent.changeText(getByPlaceholderText('Titre'), 'Good deed');
        fireEvent.changeText(
          getByPlaceholderText('Description (optionnelle)'),
          'Helped me'
        );
      });

      fireEvent.press(getByText('Ajouter'));

      await waitFor(() => {
        expect(saveCrushes).toHaveBeenCalled();
        const savedData = saveCrushes.mock.calls[0][0];
        expect(savedData[0].pros).toHaveLength(1);
        expect(savedData[0].pros[0].title).toBe('Good deed');
      });
    });

    test('should add a bad action (con) and increase mistakes', async () => {
      const { getByText, getByPlaceholderText, getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('❌ Mauvaises Actions / Erreurs (0)')).toBeTruthy();
      });

      // Open bad action modal
      const addButtons = getAllByText('+');
      fireEvent.press(addButtons[0]); // First + button (for cons)

      await waitFor(() => {
        fireEvent.changeText(getByPlaceholderText('Titre'), 'Bad thing');
      });

      fireEvent.press(getByText('Ajouter'));

      await waitFor(() => {
        expect(saveCrushes).toHaveBeenCalled();
        const savedData = saveCrushes.mock.calls[0][0];
        expect(savedData[0].cons).toHaveLength(1);
        expect(savedData[0].mistakes).toBe(1); // Increased from 0
      });
    });

    test('should show error when adding action without title', async () => {
      const { getByText, getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const addButtons = getAllByText('+');
        fireEvent.press(addButtons[0]);
      });

      await waitFor(() => {
        fireEvent.press(getByText('Ajouter'));
      });

      expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Veuillez entrer un titre valide');
    });

    test('should sanitize action inputs', async () => {
      const { getByText, getByPlaceholderText, getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const addButtons = getAllByText('+');
        fireEvent.press(addButtons[1]); // Good action
      });

      await waitFor(() => {
        fireEvent.changeText(getByPlaceholderText('Titre'), '  Clean Me™  ');
      });

      fireEvent.press(getByText('Ajouter'));

      await waitFor(() => {
        expect(saveCrushes).toHaveBeenCalled();
        const savedData = saveCrushes.mock.calls[0][0];
        // Should be sanitized (trimmed, normalized)
        expect(savedData[0].pros[0].title).not.toContain('  ');
      });
    });

    test('should respect maxLength for action title (100 chars)', async () => {
      const { getByPlaceholderText, getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const addButtons = getAllByText('+');
        fireEvent.press(addButtons[0]);
      });

      const titleInput = await waitFor(() => getByPlaceholderText('Titre'));
      expect(titleInput.props.maxLength).toBe(100);
    });

    test('should respect maxLength for action description (500 chars)', async () => {
      const { getByPlaceholderText, getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const addButtons = getAllByText('+');
        fireEvent.press(addButtons[0]);
      });

      const descInput = await waitFor(() =>
        getByPlaceholderText('Description (optionnelle)')
      );
      expect(descInput.props.maxLength).toBe(500);
    });
  });

  describe('Game Over Logic', () => {
    test('should trigger game over when 5th mistake is made', async () => {
      const crushWith4Mistakes = { ...mockCrush, mistakes: 4 };
      loadCrushes.mockResolvedValue([crushWith4Mistakes]);

      Alert.alert.mockImplementation((title, message, buttons) => {
        // Auto-press OK button
        if (buttons && buttons[0]) {
          buttons[0].onPress && buttons[0].onPress();
        }
      });

      const { getByText, getByPlaceholderText, getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const addButtons = getAllByText('+');
        fireEvent.press(addButtons[0]); // Bad action
      });

      await waitFor(() => {
        fireEvent.changeText(getByPlaceholderText('Titre'), 'Final mistake');
      });

      fireEvent.press(getByText('Ajouter'));

      // Fast-forward timers for animation
      jest.advanceTimersByTime(7000);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          '☠️ GAME OVER ☠️',
          expect.stringContaining('perdu après 5 erreurs'),
          expect.any(Array)
        );
      });
    });

    test('should disable adding actions when game over', async () => {
      const destroyedCrush = { ...mockCrush, mistakes: 5 };
      loadCrushes.mockResolvedValue([destroyedCrush]);

      const { getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const addButtons = getAllByText('+');
        fireEvent.press(addButtons[0]);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Game Over',
        'Ce crush est game over et ne peut plus être modifié.'
      );
    });
  });

  describe('Editing Description', () => {
    test('should open edit description modal', async () => {
      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        fireEvent.press(getByText('Description'));
      });

      await waitFor(() => {
        expect(getByText('Modifier la Description')).toBeTruthy();
      });
    });

    test('should save edited description', async () => {
      const { getByText, getByPlaceholderText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        fireEvent.press(getByText('Description'));
      });

      await waitFor(() => {
        const descInput = getByPlaceholderText('Ajouter une description...');
        fireEvent.changeText(descInput, 'New description');
      });

      fireEvent.press(getByText('Sauvegarder'));

      await waitFor(() => {
        expect(saveCrushes).toHaveBeenCalled();
        const savedData = saveCrushes.mock.calls[0][0];
        expect(savedData[0].description).toContain('New description');
      });
    });

    test('should sanitize description input', async () => {
      const { getByText, getByPlaceholderText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        fireEvent.press(getByText('Description'));
      });

      await waitFor(() => {
        const descInput = getByPlaceholderText('Ajouter une description...');
        fireEvent.changeText(descInput, '  Sanitize me™  ');
      });

      fireEvent.press(getByText('Sauvegarder'));

      await waitFor(() => {
        const savedData = saveCrushes.mock.calls[0][0];
        expect(savedData[0].description).not.toContain('  ');
      });
    });

    test('should respect maxLength for description (500 chars)', async () => {
      const { getByText, getByPlaceholderText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        fireEvent.press(getByText('Description'));
      });

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
      loadCrushes.mockResolvedValue([crushWithPro]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const proItem = getByText('Good thing');
        fireEvent(proItem, 'longPress');
      });

      expect(Alert.alert).toHaveBeenCalledWith(
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
      loadCrushes.mockResolvedValue([crushWithCon]);

      Alert.alert.mockImplementation((title, message, buttons) => {
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
        expect(saveCrushes).toHaveBeenCalled();
        const savedData = saveCrushes.mock.calls[0][0];
        expect(savedData[0].mistakes).toBe(1); // Reduced from 2 to 1
        expect(savedData[0].cons).toHaveLength(0);
      });
    });
  });

  describe('Security & Edge Cases', () => {
    test('should handle storage errors when saving', async () => {
      saveCrushes.mockRejectedValue(new Error('Storage error'));

      const { getByText, getByPlaceholderText, getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const addButtons = getAllByText('+');
        fireEvent.press(addButtons[1]);
      });

      await waitFor(() => {
        fireEvent.changeText(getByPlaceholderText('Titre'), 'Test');
      });

      fireEvent.press(getByText('Ajouter'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Erreur',
          "Impossible de sauvegarder l'action"
        );
      });
    });

    test('should handle whitespace-only action title', async () => {
      const { getByText, getByPlaceholderText, getAllByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const addButtons = getAllByText('+');
        fireEvent.press(addButtons[0]);
      });

      await waitFor(() => {
        fireEvent.changeText(getByPlaceholderText('Titre'), '     ');
      });

      fireEvent.press(getByText('Ajouter'));

      expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Veuillez entrer un titre valide');
    });

    test('should navigate back when crush not found', async () => {
      loadCrushes.mockResolvedValue([]);

      const { getByText } = render(
        <CrushDetailScreen route={mockRoute} navigation={mockNavigation} />
      );

      // Should show loading initially
      await waitFor(() => {
        expect(getByText('Loading...')).toBeTruthy();
      });
    });
  });
});
