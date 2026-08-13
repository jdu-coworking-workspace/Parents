import React, { useContext } from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { I18nContext } from '@/contexts/i18n-context';
import { useThemeModeContext } from '@/contexts/theme-context';

export default function ThemeSwitcher() {
  const { setThemeMode, currentColorScheme } = useThemeModeContext();
  const { t } = useContext(I18nContext);
  const isDark = currentColorScheme === 'dark';

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={isDark ? 'moon' : 'sunny'}
          size={20}
          color="#fff"
        />
      </View>
      <ThemedText disableScaling style={styles.label}>
        {isDark ? t('darkMode') : t('lightMode')}
      </ThemedText>
      <View style={styles.rowSpacer} />
      <Switch
        value={isDark}
        onValueChange={nextIsDark => {
          setThemeMode(nextIsDark ? 'dark' : 'light');
        }}
        trackColor={{
          false: '#D1D5DB',
          true: '#226fc9',
        }}
        thumbColor="#fff"
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '400',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 3,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#64748B',
  },
  rowSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
});
