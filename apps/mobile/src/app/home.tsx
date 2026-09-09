import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';

export default function HomeScreen() {
  const { token, user, logout } = useAuth();

  if (!token || !user) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hola, {user?.name ?? ''}</Text>
      <Text style={styles.email}>{user?.email}</Text>

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
  buttonLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
