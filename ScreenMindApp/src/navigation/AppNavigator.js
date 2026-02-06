import React, { useContext } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

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
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={({ navigation }) => ({
                title: "Home",
                headerRight: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Profile")}
                    style={{ marginRight: 16 }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="person-circle-outline" size={28} color={colors.text} />
                  </TouchableOpacity>
                ),
              })}
            />

            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />

            <Stack.Screen
              name="SocialMediaStack"
              component={SocialMediaNavigator}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: "Sign In" }} />
            <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: "Sign Up" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
