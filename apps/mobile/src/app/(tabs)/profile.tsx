import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/auth/auth-context';

const LIST_TEMPLATES_ROUTE = '/list-templates' as Href;

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { token, user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  if (!token || !user) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.title}>Perfil</Text>

      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{getInitials(user.name)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <Text style={styles.sectionLabel}>Ajustes</Text>
      <View style={styles.card}>
        <Pressable
          onPress={() => router.push(LIST_TEMPLATES_ROUTE)}
          accessibilityRole="button"
          accessibilityLabel="Ir a Plantillas de listas"
          style={styles.row}
        >
          <Text style={styles.rowLabel}>Plantillas de listas</Text>
          <Text style={styles.rowChevron}>›</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={logout}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        style={styles.logoutButton}
      >
        <Text style={styles.logoutLabel}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F2', padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#161B2E', marginBottom: 16 },
  avatarWrap: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { color: '#fff', fontSize: 24, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 },
  name: { fontSize: 16, fontWeight: '700', color: '#161B2E' },
  email: { fontSize: 13, color: '#8C8C88', marginTop: 4 },
  sectionLabel: {
    fontSize: 11,
    color: '#8C8C88',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: { fontSize: 13, color: '#161B2E', fontWeight: '600' },
  rowChevron: { fontSize: 16, color: '#8C8C88' },
  logoutButton: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF5A3C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutLabel: { fontSize: 14, fontWeight: '700', color: '#FF5A3C' },
});
