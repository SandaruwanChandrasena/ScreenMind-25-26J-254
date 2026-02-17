import React, { useContext } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { AuthContext } from '../context/AuthContext';

import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';

/* ========================= */
/* ✅ Social Media Screens */
/* ========================= */

import {
  SMHomeScreen,
  SMJournalScreen,
  SMNotificationAnalysisScreen,
  SMGhostingScreen,
  SMInsightsScreen,
  SMHistoryScreen,
  SMPrivacyScreen,
  SM_ROUTES,
} from '../features/socialMedia';

/* ========================= */
/* ✅ Isolation Screens */
/* ========================= */

import IsolationOverviewScreen from '../features/isolation/screens/IsolationOverviewScreen';
import IsolationWhyScreen from '../features/isolation/screens/IsolationWhyScreen';
import IsolationInsightsScreen from '../features/isolation/screens/IsolationInsightsScreen';
import IsolationTrendsScreen from '../features/isolation/screens/IsolationTrendsScreen';
import IsolationSuggestionsScreen from '../features/isolation/screens/IsolationSuggestionsScreen';
import IsolationStatsScreen from '../features/isolation/screens/IsolationStatsScreen';
import MobilityInsightsScreen from '../features/isolation/screens/MobilityInsightsScreen';
import SocialInteractionScreen from '../features/isolation/screens/SocialInteractionScreen';
import BehaviourInsightsScreen from '../features/isolation/screens/BehaviourInsightsScreen';
import ProximityExposureScreen from '../features/isolation/screens/ProximityExposureScreen';
import IsolationPrivacyScreen from '../features/isolation/screens/IsolationPrivacyScreen';

/* ========================= */
/* ✅ Sleep Screens */
/* ========================= */

import SleepHomeScreen from '../features/sleep/screens/SleepHomeScreen';
import MorningCheckInScreen from '../features/sleep/screens/MorningCheckInScreen';
import SleepDetailsScreen from '../features/sleep/screens/SleepDetailsScreen';
import DataPermissionsScreen from '../features/sleep/screens/DataPermissionsScreen';
import SnoringScreen from '../features/sleep/screens/SnoringScreen';

import { colors } from '../theme/colors';

const Stack = createStackNavigator();

/* ✅ Dark theme */
const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg1,
    card: colors.bg1,
    text: colors.text,
    border: colors.border,
  },
};

export default function AppNavigator() {
  const { user, initializing } = useContext(AuthContext);

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.bg1,
        }}
      >
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={NavTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg1 },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '900' },
          headerShadowVisible: false,
        }}
      >
        {user ? (
          <>
            {/* ========================= */}
            {/* Dashboard */}
            {/* ========================= */}
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={({ navigation }) => ({
                title: 'Home',
                headerRight: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Profile')}
                    style={{ marginRight: 16 }}
                  >
                    <Icon
                      name="person-circle-outline"
                      size={28}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                ),
              })}
            />

            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Profile' }}
            />

            {/* ========================= */}
            {/* Social Media Module */}
            {/* ========================= */}

            <Stack.Screen
              name={SM_ROUTES.Home}
              component={SMHomeScreen}
              options={{ title: 'Social Media' }}
            />
            <Stack.Screen
              name={SM_ROUTES.Journal}
              component={SMJournalScreen}
              options={{ title: 'Daily Journal' }}
            />
            <Stack.Screen
              name={SM_ROUTES.Notification}
              component={SMNotificationAnalysisScreen}
              options={{ title: 'Notification Analysis' }}
            />
            <Stack.Screen
              name={SM_ROUTES.Ghosting}
              component={SMGhostingScreen}
              options={{ title: 'Ghosting Detector' }}
            />
            <Stack.Screen
              name={SM_ROUTES.Insights}
              component={SMInsightsScreen}
              options={{ title: 'Insights' }}
            />
            <Stack.Screen
              name={SM_ROUTES.History}
              component={SMHistoryScreen}
              options={{ title: 'History' }}
            />
            <Stack.Screen
              name={SM_ROUTES.Privacy}
              component={SMPrivacyScreen}
              options={{ title: 'Privacy & Ethics' }}
            />

            {/* ========================= */}
            {/* Isolation Module */}
            {/* ========================= */}

            <Stack.Screen
              name="IsolationOverview"
              component={IsolationOverviewScreen}
              options={{ title: 'Isolation' }}
            />
            <Stack.Screen
              name="IsolationStats"
              component={IsolationStatsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="IsolationWhy"
              component={IsolationWhyScreen}
              options={{ title: 'Why this risk?' }}
            />
            <Stack.Screen
              name="IsolationInsights"
              component={IsolationInsightsScreen}
              options={{ title: 'Insights' }}
            />
            <Stack.Screen
              name="IsolationTrends"
              component={IsolationTrendsScreen}
              options={{ title: 'Trends' }}
            />
            <Stack.Screen
              name="IsolationSuggestions"
              component={IsolationSuggestionsScreen}
              options={{ title: 'Suggestions' }}
            />
            <Stack.Screen
              name="MobilityInsights"
              component={MobilityInsightsScreen}
              options={{ title: 'Mobility' }}
            />
            <Stack.Screen
              name="SocialInteraction"
              component={SocialInteractionScreen}
              options={{ title: 'Social Interaction' }}
            />
            <Stack.Screen
              name="BehaviourInsights"
              component={BehaviourInsightsScreen}
              options={{ title: 'Behaviour' }}
            />
            <Stack.Screen
              name="ProximityExposure"
              component={ProximityExposureScreen}
              options={{ title: 'Proximity' }}
            />
            <Stack.Screen
              name="IsolationPrivacy"
              component={IsolationPrivacyScreen}
              options={{ title: 'Privacy & Consent' }}
            />

            {/* ========================= */}
            {/* Sleep Module */}
            {/* ========================= */}

            <Stack.Screen
              name="SleepHome"
              component={SleepHomeScreen}
              options={{ title: 'Sleep' }}
            />
            <Stack.Screen
              name="SleepCheckIn"
              component={MorningCheckInScreen}
              options={{ title: 'Morning Check-In' }}
            />
            <Stack.Screen
              name="SleepDetails"
              component={SleepDetailsScreen}
              options={{ title: 'Sleep Details' }}
            />
            <Stack.Screen
              name="SleepPermissions"
              component={DataPermissionsScreen}
              options={{ title: 'Data & Permissions' }}
            />
            <Stack.Screen
              name="SleepSnoring"
              component={SnoringScreen}
              options={{ title: 'Snoring' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="SignIn"
              component={SignInScreen}
              options={{ title: 'Sign In' }}
            />
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{ title: 'Sign Up' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
