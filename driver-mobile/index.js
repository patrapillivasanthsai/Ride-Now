import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './src/App';
import {name as appName} from './app.json';

// Register FCM Background Message Handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM Background Push Received]:', remoteMessage.notification?.title, remoteMessage.notification?.body);
});

AppRegistry.registerComponent(appName, () => App);
