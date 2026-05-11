// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Text, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ssoLogin } from '../services/api';

// Driver screens
import HomeScreen from '../screens/HomeScreen';
import ParkingPlannerScreen from '../screens/ParkingPlannerScreen';
import TrackLocationScreen from '../screens/TrackLocationScreen';
import PriorityScreen from '../screens/PriorityScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import ParkingDetailScreen from '../screens/ParkingDetailScreen';

// Owner screens
import OwnerHomeScreen from '../screens/owner/OwnerHomeScreen';
import ListParkingScreen from '../screens/owner/ListParkingScreen';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// AI
import ParkBotScreen from '../screens/ParkBotScreen';

const Stack = createStackNavigator();

function SSOLoadingScreen() {
  const { T } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ActivityIndicator size="large" color={T.gold} />
      <Text style={{ color: T.textMuted, fontSize: 14 }}>Connecting to Safe2Go…</Text>
    </View>
  );
}

function AppScreens() {
  const { user, loading, login } = useAuth();
  const { T } = useTheme();
  const [ssoLoading, setSsoLoading] = useState(false);
  const ssoAttempted = useRef(false);

  const screenOptions = {
    headerShown: false,
    cardStyle: { backgroundColor: T.bg },
    gestureEnabled: true,
    gestureDirection: 'horizontal',
  };

  function parseParkingLink(url) {
    if (!url || !url.startsWith('parkingapp://')) return null;
    const withoutScheme = url.replace('parkingapp://', '');
    const [path, queryStr] = withoutScheme.split('?');
    const params = {};
    if (queryStr) {
      queryStr.split('&').forEach((pair) => {
        const eqIdx = pair.indexOf('=');
        if (eqIdx === -1) return;
        params[decodeURIComponent(pair.slice(0, eqIdx))] = decodeURIComponent(pair.slice(eqIdx + 1));
      });
    }
    return { path, params };
  }

  async function handleSSOResponse(url) {
    const parsed = parseParkingLink(url);
    if (!parsed || parsed.path !== 'sso') return false;
    const { jwt, error } = parsed.params;
    if (error || !jwt) return false;

    setSsoLoading(true);
    try {
      const userData = await ssoLogin(jwt);
      await login(userData);
    } catch {
      // SSO failed — user will see Login screen
    } finally {
      setSsoLoading(false);
    }
    return true;
  }

  async function attemptSafeGoSSO() {
    if (ssoAttempted.current) return;
    ssoAttempted.current = true;

    const ssoUrl = 'safe2go://sso?return=parkingapp://sso';
    const canOpen = await Linking.canOpenURL(ssoUrl).catch(() => false);
    if (!canOpen) return;

    setSsoLoading(true);
    try {
      await Linking.openURL(ssoUrl);
      await new Promise((resolve) => setTimeout(resolve, 8000));
    } catch {
      // ignore
    } finally {
      setSsoLoading(false);
    }
  }

  useEffect(() => {
    if (loading) return;

    const sub = Linking.addEventListener('url', ({ url }) => {
      handleSSOResponse(url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) handleSSOResponse(url);
    }).catch(() => {});

    if (!user) {
      attemptSafeGoSSO();
    }

    return () => sub.remove();
  }, [loading]);

  if (loading || ssoLoading) {
    return <SSOLoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions} initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ParkingPlanner" component={ParkingPlannerScreen} />
      <Stack.Screen name="TrackLocation" component={TrackLocationScreen} />
      <Stack.Screen name="Priority" component={PriorityScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="ParkingDetail" component={ParkingDetailScreen} />
      <Stack.Screen name="ParkBot" component={ParkBotScreen} />

      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="OwnerHome" component={OwnerHomeScreen} />
          <Stack.Screen name="ListParking" component={ListParkingScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppScreens />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
