import React, { useContext } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { View, ActivityIndicator } from "react-native";

import { AuthContext } from "../context/AuthContext";

import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ProfileScreen from "../screens/ProfileScreen";

import {
  SMHomeScreen,
  SMJournalScreen,
  SMNotificationAnalysisScreen,
  SMGhostingScreen,
  SMInsightsScreen,
  SMHistoryScreen,
  SMPrivacyScreen,
  SM_ROUTES,
} from "../features/socialMedia";

import { colors } from "../theme/colors";

/* ✅ Isolation screens (ONLY ONCE — no duplicates) */
import IsolationOverviewScreen from "../features/isolation/screens/IsolationOverviewScreen";
import IsolationWhyScreen from "../features/isolation/screens/IsolationWhyScreen";
import IsolationInsightsScreen from "../features/isolation/screens/IsolationInsightsScreen";
import IsolationTrendsScreen from "../features/isolation/screens/IsolationTrendsScreen";
import IsolationSuggestionsScreen from "../features/isolation/screens/IsolationSuggestionsScreen";

/* ✅ NEW: Stats-style UI + detail screens */
import IsolationStatsScreen from "../features/isolation/screens/IsolationStatsScreen";
import MobilityInsightsScreen from "../features/isolation/screens/MobilityInsightsScreen";
import SocialInteractionScreen from "../features/isolation/screens/SocialInteractionScreen";
import BehaviourInsightsScreen from "../features/isolation/screens/BehaviourInsightsScreen";
import ProximityExposureScreen from "../features/isolation/screens/ProximityExposureScreen";
import IsolationPrivacyScreen from "../features/isolation/screens/IsolationPrivacyScreen";

const Stack = createStackNavigator();
const SocialMediaStack = createStackNavigator();

// ✅ Dark theme to prevent "white flash"
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

// ✅ Nested stack for Component 04 screens
function SocialMediaNavigator() {
  return (
    <SocialMediaStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg1 },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
        headerShadowVisible: false,
        cardStyle: { backgroundColor: colors.bg1 }, // ✅ prevents flash
      }}
    >
      <SocialMediaStack.Screen
        name={SM_ROUTES.Home}
        component={SMHomeScreen}
        options={{ title: "Social Media" }}
      />
      <SocialMediaStack.Screen
        name={SM_ROUTES.Journal}
        component={SMJournalScreen}
        options={{ title: "Daily Journal" }}
      />
      <SocialMediaStack.Screen
        name={SM_ROUTES.Notification}
        component={SMNotificationAnalysisScreen}
        options={{ title: "Notification Analysis" }}
      />
      <SocialMediaStack.Screen
        name={SM_ROUTES.Ghosting}
        component={SMGhostingScreen}
        options={{ title: "Ghosting Detector" }}
      />
      <SocialMediaStack.Screen
        name={SM_ROUTES.Insights}
        component={SMInsightsScreen}
        options={{ title: "Insights" }}
      />
      <SocialMediaStack.Screen
        name={SM_ROUTES.History}
        component={SMHistoryScreen}
        options={{ title: "History" }}
      />
      <SocialMediaStack.Screen
        name={SM_ROUTES.Privacy}
        component={SMPrivacyScreen}
        options={{ title: "Privacy & Ethics" }}
      />
    </SocialMediaStack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, initializing } = useContext(AuthContext);

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
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
          headerTitleStyle: { fontWeight: "800" },
          headerShadowVisible: false,
          cardStyle: { backgroundColor: colors.bg1 }, // ✅ prevents flash
        }}
      >
        {user ? (
          <>
            {/* ✅ Main */}
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ title: "Home" }}
            />

            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />

            <Stack.Screen
              name="SocialMediaStack"
              component={SocialMediaNavigator}
              options={{ headerShown: false }}
            />

            {/* ✅ Isolation module entry */}
            <Stack.Screen
              name="IsolationOverview"
              component={IsolationOverviewScreen}
              options={{ title: "Isolation" }}
            />

            {/* ✅ Stats screen (UI like your image) */}
            <Stack.Screen
              name="IsolationStats"
              component={IsolationStatsScreen}
              options={{ headerShown: false }}
            />

            {/* ✅ Explainability */}
            <Stack.Screen
              name="IsolationWhy"
              component={IsolationWhyScreen}
              options={{ title: "Why this risk?" }}
            />

            {/* ✅ Existing screens (keep) */}
            <Stack.Screen
              name="IsolationInsights"
              component={IsolationInsightsScreen}
              options={{ title: "Insights" }}
            />
            <Stack.Screen
              name="IsolationTrends"
              component={IsolationTrendsScreen}
              options={{ title: "Trends" }}
            />
            <Stack.Screen
              name="IsolationSuggestions"
              component={IsolationSuggestionsScreen}
              options={{ title: "Suggestions" }}
            />

            {/* ✅ NEW detail screens */}
            <Stack.Screen
              name="MobilityInsights"
              component={MobilityInsightsScreen}
              options={{ title: "Mobility" }}
            />
            <Stack.Screen
              name="SocialInteraction"
              component={SocialInteractionScreen}
              options={{ title: "Social Interaction" }}
            />
            <Stack.Screen
              name="BehaviourInsights"
              component={BehaviourInsightsScreen}
              options={{ title: "Behaviour" }}
            />
            <Stack.Screen
              name="ProximityExposure"
              component={ProximityExposureScreen}
              options={{ title: "Proximity" }}
            />

            {/* ✅ Privacy */}
            <Stack.Screen
              name="IsolationPrivacy"
              component={IsolationPrivacyScreen}
              options={{ title: "Privacy & Consent" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="SignIn"
              component={SignInScreen}
              options={{ title: "Sign In" }}
            />
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{ title: "Sign Up" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
