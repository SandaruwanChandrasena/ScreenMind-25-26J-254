// /**
//  * @format
//  */

// import { AppRegistry } from 'react-native';
// import App from './App';
// import { name as appName } from './app.json';

// // ✅ 1. Import your new background task
// import headlessTask from './src/features/socialMedia/services/headlessTask';

// AppRegistry.registerComponent(appName, () => App);

// // ✅ 2. Register the Headless Task to run in the background
// AppRegistry.registerHeadlessTask('RNAndroidNotificationListenerHeadlessJs', () => headlessTask);  

/**
 * @format
 */

import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";

// ✅ Import COMBINED headless task
// This handles BOTH social media (Component 1) 
// AND sleep notifications (Component 3)
import combinedHeadlessTask 
  from "./src/services/combinedHeadlessTask";

// ✅ Register main app component
AppRegistry.registerComponent(appName, () => App);

// ✅ Register SINGLE headless task (shared by both components)
// Only ONE registration allowed with this name
AppRegistry.registerHeadlessTask(
  "RNAndroidNotificationListenerHeadlessJs",
  () => combinedHeadlessTask
);