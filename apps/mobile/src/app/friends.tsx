import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import {
  api,
  ApiError,
  type Friend,
  type FriendSearchResult,
  type PendingRequest,
} from '@/api/client';

type Tab = 'amigos' | 'solicitudes';

export default function FriendsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('amigos');

  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<FriendSearchResult[] | null>(null);
  const [requests, setRequests] = useState<PendingRequest[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    if (!token) return;
    const list = await api.listFriends(token);
    setFriends(list);
  }, [token]);

  const loadRequests = useCallback(async () => {
    if (!token) return;
    const list = await api.listFriendRequests(token);
    setRequests(list);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    Promise.all([loadFriends(), loadRequests()])
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.'))
      .finally(() => setIsLoading(false));
  }, [token, loadFriends, loadRequests]);

  useEffect(() => {
    if (!token) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await api.searchFriends(token, trimmed);
        setSearchResults(results);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, token]);

  if (!token) {
    return <Redirect href="/login" />;
  }

  async function handleSendRequest(userId: string) {
    if (!token) return;
    setBusyId(userId);
    setError(null);
    try {
      await api.sendFriendRequest(token, userId);
      const results = await api.searchFriends(token, query.trim());
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleAccept(friendshipId: string) {
    if (!token) return;
    setBusyId(friendshipId);
    setError(null);
    try {
      await api.acceptFriendRequest(token, friendshipId);
      await Promise.all([loadFriends(), loadRequests()]);
      if (query.trim()) {
        setSearchResults(await api.searchFriends(token, query.trim()));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(friendshipId: string) {
    if (!token) return;
    setBusyId(friendshipId);
    setError(null);
    try {
      await api.removeFriendRequest(token, friendshipId);
      await loadRequests();
      if (query.trim()) {
        setSearchResults(await api.searchFriends(token, query.trim()));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusyId(null);
    }
  }

  const requestCountLabel = requests.length > 0 ? ` (${requests.length})` : '';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backButton}
        >
          <Text style={styles.backLabel}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.title}>Amigos</Text>
      </View>

      <View style={styles.tabRow}>
        {(
          [
            { key: 'amigos', label: `Amigos (${friends.length})` },
            { key: 'solicitudes', label: `Solicitudes${requestCountLabel}` },
          ] as const
        ).map((t) => {
          const isActive = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: isActive }}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
          {error}
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loading} accessibilityLabel="Cargando" />
      ) : tab === 'amigos' ? (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre o email..."
            autoCapitalize="none"
            accessibilityLabel="Buscar amigos"
            style={styles.input}
          />

          {searchResults === null ? (
            friends.length === 0 ? (
              <Text style={styles.emptyText}>Todavía no tienes amigos. Busca a alguien para empezar.</Text>
            ) : (
              friends.map((friend) => (
                <View key={friend.id} style={styles.row}>
                  <Text style={styles.rowName}>{friend.name}</Text>
                </View>
              ))
            )
          ) : searchResults.length === 0 ? (
            <Text style={styles.emptyText}>Sin resultados para &quot;{query}&quot;.</Text>
          ) : (
            searchResults.map((result) => (
              <View key={result.id} style={styles.row}>
                <Text style={styles.rowName}>{result.name}</Text>
                {result.relation === 'none' && (
                  <Pressable
                    onPress={() => handleSendRequest(result.id)}
                    disabled={busyId === result.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Añadir a ${result.name} como amigo`}
                    style={[styles.actionButton, busyId === result.id && styles.actionButtonDisabled]}
                  >
                    <Text style={styles.actionButtonLabel}>Añadir</Text>
                  </Pressable>
                )}
                {result.relation === 'pending_sent' && (
                  <Text style={styles.statusText}>Solicitud enviada</Text>
                )}
                {result.relation === 'friends' && <Text style={styles.statusText}>Ya sois amigos</Text>}
                {result.relation === 'pending_received' && result.friendshipId && (
                  <View style={styles.inlineActions}>
                    <Pressable
                      onPress={() => handleRemove(result.friendshipId!)}
                      disabled={busyId === result.friendshipId}
                      accessibilityRole="button"
                      accessibilityLabel={`Rechazar solicitud de ${result.name}`}
                      style={styles.iconButton}
                    >
                      <Text style={styles.iconButtonLabel}>Rechazar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleAccept(result.friendshipId!)}
                      disabled={busyId === result.friendshipId}
                      accessibilityRole="button"
                      accessibilityLabel={`Aceptar solicitud de ${result.name}`}
                      style={[styles.iconButton, styles.iconButtonPrimary]}
                    >
                      <Text style={styles.iconButtonLabelPrimary}>Aceptar</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))
          )}
        </>
      ) : requests.length === 0 ? (
        <Text style={styles.emptyText}>No tienes solicitudes de amistad pendientes.</Text>
      ) : (
        requests.map((request) => (
          <View key={request.friendshipId} style={styles.row}>
            <Text style={styles.rowName}>{request.from.name}</Text>
            <View style={styles.inlineActions}>
              <Pressable
                onPress={() => handleRemove(request.friendshipId)}
                disabled={busyId === request.friendshipId}
                accessibilityRole="button"
                accessibilityLabel={`Rechazar solicitud de ${request.from.name}`}
                style={styles.iconButton}
              >
                <Text style={styles.iconButtonLabel}>Rechazar</Text>
              </Pressable>
              <Pressable
                onPress={() => handleAccept(request.friendshipId)}
                disabled={busyId === request.friendshipId}
                accessibilityRole="button"
                accessibilityLabel={`Aceptar solicitud de ${request.from.name}`}
                style={[styles.iconButton, styles.iconButtonPrimary]}
              >
                <Text style={styles.iconButtonLabelPrimary}>Aceptar</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F2', padding: 20, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backButton: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  backLabel: { fontSize: 15, color: '#161B2E', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#161B2E', marginLeft: 4 },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DCDCD8',
  },
  tabActive: { backgroundColor: '#161B2E', borderColor: '#161B2E' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#161B2E' },
  tabLabelActive: { color: '#fff' },
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
  loading: { marginTop: 24 },
  emptyText: { fontSize: 13, color: '#8C8C88', textAlign: 'center', paddingVertical: 20 },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  rowName: { fontSize: 14, color: '#161B2E', flexShrink: 1 },
  statusText: { fontSize: 12, color: '#8C8C88' },
  actionButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonLabel: { color: '#fff', fontSize: 12, fontWeight: '700' },
  inlineActions: { flexDirection: 'row', gap: 8 },
  iconButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: '#F0F0EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPrimary: { backgroundColor: '#161B2E' },
  iconButtonLabel: { color: '#8C8C88', fontSize: 11, fontWeight: '700' },
  iconButtonLabelPrimary: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
