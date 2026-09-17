import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { api, ApiError, type FriendSearchResult } from '@/api/client';

export default function OnboardingScreen() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendSearchResult[] | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || step !== 2) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        setResults(await api.searchFriends(token, trimmed));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, token, step]);

  if (!token) {
    return <Redirect href="/login" />;
  }

  function finish() {
    router.replace('/home');
  }

  async function refreshResults() {
    if (!token || !query.trim()) return;
    setResults(await api.searchFriends(token, query.trim()));
  }

  async function handleSendRequest(id: string) {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await api.sendFriendRequest(token, id);
      setAddedCount((c) => c + 1);
      await refreshResults();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleAccept(friendshipId: string, resultId: string) {
    if (!token) return;
    setBusyId(resultId);
    setError(null);
    try {
      await api.acceptFriendRequest(token, friendshipId);
      setAddedCount((c) => c + 1);
      await refreshResults();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusyId(null);
    }
  }

  const firstName = (user?.name ?? '').split(' ')[0];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {step === 1 ? (
        <View style={styles.welcomeWrap}>
          <Text style={styles.welcomeEmoji}>👋</Text>
          <Text style={styles.welcomeTitle}>¡Bienvenido/a, {firstName}!</Text>
          <Text style={styles.welcomeSubtitle}>
            Cantixplora te ayuda a organizar viajes, comidas y eventos con tus amigos: planes, gastos
            compartidos y calendario, todo en un solo sitio.
          </Text>
          <Pressable
            onPress={() => setStep(2)}
            accessibilityRole="button"
            accessibilityLabel="Continuar"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonLabel}>Continuar</Text>
          </Pressable>
          <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="Saltar la bienvenida" style={styles.skipLink}>
            <Text style={styles.skipLabel}>Saltar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.stepTwo}>
          <Text style={styles.title}>Añade a tus primeros amigos</Text>
          <Text style={styles.subtitle}>
            Busca a 2 o 3 personas para empezar a organizar planes juntos. Podrás añadir más luego desde
            Amigos.
          </Text>

          {addedCount > 0 && (
            <Text style={styles.progressText}>
              {addedCount} solicitud{addedCount !== 1 ? 'es' : ''} enviada{addedCount !== 1 ? 's' : ''}
              {addedCount >= 2 ? ' — ¡genial!' : ''}
            </Text>
          )}

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre o email..."
            autoCapitalize="none"
            accessibilityLabel="Buscar amigos para añadir"
            style={styles.input}
          />

          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
              {error}
            </Text>
          )}

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {results === null ? (
              <Text style={styles.emptyText}>Escribe un nombre o email para buscar.</Text>
            ) : results.length === 0 ? (
              <Text style={styles.emptyText}>Sin resultados para &quot;{query}&quot;.</Text>
            ) : (
              results.map((r) => (
                <View key={r.id} style={styles.row}>
                  <Text style={styles.rowName}>{r.name}</Text>
                  {r.relation === 'none' && (
                    <Pressable
                      onPress={() => handleSendRequest(r.id)}
                      disabled={busyId === r.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Añadir a ${r.name} como amigo`}
                      style={[styles.actionButton, busyId === r.id && styles.actionButtonDisabled]}
                    >
                      <Text style={styles.actionButtonLabel}>Añadir</Text>
                    </Pressable>
                  )}
                  {r.relation === 'pending_sent' && <Text style={styles.statusText}>Solicitud enviada</Text>}
                  {r.relation === 'friends' && <Text style={styles.statusText}>Ya sois amigos</Text>}
                  {r.relation === 'pending_received' && r.friendshipId && (
                    <Pressable
                      onPress={() => handleAccept(r.friendshipId!, r.id)}
                      disabled={busyId === r.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Aceptar solicitud de ${r.name}`}
                      style={[styles.actionButton, styles.actionButtonPrimary]}
                    >
                      <Text style={styles.actionButtonLabelPrimary}>Aceptar</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.buttonsRow}>
            <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="Saltar y terminar" style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonLabel}>Saltar</Text>
            </Pressable>
            <Pressable
              onPress={finish}
              accessibilityRole="button"
              accessibilityLabel="Terminar"
              style={[styles.primaryButton, styles.flex1]}
            >
              <Text style={styles.primaryButtonLabel}>Terminar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F2', padding: 20, paddingTop: 56 },
  welcomeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  welcomeEmoji: { fontSize: 40, marginBottom: 12 },
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: '#161B2E', marginBottom: 10, textAlign: 'center' },
  welcomeSubtitle: { fontSize: 13, color: '#8C8C88', textAlign: 'center', maxWidth: 280, lineHeight: 19, marginBottom: 28 },
  skipLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  skipLabel: { fontSize: 12, fontWeight: '600', color: '#8C8C88' },
  stepTwo: { flex: 1 },
  title: { fontSize: 19, fontWeight: '700', color: '#161B2E', marginBottom: 6 },
  subtitle: { fontSize: 12, color: '#8C8C88', marginBottom: 12, lineHeight: 18 },
  progressText: { fontSize: 12, fontWeight: '700', color: '#0E6E64', marginBottom: 10 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  error: { color: '#C0392B', fontSize: 13, marginBottom: 10 },
  scrollContent: { paddingBottom: 12 },
  emptyText: { fontSize: 12, color: '#8C8C88', textAlign: 'center', paddingVertical: 20 },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  rowName: { fontSize: 13, color: '#161B2E', flexShrink: 1 },
  actionButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonLabel: { fontSize: 11, fontWeight: '700', color: '#161B2E' },
  actionButtonPrimary: { backgroundColor: '#161B2E' },
  actionButtonLabelPrimary: { fontSize: 11, fontWeight: '700', color: '#fff' },
  statusText: { fontSize: 11, color: '#8C8C88' },
  buttonsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  flex1: { flex: 1 },
  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryButton: {
    minHeight: 48,
    minWidth: 90,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonLabel: { color: '#161B2E', fontSize: 14, fontWeight: '700' },
});
