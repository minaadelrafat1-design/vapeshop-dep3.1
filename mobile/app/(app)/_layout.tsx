import { Stack } from 'expo-router';
import { useAuthStore } from '@store/authStore';
import { isStaffRole } from '@apptypes';
import { Redirect } from 'expo-router';

export default function AppLayout() {
  const profile = useAuthStore((s) => s.profile);

  if (!profile) return <Redirect href="/(auth)/login" />;
  if (!isStaffRole(profile.role)) return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="more" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
