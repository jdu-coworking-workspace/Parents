import { StatusBar } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';

export function useGlobalStatusBar() {
  useFocusEffect(() => {
    // This runs whenever any screen comes into focus
    StatusBar.setBarStyle('light-content', true);
  });
}
