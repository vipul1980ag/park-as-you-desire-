// Copyright (c) 2026 Vipul Agrawal. All Rights Reserved.
// Proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { AuthProvider, useAuth } from '../context/AuthContext';

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

const SCREEN_OPTIONS = {
  headerShown: false,
  cardStyle: { backgroundColor: '#0d1b2a' },
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};

function AppScreens() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d1b2a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#f0a500" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS} initialRouteName="Home">
      {/* Driver Flow — always accessible */}
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ParkingPlanner" component={ParkingPlannerScreen} />
      <Stack.Screen name="TrackLocation" component={TrackLocationScreen} />
      <Stack.Screen name="Priority" component={PriorityScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="ParkingDetail" component={ParkingDetailScreen} />

      {/* AI */}
      <Stack.Screen name="ParkBot" component={ParkBotScreen} />

      {/* Auth screens — shown when not logged in */}
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        /* Owner screens — only accessible when logged in */
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
    <AuthProvider>
      <NavigationContainer>
        <AppScreens />
      </NavigationContainer>
    </AuthProvider>
  );
}
