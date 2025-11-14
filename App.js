import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppState } from 'react-native';
import CrushListScreen from './src/screens/CrushListScreen';
import CrushDetailScreen from './src/screens/CrushDetailScreen';
import DiaryScreen from './src/screens/DiaryScreen';
import LockScreen from './src/screens/LockScreen';
import { loadThemeColor, isPasswordSet } from './src/utils/storage';

const Stack = createNativeStackNavigator();

export default function App() {
  const [themeColor, setThemeColor] = useState('#FF6B9D');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    loadInitialThemeColor();
    checkAuthentication();

    // Listen to app state changes (foreground/background)
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const checkAuthentication = async () => {
    const hasPassword = await isPasswordSet();
    setNeedsPassword(hasPassword);
    setIsAuthenticated(!hasPassword); // If no password, auto-authenticate
    setIsCheckingAuth(false);
  };

  const handleAppStateChange = async (nextAppState) => {
    // If app comes to foreground and password is set, lock it
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      const hasPassword = await isPasswordSet();
      if (hasPassword) {
        setIsAuthenticated(false);
      }
    }

    appState.current = nextAppState;
  };

  const loadInitialThemeColor = async () => {
    const color = await loadThemeColor();
    setThemeColor(color);
  };

  const handleNavigationStateChange = useCallback(async () => {
    const color = await loadThemeColor();
    setThemeColor(color);
  }, []);

  const handleUnlock = () => {
    setIsAuthenticated(true);
  };

  // Show nothing while checking authentication
  if (isCheckingAuth) {
    return null;
  }

  // Show lock screen if not authenticated
  if (!isAuthenticated) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <NavigationContainer onStateChange={handleNavigationStateChange}>
      <Stack.Navigator
        initialRouteName="CrushList"
        screenOptions={{
          headerStyle: {
            backgroundColor: themeColor,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="CrushList"
          component={CrushListScreen}
          options={{ title: '💕 Vie des Crush' }}
        />
        <Stack.Screen
          name="CrushDetail"
          component={CrushDetailScreen}
          options={{ title: 'Détails du Crush' }}
        />
        <Stack.Screen
          name="Diary"
          component={DiaryScreen}
          options={{ title: 'Journal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
