import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { isPasswordSet, setPassword, verifyPassword } from '../utils/storage';

export default function LockScreen({ onUnlock }) {
  const [password, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    checkPasswordStatus();
  }, []);

  const checkPasswordStatus = async () => {
    const hasPassword = await isPasswordSet();
    setIsSettingUp(!hasPassword);
  };

  const handleSubmit = async () => {
    if (isSettingUp) {
      // Setting up new password
      if (password.length < 4) {
        Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 4 caractères');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
        return;
      }

      try {
        await setPassword(password);
        Alert.alert('Succès', 'Mot de passe créé avec succès', [
          {
            text: 'OK',
            onPress: () => {
              setPasswordInput('');
              setConfirmPassword('');
              onUnlock();
            },
          },
        ]);
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de créer le mot de passe');
      }
    } else {
      // Verifying password
      const isValid = await verifyPassword(password);

      if (isValid) {
        setPasswordInput('');
        onUnlock();
      } else {
        Alert.alert('Erreur', 'Mot de passe incorrect');
        setPasswordInput('');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="lock" size={80} color="#FF6B9D" />
        </View>

        <Text style={styles.title}>
          {isSettingUp ? 'Créer un mot de passe' : 'Déverrouiller l\'application'}
        </Text>

        {isSettingUp && (
          <Text style={styles.subtitle}>
            Protégez vos données avec un mot de passe
          </Text>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            value={password}
            onChangeText={setPasswordInput}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={isSettingUp ? null : handleSubmit}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <MaterialIcons
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={24}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        {isSettingUp && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Confirmer le mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSubmit}
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>
            {isSettingUp ? 'Créer' : 'Déverrouiller'}
          </Text>
        </TouchableOpacity>

        {isSettingUp && (
          <Text style={styles.hint}>
            Minimum 4 caractères
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF0F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  submitButton: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FF6B9D',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  hint: {
    marginTop: 16,
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
