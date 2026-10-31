import 'expo-router/entry';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widgets/widget-task-handler';

// Android home screen widget: drawn by a headless task, even when the app is closed
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
}
