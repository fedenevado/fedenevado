import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { api, ApiError, type AppNotification } from '@/api/client';

function planTabHref(planId: string, tab: AppNotification['targetTab']): Href {
  return `/plan/${planId}?tab=${tab}` as Href;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      setNotifications(await api.listNotifications(token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!token) {
    return <Redirect href="/login" />;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function openNotification(notification: AppNotification) {
    if (!token) return;
    router.push(planTabHref(notification.planId, notification.targetTab));
    if (!notification.read) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
      try {
        await api.markNotificationRead(token, notification.id);
      } catch {
        // La navegación ya ocurrió; si falla marcar como leída, se
        // reintentará sola la próxima vez que se recargue la pantalla.
      }
    }
  }

  async function markAllRead() {
    if (!token || unreadCount === 0) return;
    setBusy(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.markAllNotificationsRead(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
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
        <Text style={styles.title}>Notificaciones</Text>
      </View>

      {unreadCount > 0 && (
        <Pressable
          onPress={markAllRead}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`Marcar las ${unreadCount} notificaciones como leídas`}
          style={styles.markAllButton}
        >
          <Text style={styles.markAllLabel}>Marcar todas como leídas ({unreadCount})</Text>
        </Pressable>
      )}

      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
          {error}
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loading} accessibilityLabel="Cargando notificaciones" />
      ) : notifications.length === 0 ? (
        <Text style={styles.emptyText}>No tienes notificaciones todavía.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => openNotification(n)}
              accessibilityRole="button"
              accessibilityLabel={`${n.read ? '' : 'Nueva. '}${n.message}, ${formatWhen(n.createdAt)}`}
              style={[styles.row, !n.read && styles.rowUnread]}
            >
              {!n.read && <View style={styles.unreadDot} accessibilityElementsHidden />}
              <View style={styles.rowContent}>
                <View style={styles.rowTopLine}>
                  {n.read ? <View /> : <Text style={styles.unreadLabel}>Nueva</Text>}
                  <Text style={styles.rowTime}>{formatWhen(n.createdAt)}</Text>
                </View>
                <Text style={[styles.rowMessage, !n.read && styles.rowMessageUnread]}>{n.message}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F2', padding: 20, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  backButton: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  backLabel: { fontSize: 15, color: '#161B2E', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: '#161B2E', flexShrink: 1 },
  markAllButton: { minHeight: 44, justifyContent: 'center', marginBottom: 8 },
  markAllLabel: { fontSize: 12, fontWeight: '700', color: '#161B2E' },
  error: { color: '#C0392B', fontSize: 13, marginBottom: 10 },
  loading: { marginTop: 24 },
  emptyText: { fontSize: 12, color: '#8C8C88', textAlign: 'center', marginTop: 40 },
  scrollContent: { paddingBottom: 40 },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  rowUnread: { borderWidth: 1, borderColor: '#3F6FBF' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3F6FBF', marginTop: 5 },
  rowContent: { flex: 1 },
  rowTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  unreadLabel: { fontSize: 10, fontWeight: '700', color: '#3F6FBF', textTransform: 'uppercase' },
  rowTime: { fontSize: 10, color: '#8C8C88' },
  rowMessage: { fontSize: 13, color: '#161B2E' },
  rowMessageUnread: { fontWeight: '700' },
});
