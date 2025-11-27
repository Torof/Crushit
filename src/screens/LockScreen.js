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
import { isPasswordSet, setPassword, verifyPassword, loadLanguage } from '../utils/storage';
import { translations } from '../utils/translations';

export default function LockScreen({ onUnlock }) {
  const [password, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState('fr');
  const t = translations[language];

  useEffect(() => {
    checkPasswordStatus();
    loadLang();
  }, []);

  const loadLang = async () => {
    const savedLanguage = await loadLanguage();
    setLanguage(savedLanguage);
  };

  const checkPasswordStatus = async () => {
    const hasPassword = await isPasswordSet();
    setIsSettingUp(!hasPassword);
  };

  const handleSubmit = async () => {
    if (isSettingUp) {
      // Setting up new password
      if (password.length < 4) {
        Alert.alert(t.error, t.passwordMinCharsNew);
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert(t.error, t.passwordsDontMatch);
        return;
      }

      try {
        await setPassword(password);
        Alert.alert(t.success, t.passwordCreated, [
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
        Alert.alert(t.error, t.unableToCreatePassword);
      }
    } else {
      // Verifying password
      const isValid = await verifyPassword(password);

      if (isValid) {
        setPasswordInput('');
        onUnlock();
      } else {
        Alert.alert(t.error, t.incorrectPassword);
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
          {isSettingUp ? t.createPassword : t.unlockApp}
        </Text>

        {isSettingUp && (
          <Text style={styles.subtitle}>
            {t.protectYourData}
          </Text>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t.password}
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
              placeholder={t.confirmNewPassword}
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
            {isSettingUp ? t.create : t.unlock}
          </Text>
        </TouchableOpacity>

        {isSettingUp && (
          <Text style={styles.hint}>
            {t.minimum4Chars}
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
