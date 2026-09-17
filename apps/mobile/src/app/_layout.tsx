import { Stack } from 'expo-router';
import { AuthProvider } from '@/auth/auth-context';
import { BadgeProvider } from '@/badges/badge-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <BadgeProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </BadgeProvider>
    </AuthProvider>
  );
}
