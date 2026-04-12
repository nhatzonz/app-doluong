import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { activateKeepAwakeAsync } from 'expo-keep-awake';

import { MeasurementProvider } from './src/context/MeasurementContext';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import ChartScreen from './src/screens/ChartScreen';
import ResultScreen from './src/screens/ResultScreen';

activateKeepAwakeAsync();

const Tab = createBottomTabNavigator();

function TabIcon({ label }) {
  const icons = {
    'Do Luong': '📱',
    'Ban Do': '🗺',
    'Bieu Do': '📊',
    'Ket Qua': '📋',
  };
  return <Text style={{ fontSize: 20 }}>{icons[label] || '📱'}</Text>;
}

export default function App() {
  return (
    <MeasurementProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: () => <TabIcon label={route.name} />,
            tabBarActiveTintColor: '#1976D2',
            tabBarInactiveTintColor: '#757575',
            headerShown: false,
            tabBarStyle: {
              paddingBottom: 6,
              paddingTop: 6,
              height: 60,
            },
          })}
        >
          <Tab.Screen name="Do Luong" component={HomeScreen} />
          <Tab.Screen name="Ban Do" component={MapScreen} />
          <Tab.Screen name="Bieu Do" component={ChartScreen} />
          <Tab.Screen name="Ket Qua" component={ResultScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </MeasurementProvider>
  );
}
