import 'expo-router/entry';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widgets/widget-task-handler';
import { registerBackgroundNotificationTask } from './widgets/background-notification-task';

// Android home screen widget: headless handler + background push updates
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
  registerBackgroundNotificationTask();
}
