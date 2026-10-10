import { useEffect } from 'react';
import { Stack, useSegments, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { EvenlyProvider } from '../store';
import { AuthProvider, useAuth } from '../auth';
import { C } from '../theme';

SplashScreen.preventAutoHideAsync();

function Gate({ children }: { children: React.ReactNode }) {
  const { ready, session } = useAuth();
  const segments = useSegments();
  useEffect(() => {
    if (!ready) return;
    const onAuth = segments[0] === 'auth';
    if (!session && !onAuth) router.replace('/auth');
    else if (session && onAuth) router.replace('/');
  }, [ready, session, segments]);
  if (!ready) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <EvenlyProvider>
          <Gate>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: C.bg },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="auth" options={{ animation: 'fade' }} />
              <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
              <Stack.Screen name="new-group" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="group/[id]/index" />
              <Stack.Screen name="group/[id]/members" />
              <Stack.Screen name="group/[id]/add" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="group/[id]/expense/[eid]" />
              <Stack.Screen name="group/[id]/settle" />
            </Stack>
          </Gate>
        </EvenlyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
