import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { activateKeepAwakeAsync } from 'expo-keep-awake';

import { MeasurementProvider } from './src/context/MeasurementContext';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import ChartScreen from './src/screens/ChartScreen';
import ResultScreen from './src/screens/ResultScreen';
import { COLORS } from './src/utils/colors';

activateKeepAwakeAsync();

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  const icons = {
    'Do Luong': '●',
    'Ban Do': '◎',
    'Bieu Do': '▲',
    'Ket Qua': '■',
  };
  const color = focused ? COLORS.primary : COLORS.textMuted;
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.iconGlyph, { color }]}>
        {icons[label] || '●'}
      </Text>
    </View>
  );
}

function TabLabel({ label, focused }) {
  const map = {
    'Do Luong': 'Đo',
    'Ban Do': 'Bản đồ',
    'Bieu Do': 'Biểu đồ',
    'Ket Qua': 'Kết quả',
  };
  return (
    <Text style={[styles.tabLabel, { color: focused ? COLORS.primary : COLORS.textMuted }]}>
      {map[label] || label}
    </Text>
  );
}

export default function App() {
  return (
    <MeasurementProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
            tabBarLabel: ({ focused }) => <TabLabel label={route.name} focused={focused} />,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textMuted,
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarItemStyle: styles.tabItem,
          })}
        >
          <Tab.Screen name="Do Luong" component={HomeScreen} />
          <Tab.Screen name="Ban Do" component={MapScreen} />
          <Tab.Screen name="Bieu Do" component={ChartScreen} />
          <Tab.Screen name="Ket Qua" component={ResultScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </MeasurementProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 24 : 14,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  tabItem: {
    paddingVertical: 4,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    fontSize: 18,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
