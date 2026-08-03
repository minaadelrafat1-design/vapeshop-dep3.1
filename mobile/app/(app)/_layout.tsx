import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@store/authStore';
import { isStaffRole } from '@apptypes';

export default function AppLayout() {
  const profile = useAuthStore((s) => s.profile);

  if (!profile) return <Redirect href="/(auth)/login" />;
  if (!isStaffRole(profile.role)) return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="products" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="warehouses" />
      <Stack.Screen name="branches" />
      <Stack.Screen name="suppliers" />
      <Stack.Screen name="purchase-orders" />
      <Stack.Screen name="sales-orders" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="employees" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="help" />
    </Stack>
  );
}
