/**
 * ScreenMind - Research App
 * Main Entry Point
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// --- DUMMY SCREENS ---

const UsageScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.title}>📱 Screen Usage</Text>
    <Text style={styles.subtitle}>Analyzing Logs & Addiction Risk</Text>
    <View style={styles.placeholderBox}><Text>Graph Goes Here</Text></View>
  </View>
);

const SleepScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.title}>😴 Sleep Pattern</Text>
    <Text style={styles.subtitle}>Light Sensor & Accelerometer Data</Text>
    <View style={styles.placeholderBox}><Text>Sleep Score: 85</Text></View>
  </View>
);

const SocialScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.title}>💬 Social Interaction</Text>
    <Text style={styles.subtitle}>Sentiment Analysis (NLP)</Text>
    <View style={styles.placeholderBox}><Text>Mood: Positive</Text></View>
  </View>
);

const IsolationScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.title}>📍 Mobility & Isolation</Text>
    <Text style={styles.subtitle}>GPS & Movement Entropy</Text>
    <View style={styles.placeholderBox}><Text>Movement: High</Text></View>
  </View>
);

// --- NAVIGATION ---
const Tab = createBottomTabNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#6200EE' },
          headerTintColor: '#fff',
          tabBarActiveTintColor: '#6200EE',
          tabBarInactiveTintColor: 'gray',
        }}
      >
        <Tab.Screen name="Usage" component={UsageScreen} />
        <Tab.Screen name="Sleep" component={SleepScreen} />
        <Tab.Screen name="Social" component={SocialScreen} />
        <Tab.Screen name="Isolation" component={IsolationScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
  },
  placeholderBox: {
    width: '100%',
    height: 150,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
});

export default App;
