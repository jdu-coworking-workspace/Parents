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
            backgroundColor: '#3B82F6',
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
