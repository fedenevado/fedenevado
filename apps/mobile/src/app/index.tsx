import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';

export default function Index() {
  const { isLoading, token, user, connectionError, retryRestoreSession } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container} accessibilityLabel="Cargando sesión">
        <ActivityIndicator size="large" accessibilityLabel="Cargando" />
      </View>
    );
  }

  // Hay sesión guardada pero el servidor no responde: no se manda a /login
  // (la sesión sigue siendo válida) ni a /home (no hay usuario que mostrar).
  if (connectionError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle} accessibilityRole="header">
          No se pudo conectar con el servidor
        </Text>
        <Text style={styles.errorText} accessibilityLiveRegion="polite" role="alert">
          Comprueba tu conexión a internet e inténtalo de nuevo. Tu sesión sigue guardada.
        </Text>
        <Pressable
          onPress={retryRestoreSession}
          accessibilityRole="button"
          accessibilityLabel="Reintentar la conexión con el servidor"
          style={styles.retryButton}
        >
          <Text style={styles.retryLabel}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return <Redirect href={token && user ? '/home' : '/login'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D1E1B',
    padding: 24,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 },
  errorText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 24, maxWidth: 300 },
  retryButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: { fontSize: 15, fontWeight: '700', color: '#2D1E1B' },
});
