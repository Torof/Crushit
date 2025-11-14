import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CrushListScreen from './src/screens/CrushListScreen';
import CrushDetailScreen from './src/screens/CrushDetailScreen';
import DiaryScreen from './src/screens/DiaryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="CrushList"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FF6B9D',
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
