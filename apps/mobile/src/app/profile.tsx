import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/auth/auth-context';

// expo-router's generated route types (.expo/types/router.d.ts) only refresh while `expo start`
// is running, so a brand-new route needs this cast until the dev server has rebuilt them once.
const LIST_TEMPLATES_ROUTE = '/list-templates' as Href;

export default function ProfileScreen() {
  const router = useRouter();
  const { token, user } = useAuth();

  if (!token || !user) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backButton}
        >
          <Text style={styles.backLabel}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.title}>Perfil</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F2', padding: 20, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 4 },
  backButton: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  backLabel: { fontSize: 15, color: '#161B2E', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: '#161B2E' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 20 },
  name: { fontSize: 16, fontWeight: '700', color: '#161B2E' },
  email: { fontSize: 13, color: '#8C8C88', marginTop: 4 },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  rowLabel: { fontSize: 13, color: '#161B2E', fontWeight: '600' },
  rowChevron: { fontSize: 16, color: '#8C8C88' },
});
