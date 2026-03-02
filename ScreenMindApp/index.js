/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// ✅ 1. Import your new background task
import headlessTask from './src/features/socialMedia/services/headlessTask';

AppRegistry.registerComponent(appName, () => App);

// ✅ 2. Register the Headless Task to run in the background
AppRegistry.registerHeadlessTask('RNAndroidNotificationListenerHeadlessJs', () => headlessTask);  