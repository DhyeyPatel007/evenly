import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HisabProvider } from '../store';
import { C } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <HisabProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: C.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="new-group" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="group/[id]/index" />
          <Stack.Screen name="group/[id]/add" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="group/[id]/settle" />
        </Stack>
      </HisabProvider>
    </SafeAreaProvider>
  );
}
