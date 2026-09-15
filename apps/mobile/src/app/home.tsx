import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter, type Href } from 'expo-router';

// expo-router's generated route types (.expo/types/router.d.ts) only refresh while `expo start`
// is running, so a brand-new route needs this cast until the dev server has rebuilt them once.
const FRIENDS_ROUTE = '/friends' as Href;
const PLANS_ROUTE = '/plans' as Href;
const PROFILE_ROUTE = '/profile' as Href;
import { useAuth } from '@/auth/auth-context';

export default function HomeScreen() {
  const router = useRouter();
  const { token, user, logout } = useAuth();

  if (!token || !user) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hola, {user?.name ?? ''}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <Pressable
        onPress={() => router.push(PLANS_ROUTE)}
        accessibilityRole="button"
        accessibilityLabel="Ir a Mis planes"
        style={[styles.button, styles.friendsButton]}
      >
        <Text style={styles.buttonLabel}>Planes</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push(FRIENDS_ROUTE)}
        accessibilityRole="button"
        accessibilityLabel="Ir a Amigos"
        style={[styles.button, styles.friendsButton]}
      >
        <Text style={styles.buttonLabel}>Amigos</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push(PROFILE_ROUTE)}
        accessibilityRole="button"
        accessibilityLabel="Ir a Perfil"
        style={[styles.button, styles.friendsButton]}
      >
        <Text style={styles.buttonLabel}>Perfil</Text>
      </Pressable>

      <Pressable
        onPress={logout}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F2',
    padding: 24,
    gap: 8,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#161B2E' },
  email: { fontSize: 14, color: '#8C8C88', marginBottom: 24 },
  button: {
    minHeight: 44,
    minWidth: 160,
    paddingHorizontal: 20,
    backgroundColor: '#161B2E',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsButton: { marginBottom: 12 },
  buttonLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
