/**
 * Root redirect — determines whether to send user to auth or app.
 */
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function Root() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (!profile?.family_id) return <Redirect href="/(auth)/onboard-family" />;
  return <Redirect href="/(tabs)" />;
}
