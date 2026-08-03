import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@lib/queryClient';
import { useAuthStore } from '@store/authStore';
import { LoadingScreen } from '@components/LoadingScreen';

export default function RootLayout() {
  const { initialized, initialize } = useAuthStore();

  React.useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  if (!initialized) return <LoadingScreen message="Starting LUXE ERP…" />;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </QueryClientProvider>
  );
}
