import 'react-native-gesture-handler';
import { AppRegistry, LogBox } from 'react-native';
import { enableScreens } from 'react-native-screens';
import App from './App';
import { name as appName } from './app.json';

// Suppress a few known development-only deprecation warnings coming from RN/core or third-party libs.
// These are development warnings only — to fully remove them update the affected libraries.
LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
  'ProgressBarAndroid has been extracted',
  'SafeAreaView has been deprecated',
  'Clipboard has been extracted',
  'PushNotificationIOS has been extracted',
]);

// Enable native screen optimization
enableScreens();

AppRegistry.registerComponent(appName, () => App);
