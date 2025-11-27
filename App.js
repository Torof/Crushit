import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppState } from 'react-native';
import { useFonts } from 'expo-font';
import {
  DancingScript_400Regular,
  DancingScript_700Bold
} from '@expo-google-fonts/dancing-script';
import {
  Caveat_400Regular,
  Caveat_700Bold
} from '@expo-google-fonts/caveat';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { Lobster_400Regular } from '@expo-google-fonts/lobster';
import { Satisfy_400Regular } from '@expo-google-fonts/satisfy';
import { IndieFlower_400Regular } from '@expo-google-fonts/indie-flower';
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker';
import { Sacramento_400Regular } from '@expo-google-fonts/sacramento';
import { ShadowsIntoLight_400Regular } from '@expo-google-fonts/shadows-into-light';
import { ArchitectsDaughter_400Regular } from '@expo-google-fonts/architects-daughter';
import CrushListScreen from './src/screens/CrushListScreen';
import CrushDetailScreen from './src/screens/CrushDetailScreen';
import DiaryScreen from './src/screens/DiaryScreen';
import LockScreen from './src/screens/LockScreen';
import { loadThemeColor, isPasswordSet } from './src/utils/storage';

const Stack = createNativeStackNavigator();

export default function App() {
  // Load all fonts
  const [fontsLoaded] = useFonts({
    DancingScript_400Regular,
    DancingScript_700Bold,
    Caveat_400Regular,
    Caveat_700Bold,
    Pacifico_400Regular,
    Lobster_400Regular,
    Satisfy_400Regular,
    IndieFlower_400Regular,
    PermanentMarker_400Regular,
    Sacramento_400Regular,
    ShadowsIntoLight_400Regular,
    ArchitectsDaughter_400Regular,
  });

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

  // Show nothing while checking authentication or loading fonts
  if (isCheckingAuth || !fontsLoaded) {
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
