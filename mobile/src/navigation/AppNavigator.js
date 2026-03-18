import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

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

const Stack = createStackNavigator();

// All screens in a single flat navigator — no header shown (each screen manages its own)
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#f5f5f5' },
          // Smooth slide animation
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        {/* Driver Flow */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ParkingPlanner" component={ParkingPlannerScreen} />
        <Stack.Screen name="TrackLocation" component={TrackLocationScreen} />
        <Stack.Screen name="Priority" component={PriorityScreen} />
        <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
        <Stack.Screen name="ParkingDetail" component={ParkingDetailScreen} />

        {/* Owner Flow */}
        <Stack.Screen name="OwnerHome" component={OwnerHomeScreen} />
        <Stack.Screen name="ListParking" component={ListParkingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
