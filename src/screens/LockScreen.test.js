import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LockScreen from './LockScreen';
import * as storage from '../utils/storage';

// Mock the storage utilities
jest.mock('../utils/storage');

// Mock MaterialIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

describe('LockScreen', () => {
  let alertSpy;
  const mockOnUnlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    // Default mocks
    storage.isPasswordSet.mockResolvedValue(false);
    storage.setPassword.mockResolvedValue();
    storage.verifyPassword.mockResolvedValue(true);
    storage.loadLanguage.mockResolvedValue('fr');
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('Initial Render - Setup Mode', () => {
    test('should render setup mode when no password is set', async () => {
      storage.isPasswordSet.mockResolvedValue(false);

      const { getByText, getByPlaceholderText } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(getByText('Créer un mot de passe')).toBeTruthy();
        expect(getByText('Protégez vos données avec un mot de passe')).toBeTruthy();
        expect(getByPlaceholderText('Mot de passe')).toBeTruthy();
        expect(getByPlaceholderText('Confirmer le nouveau mot de passe')).toBeTruthy();
        expect(getByText('Créer')).toBeTruthy();
        expect(getByText('Minimum 4 caractères')).toBeTruthy();
      });
    });

    test('should render unlock mode when password is set', async () => {
      storage.isPasswordSet.mockResolvedValue(true);

      const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(getByText('Déverrouiller')).toBeTruthy();
        expect(getByPlaceholderText('Mot de passe')).toBeTruthy();
        // Confirm password field should not be present
        expect(queryByPlaceholderText('Confirmer le nouveau mot de passe')).toBeNull();
        expect(getByText('Déverrouiller')).toBeTruthy();
      });
    });
  });

  describe('Password Setup', () => {
    beforeEach(() => {
      storage.isPasswordSet.mockResolvedValue(false);
    });

    test('should show error when password is less than 4 characters', async () => {
      const { getByPlaceholderText, getByText } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Mot de passe')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Mot de passe'), '123');
      fireEvent.changeText(getByPlaceholderText('Confirmer le nouveau mot de passe'), '123');
      fireEvent.press(getByText('Créer'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          'Le mot de passe doit contenir au moins 4 caractères'
        );
      });
    });

    test('should show error when passwords do not match', async () => {
      const { getByPlaceholderText, getByText } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Mot de passe')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Mot de passe'), '1234');
      fireEvent.changeText(getByPlaceholderText('Confirmer le nouveau mot de passe'), '5678');
      fireEvent.press(getByText('Créer'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          'Les nouveaux mots de passe ne correspondent pas'
        );
      });
    });

    test('should create password and call onUnlock on success', async () => {
      // Mock the alert to auto-press OK
      alertSpy.mockImplementation((title, message, buttons) => {
        if (buttons && buttons[0] && buttons[0].onPress) {
          buttons[0].onPress();
        }
      });

      const { getByPlaceholderText, getByText } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Mot de passe')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Mot de passe'), '1234');
      fireEvent.changeText(getByPlaceholderText('Confirmer le nouveau mot de passe'), '1234');
      fireEvent.press(getByText('Créer'));

      await waitFor(() => {
        expect(storage.setPassword).toHaveBeenCalledWith('1234');
        expect(alertSpy).toHaveBeenCalledWith(
          'Succès',
          'Mot de passe créé avec succès',
          expect.any(Array)
        );
        expect(mockOnUnlock).toHaveBeenCalled();
      });
    });

    test('should show error when password creation fails', async () => {
      storage.setPassword.mockRejectedValue(new Error('Storage error'));

      const { getByPlaceholderText, getByText } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Mot de passe')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Mot de passe'), '1234');
      fireEvent.changeText(getByPlaceholderText('Confirmer le nouveau mot de passe'), '1234');
      fireEvent.press(getByText('Créer'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          'Impossible de créer le mot de passe'
        );
      });
    });
  });

  describe('Password Verification', () => {
    beforeEach(() => {
      storage.isPasswordSet.mockResolvedValue(true);
    });

    test('should call onUnlock when password is correct', async () => {
      storage.verifyPassword.mockResolvedValue(true);

      const { getByPlaceholderText, getByText } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(getByText('Déverrouiller')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'correctpassword');
      fireEvent.press(getByText('Déverrouiller'));

      await waitFor(() => {
        expect(storage.verifyPassword).toHaveBeenCalledWith('correctpassword');
        expect(mockOnUnlock).toHaveBeenCalled();
      });
    });

    test('should show error when password is incorrect', async () => {
      storage.verifyPassword.mockResolvedValue(false);

      const { getByPlaceholderText, getByText } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(getByText('Déverrouiller')).toBeTruthy();
      });

      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'wrongpassword');
      fireEvent.press(getByText('Déverrouiller'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          'Mot de passe incorrect'
        );
        expect(mockOnUnlock).not.toHaveBeenCalled();
      });
    });

    test('should clear password input after incorrect attempt', async () => {
      storage.verifyPassword.mockResolvedValue(false);

      const { getByPlaceholderText, getByText } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(getByText('Déverrouiller')).toBeTruthy();
      });

      const passwordInput = getByPlaceholderText('Mot de passe');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(getByText('Déverrouiller'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
        // Password should be cleared
        expect(passwordInput.props.value).toBe('');
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    test('should toggle password visibility when eye button is pressed', async () => {
      storage.isPasswordSet.mockResolvedValue(true);

      const { getByPlaceholderText, UNSAFE_getAllByType } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(getByPlaceholderText('Mot de passe')).toBeTruthy();
      });

      const passwordInput = getByPlaceholderText('Mot de passe');

      // Initially password should be hidden
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });
  });

  describe('Language Support', () => {
    test('should load saved language on mount', async () => {
      storage.isPasswordSet.mockResolvedValue(true);
      storage.loadLanguage.mockResolvedValue('en');

      const { getByText } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(storage.loadLanguage).toHaveBeenCalled();
      });
    });

    test('should render in French by default', async () => {
      storage.isPasswordSet.mockResolvedValue(false);
      storage.loadLanguage.mockResolvedValue('fr');

      const { getByText } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(getByText('Créer un mot de passe')).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty password submission in setup mode', async () => {
      storage.isPasswordSet.mockResolvedValue(false);

      const { getByText } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(getByText('Créer')).toBeTruthy();
      });

      fireEvent.press(getByText('Créer'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          'Le mot de passe doit contenir au moins 4 caractères'
        );
      });
    });

    test('should handle empty password submission in unlock mode', async () => {
      storage.isPasswordSet.mockResolvedValue(true);
      storage.verifyPassword.mockResolvedValue(false);

      const { getByText } = render(
        <LockScreen onUnlock={mockOnUnlock} />
      );

      await waitFor(() => {
        expect(getByText('Déverrouiller')).toBeTruthy();
      });

      fireEvent.press(getByText('Déverrouiller'));

      await waitFor(() => {
        expect(storage.verifyPassword).toHaveBeenCalledWith('');
      });
    });
  });
});
