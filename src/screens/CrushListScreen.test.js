import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CrushListScreen from './CrushListScreen';
import { loadCrushes, saveCrushes, clearAllCrushes } from '../utils/storage';

// Mock the storage utilities
jest.mock('../utils/storage');

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('CrushListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadCrushes.mockResolvedValue([]);
  });

  describe('Rendering', () => {
    test('should render empty state when no crushes', async () => {
      const { getByText } = render(<CrushListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText("Aucun crush pour l'instant")).toBeTruthy();
      });
    });

    test('should render crushes list', async () => {
      const mockCrushes = [
        {
          id: '1',
          name: 'Test Crush',
          description: 'Test desc',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];
      loadCrushes.mockResolvedValue(mockCrushes);

      const { getByText } = render(<CrushListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('Test Crush')).toBeTruthy();
      });
    });

    test('should display correct number of hearts based on mistakes', async () => {
      const mockCrushes = [
        {
          id: '1',
          name: 'Test',
          mistakes: 2, // Should show 3 hearts
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];
      loadCrushes.mockResolvedValue(mockCrushes);

      const { getAllByText } = render(<CrushListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        const hearts = getAllByText('❤️');
        const brokenHearts = getAllByText('💔');
        expect(hearts).toHaveLength(3);
        expect(brokenHearts).toHaveLength(2);
      });
    });
  });

  describe('Add Crush Modal', () => {
    test('should open modal when add button pressed', async () => {
      const { getByText, findByText } = render(<CrushListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('Ajouter')).toBeTruthy();
      });

      const addButton = getByText('Ajouter');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(findByText('Ajouter un Nouveau Crush')).toBeTruthy();
      });
    });

    test('should show error when submitting empty name', async () => {
      const { getByText, getByPlaceholderText } = render(
        <CrushListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        fireEvent.press(getByText('Ajouter'));
      });

      await waitFor(() => {
        const modalAddButton = getByText('Ajouter');
        fireEvent.press(modalAddButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Erreur',
          'Veuillez entrer un nom valide'
        );
      });
    });

    test('should sanitize and save crush with valid name', async () => {
      saveCrushes.mockResolvedValue();

      const { getByText, getByPlaceholderText } = render(
        <CrushListScreen navigation={mockNavigation} />
      );

      // Open modal
      await waitFor(() => {
        fireEvent.press(getByText('Ajouter'));
      });

      // Enter name with special characters
      const nameInput = getByPlaceholderText('Nom');
      fireEvent.changeText(nameInput, '  Test™  ');

      const descInput = getByPlaceholderText('Description (optionnelle)');
      fireEvent.changeText(descInput, 'Test description');

      // Submit
      const modalAddButtons = await waitFor(() => {
        const buttons = getByText(/Ajouter/);
        return buttons;
      });

      // Find the correct add button (modal one, not nav button)
      const allButtons = queryAllByText(/Ajouter/);
      fireEvent.press(allButtons[allButtons.length - 1]);

      await waitFor(() => {
        expect(saveCrushes).toHaveBeenCalled();
      });
    });

    test('should respect maxLength for name (50 chars)', async () => {
      const { getByText, getByPlaceholderText } = render(
        <CrushListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        fireEvent.press(getByText('Ajouter'));
      });

      const nameInput = getByPlaceholderText('Nom');

      expect(nameInput.props.maxLength).toBe(50);
    });

    test('should respect maxLength for description (500 chars)', async () => {
      const { getByText, getByPlaceholderText } = render(
        <CrushListScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        fireEvent.press(getByText('Ajouter'));
      });

      const descInput = getByPlaceholderText('Description (optionnelle)');

      expect(descInput.props.maxLength).toBe(500);
    });

    test('should close modal after successful add', async () => {
      saveCrushes.mockResolvedValue();

      const { getByText, getByPlaceholderText, queryByText } = render(
        <CrushListScreen navigation={mockNavigation} />
      );

      // Open modal
      fireEvent.press(getByText('Ajouter'));

      await waitFor(() => {
        expect(getByText('Ajouter un Nouveau Crush')).toBeTruthy();
      });

      // Fill form
      fireEvent.changeText(getByPlaceholderText('Nom'), 'Valid Name');

      // Submit
      const allButtons = getAllByText(/Ajouter/);
      fireEvent.press(allButtons[allButtons.length - 1]);

      await waitFor(() => {
        expect(queryByText('Ajouter un Nouveau Crush')).toBeNull();
      });
    });
  });

  describe('Navigation', () => {
    test('should navigate to detail screen when crush pressed', async () => {
      const mockCrushes = [
        {
          id: '123',
          name: 'Test Crush',
          mistakes: 0,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];
      loadCrushes.mockResolvedValue(mockCrushes);

      const { getByText } = render(<CrushListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        expect(getByText('Test Crush')).toBeTruthy();
      });

      fireEvent.press(getByText('Test Crush'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CrushDetail', {
        crushId: '123',
      });
    });
  });

  describe('Cemetery Modal', () => {
    test('should show destroyed crushes in cemetery', async () => {
      const mockCrushes = [
        {
          id: '1',
          name: 'Active',
          mistakes: 2,
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Destroyed',
          mistakes: 5, // Game over
          pros: [],
          cons: [],
          createdAt: new Date().toISOString(),
        },
      ];
      loadCrushes.mockResolvedValue(mockCrushes);

      const { getByText } = render(<CrushListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        // Should show badge with count
        expect(getByText('1')).toBeTruthy(); // Badge count
      });

      // Open cemetery
      fireEvent.press(getByText('Cimetière'));

      await waitFor(() => {
        expect(getByText('☠️ Destroyed')).toBeTruthy();
      });
    });

    test('should show empty state in cemetery when no destroyed crushes', async () => {
      const { getByText } = render(<CrushListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        fireEvent.press(getByText('Cimetière'));
      });

      await waitFor(() => {
        expect(getByText('Aucun crush game over')).toBeTruthy();
      });
    });
  });

  describe('Delete Operations', () => {
    test('should show confirmation alert when clearing all data', async () => {
      const { getByText } = render(<CrushListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        fireEvent.press(getByText('Effacer'));
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Effacer toutes les données',
        'Êtes-vous sûr de vouloir supprimer tous les crushes ?',
        expect.any(Array)
      );
    });

    test('should clear all crushes when confirmed', async () => {
      clearAllCrushes.mockResolvedValue();

      // Mock Alert.alert to auto-confirm
      Alert.alert.mockImplementation((title, message, buttons) => {
        buttons[1].onPress(); // Press "Tout effacer"
      });

      const { getByText } = render(<CrushListScreen navigation={mockNavigation} />);

      await waitFor(() => {
        fireEvent.press(getByText('Effacer'));
      });

      await waitFor(() => {
        expect(clearAllCrushes).toHaveBeenCalled();
      });
    });
  });

  describe('Security & Edge Cases', () => {
    test('should handle whitespace-only name', async () => {
      const { getByText, getByPlaceholderText } = render(
        <CrushListScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByText('Ajouter'));

      await waitFor(() => {
        fireEvent.changeText(getByPlaceholderText('Nom'), '     ');
      });

      const allButtons = getAllByText(/Ajouter/);
      fireEvent.press(allButtons[allButtons.length - 1]);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Erreur',
          'Veuillez entrer un nom valide'
        );
      });
    });

    test('should handle special unicode characters', async () => {
      saveCrushes.mockResolvedValue();

      const { getByText, getByPlaceholderText } = render(
        <CrushListScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByText('Ajouter'));

      await waitFor(() => {
        fireEvent.changeText(getByPlaceholderText('Nom'), 'Sarah 💕');
      });

      const allButtons = getAllByText(/Ajouter/);
      fireEvent.press(allButtons[allButtons.length - 1]);

      await waitFor(() => {
        expect(saveCrushes).toHaveBeenCalled();
        const savedData = saveCrushes.mock.calls[0][0];
        expect(savedData[savedData.length - 1].name).toContain('💕');
      });
    });

    test('should handle storage errors gracefully', async () => {
      saveCrushes.mockRejectedValue(new Error('Storage full'));

      const { getByText, getByPlaceholderText } = render(
        <CrushListScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByText('Ajouter'));

      await waitFor(() => {
        fireEvent.changeText(getByPlaceholderText('Nom'), 'Test');
      });

      const allButtons = getAllByText(/Ajouter/);
      fireEvent.press(allButtons[allButtons.length - 1]);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Erreur',
          'Impossible de sauvegarder les données'
        );
      });
    });
  });
});
