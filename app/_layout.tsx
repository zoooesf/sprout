import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, retry: 1 },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
    ...Ionicons.font,
  });
  const router = useRouter();

  const setSession = useAuthStore((s) => s.setSession);
  const setSessionLoaded = useAuthStore((s) => s.setSessionLoaded);
  const loadUserData = useAuthStore((s) => s.loadUserData);

  useEffect(() => {
    // When launched from a home screen icon, always land on the home
    // route instead of whichever page was open when the icon was added.
    if (Platform.OS === 'web') {
      const nav = window.navigator as Navigator & { standalone?: boolean };
      const isStandalone =
        window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
      if (isStandalone && window.location.pathname !== '/') {
        router.replace('/');
      }
    }
  }, []);

  useEffect(() => {
    // Hydrate session on app start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadUserData().finally(setSessionLoaded);
      else setSessionLoaded();
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadUserData();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="library" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="photo-viewer" options={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }} />
      </Stack>
    </QueryClientProvider>
  );
}
