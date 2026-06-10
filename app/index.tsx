import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuthStore } from '@/stores/auth';

export default function Root() {
  const session = useAuthStore((s) => s.session);
  const sessionLoaded = useAuthStore((s) => s.sessionLoaded);
  const profile = useAuthStore((s) => s.profile);

  if (!sessionLoaded) return <View style={{ flex: 1 }} />;
  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!profile?.family_id) return <Redirect href="/(auth)/onboard-family" />;
  return <Redirect href="/(tabs)" />;
}
