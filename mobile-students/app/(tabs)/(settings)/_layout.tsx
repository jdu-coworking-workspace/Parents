import { Stack } from 'expo-router';

export default function SettingsLayout() {

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: 'Sozlamalar',
          headerStyle: {
            backgroundColor: '#1A4AAC',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
            color: '#fff',
          },
          headerShadowVisible: false,
          headerTitleAlign: 'center',
        }}
      />
    </Stack>
  );
}
