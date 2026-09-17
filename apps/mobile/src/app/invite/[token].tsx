import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { api, ApiError } from '@/api/client';

type Status = 'loading' | 'joined' | 'pending' | 'error';

function planHref(id: string): Href {
  return `/plan/${id}` as Href;
}

export default function InvitationScreen() {
  const router = useRouter();
  const { token: invitationToken } = useLocalSearchParams<{ token: string }>();
  const { token: authToken } = useAuth();

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);

  const join = useCallback(async () => {
    if (!authToken || !invitationToken) return;
    setStatus('loading');
    setError(null);
    try {
      const result = await api.joinViaInvitation(authToken, invitationToken);
      setPlanId(result.planId);
      setStatus(result.status === 'pending' ? 'pending' : 'joined');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
      setStatus('error');
    }
  }, [authToken, invitationToken]);

  useEffect(() => {
    join();
  }, [join]);

  if (!authToken) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Inicia sesión para unirte a este plan</Text>
        <Pressable
          onPress={() => router.push('/login')}
          accessibilityRole="button"
          accessibilityLabel="Ir a iniciar sesión"
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonLabel}>Iniciar sesión</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {status === 'loading' && <ActivityIndicator accessibilityLabel="Comprobando invitación" />}

      {status === 'joined' && (
        <>
          <Text style={styles.title}>Te has unido al plan</Text>
          <Pressable
            onPress={() => router.replace(planId ? planHref(planId) : ('/plans' as Href))}
            accessibilityRole="button"
            accessibilityLabel="Ver el plan"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonLabel}>Ver el plan</Text>
          </Pressable>
        </>
      )}

      {status === 'pending' && (
        <>
          <Text style={styles.title}>Solicitud enviada</Text>
          <Text style={styles.subtitle}>Este plan es privado. El organizador tiene que aprobar tu solicitud.</Text>
          <Pressable
            onPress={() => router.replace('/plans' as Href)}
            accessibilityRole="button"
            accessibilityLabel="Ir a mis planes"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonLabel}>Ir a mis planes</Text>
          </Pressable>
        </>
      )}

      {status === 'error' && (
        <>
          <Text style={styles.title}>No se pudo abrir la invitación</Text>
          {error && <Text style={styles.subtitle}>{error}</Text>}
          <Pressable
            onPress={() => router.replace('/plans' as Href)}
            accessibilityRole="button"
            accessibilityLabel="Ir a mis planes"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonLabel}>Ir a mis planes</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F2', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 17, fontWeight: '700', color: '#161B2E', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#8C8C88', textAlign: 'center', marginBottom: 20, maxWidth: 280 },
  primaryButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 12,
  },
  primaryButtonLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
