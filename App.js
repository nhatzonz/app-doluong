import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { activateKeepAwakeAsync } from 'expo-keep-awake';
import * as Linking from 'expo-linking';

import { MeasurementProvider } from './src/context/MeasurementContext';
import { SettingsProvider } from './src/features/settings/SettingsContext';
import { TripStoreProvider } from './src/features/trips/TripStoreContext';
import { TripAutoSaver } from './src/features/trips/TripAutoSaver';
import { useT } from './src/i18n';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import ChartScreen from './src/screens/ChartScreen';
import ResultScreen from './src/screens/ResultScreen';
import HistoryScreen from './src/features/history/HistoryScreen';
import TripDetailScreen from './src/features/trip/TripDetailScreen';
import SegmentDetailScreen from './src/features/trip/SegmentDetailScreen';
import CompareScreen from './src/features/compare/CompareScreen';
import StatsScreen from './src/features/stats/StatsScreen';
import SettingsScreen from './src/features/settings/SettingsScreen';
import IsoGuideScreen from './src/features/guide/IsoGuideScreen';
import { COLORS } from './src/utils/colors';

activateKeepAwakeAsync();

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Deep link: mo thang 1 man/chuyen, vd exp://<ip>:8081/--/trip/trip_123
// (build rieng: doluong://trip/trip_123)
const linking = {
  prefixes: [Linking.createURL('/'), 'doluong://'],
  config: {
    screens: {
      Tabs: {
        screens: {
          'Do Luong': 'measure',
          'Ban Do': 'map',
          'Bieu Do': 'charts',
          'Ket Qua': 'results',
          'Lich Su': 'history',
        },
      },
      TripDetail: 'trip/:id',
      SegmentDetail: { path: 'segment/:id/:index', parse: { index: Number } },
      Compare: 'compare/:a/:b',
      Stats: 'stats',
      Settings: 'settings',
      IsoGuide: 'guide',
    },
  },
};

// Giu nguyen ten route cu; chi doi nhan hien thi theo ngon ngu
const TAB_META = {
  'Do Luong': { icon: '●', key: 'tabs.measure' },
  'Ban Do': { icon: '◎', key: 'tabs.map' },
  'Bieu Do': { icon: '▲', key: 'tabs.charts' },
  'Ket Qua': { icon: '■', key: 'tabs.results' },
  'Lich Su': { icon: '☰', key: 'tabs.history' },
};

function TabIcon({ label, focused }) {
  const color = focused ? COLORS.primary : COLORS.textMuted;
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.iconGlyph, { color }]}>
        {TAB_META[label]?.icon || '●'}
      </Text>
    </View>
  );
}

function TabLabel({ label, focused }) {
  const { t } = useT();
  return (
    <Text
      style={[styles.tabLabel, { color: focused ? COLORS.primary : COLORS.textMuted }]}
      numberOfLines={1}
    >
      {TAB_META[label] ? t(TAB_META[label].key) : label}
    </Text>
  );
}

function MainTabs() {
  return (
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
      <Tab.Screen name="Lich Su" component={HistoryScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { t } = useT();
  // Moi man tu ve header (ScreenHeader) cung phong cach man cu → an header native.
  // title van giu de VoiceOver / lich su dieu huong doc dung ten man.
  const detailOptions = {
    headerShown: false,
    contentStyle: { backgroundColor: COLORS.bg },
  };
  return (
    <Stack.Navigator screenOptions={detailOptions}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: t('ui.trip.eyebrow') }} />
      <Stack.Screen
        name="SegmentDetail"
        component={SegmentDetailScreen}
        options={{ presentation: 'modal', title: t('ui.segment.eyebrow') }}
      />
      <Stack.Screen name="Compare" component={CompareScreen} options={{ title: t('compare.title') }} />
      <Stack.Screen name="Stats" component={StatsScreen} options={{ title: t('stats.title') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings.title') }} />
      <Stack.Screen name="IsoGuide" component={IsoGuideScreen} options={{ title: t('guide.title') }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <MeasurementProvider>
        <TripStoreProvider>
          <TripAutoSaver />
          <NavigationContainer linking={linking}>
            <RootNavigator />
          </NavigationContainer>
          <StatusBar style="dark" />
        </TripStoreProvider>
      </MeasurementProvider>
    </SettingsProvider>
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
