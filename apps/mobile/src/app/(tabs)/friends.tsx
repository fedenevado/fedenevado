import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useFocusEffect, useRouter, type Href } from 'expo-router';
import { CalendarClock, Check, MessageCircle, Receipt, UserPlus, X } from 'lucide-react-native';
import { useAuth } from '@/auth/auth-context';
import { useBadges } from '@/badges/badge-context';
import {
  api,
  ApiError,
  type AppNotification,
  type AppNotificationType,
  type Friend,
  type FriendSearchResult,
  type PendingRequest,
} from '@/api/client';

type Tab = 'invitaciones' | 'amigos';

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

function planTabHref(planId: string, tab: AppNotification['targetTab']): Href {
  return `/plan/${planId}?tab=${tab}` as Href;
}

function iconForNotification(type: AppNotificationType) {
  if (type === 'plan_invite') return <UserPlus size={15} color="#0E6E64" />;
  if (type === 'new_expense' || type === 'expense_settled') return <Receipt size={15} color="#0E6E64" />;
  if (type === 'rsvp_reminder') return <CalendarClock size={15} color="#FF5A3C" />;
  return <MessageCircle size={15} color="#161B2E" />;
}

export default function FriendsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { refreshBadges } = useBadges();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('invitaciones');

  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<FriendSearchResult[] | null>(null);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

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

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    const list = await api.listNotifications(token);
    setNotifications(list);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      Promise.all([loadFriends(), loadRequests(), loadNotifications()])
        .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.'))
        .finally(() => setIsLoading(false));
      refreshBadges();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, loadFriends, loadRequests, loadNotifications]),
  );

  if (!token) {
    return <Redirect href="/login" />;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const inboxCount = requests.length + unreadCount;

  async function handleSearch(text: string) {
    setQuery(text);
    if (!token) return;
    const trimmed = text.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    try {
      const results = await api.searchFriends(token, trimmed);
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    }
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
      await refreshBadges();
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
      await refreshBadges();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusyId(null);
    }
  }

  async function openNotification(notification: AppNotification) {
    if (!token) return;
    router.push(planTabHref(notification.planId, notification.targetTab));
    if (!notification.read) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      try {
        await api.markNotificationRead(token, notification.id);
        await refreshBadges();
      } catch {
        // La navegación ya ocurrió; si falla marcar como leída, se
        // reintentará sola la próxima vez que se recargue la pantalla.
      }
    }
  }

  async function markAllRead() {
    if (!token || unreadCount === 0) return;
    setMarkingAllRead(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.markAllNotificationsRead(token);
      await refreshBadges();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setMarkingAllRead(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 20 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Amigos</Text>

      <View style={styles.tabRow}>
        {(
          [
            { key: 'invitaciones', label: `Invitaciones${inboxCount > 0 ? ` (${inboxCount})` : ''}` },
            { key: 'amigos', label: `Amigos (${friends.length})` },
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
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {tab === 'invitaciones' ? (
            <>
              {requests.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Solicitudes de amistad ({requests.length})</Text>
                  <View style={styles.card}>
                    {requests.map((request, i) => (
                      <View
                        key={request.friendshipId}
                        style={[styles.cardRow, i < requests.length - 1 && styles.cardRowDivider]}
                      >
                        <View style={styles.rowIdentity}>
                          <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no">
                            <Text style={styles.avatarLabel}>{getInitials(request.from.name)}</Text>
                          </View>
                          <Text style={styles.rowName}>{request.from.name}</Text>
                        </View>
                        <View style={styles.inlineActions}>
                          <Pressable
                            onPress={() => handleRemove(request.friendshipId)}
                            disabled={busyId === request.friendshipId}
                            accessibilityRole="button"
                            accessibilityLabel={`Rechazar solicitud de ${request.from.name}`}
                            hitSlop={9}
                            style={styles.roundButton}
                          >
                            <X size={13} color="#8C8C88" />
                          </Pressable>
                          <Pressable
                            onPress={() => handleAccept(request.friendshipId)}
                            disabled={busyId === request.friendshipId}
                            accessibilityRole="button"
                            accessibilityLabel={`Aceptar solicitud de ${request.from.name}`}
                            hitSlop={9}
                            style={[styles.roundButton, styles.roundButtonPrimary]}
                          >
                            <Check size={13} color="#fff" />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabelBare}>Notificaciones</Text>
                {unreadCount > 0 && (
                  <Pressable
                    onPress={markAllRead}
                    disabled={markingAllRead}
                    accessibilityRole="button"
                    accessibilityLabel={`Marcar las ${unreadCount} notificaciones como leídas`}
                  >
                    <Text style={styles.markAllLabel}>Marcar todas leídas</Text>
                  </Pressable>
                )}
              </View>

              {notifications.length === 0 && requests.length === 0 && (
                <Text style={styles.emptyText}>No tienes invitaciones ni notificaciones nuevas.</Text>
              )}

              {notifications.length > 0 && (
                <View style={styles.card}>
                  {notifications.map((n, i) => (
                    <Pressable
                      key={n.id}
                      onPress={() => openNotification(n)}
                      accessibilityRole="button"
                      accessibilityLabel={`${n.read ? '' : 'Nueva. '}${n.message}`}
                      style={[styles.notifRow, i < notifications.length - 1 && styles.cardRowDivider]}
                    >
                      <View style={styles.notifIcon} accessibilityElementsHidden importantForAccessibility="no">
                        {iconForNotification(n.type)}
                      </View>
                      <Text style={[styles.notifText, !n.read && styles.notifTextUnread]}>{n.message}</Text>
                      {!n.read && <View style={styles.unreadDot} accessibilityElementsHidden />}
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              <TextInput
                value={query}
                onChangeText={handleSearch}
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
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F2', padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#161B2E', marginBottom: 16 },
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
  scrollContent: { paddingBottom: 40 },
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
  sectionLabel: {
    fontSize: 11,
    color: '#8C8C88',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionLabelBare: {
    fontSize: 11,
    color: '#8C8C88',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 44,
  },
  markAllLabel: { fontSize: 11, color: '#161B2E', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, marginBottom: 20 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  cardRowDivider: { borderBottomWidth: 1, borderBottomColor: '#FAFAF8' },
  rowIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { color: '#fff', fontSize: 10, fontWeight: '700' },
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
  roundButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButtonPrimary: { backgroundColor: '#161B2E' },
  notifRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 10, minHeight: 44 },
  notifIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F3',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#8C8C88', fontWeight: '400' },
  notifTextUnread: { color: '#161B2E', fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5A3C', marginTop: 5, flexShrink: 0 },
});
