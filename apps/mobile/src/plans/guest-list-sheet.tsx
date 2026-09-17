import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { api, ApiError, type JoinRequestSummary, type Plan } from '@/api/client';

interface GuestListSheetProps {
  token: string;
  plan: Plan;
  isOwner: boolean;
  onClose: () => void;
  onParticipantsChanged: () => void;
}

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

export function GuestListSheet({ token, plan, isOwner, onClose, onParticipantsChanged }: GuestListSheetProps) {
  const confirmed = plan.participants.filter((p) => p.rsvpStatus === 'yes');

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequestSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJoinRequests = useCallback(async () => {
    if (!isOwner || plan.visibility !== 'privada') return;
    try {
      setJoinRequests(await api.listJoinRequests(token, plan.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    }
  }, [token, plan.id, plan.visibility, isOwner]);

  useEffect(() => {
    if (!isOwner) return;
    api
      .getOrCreateInvitation(token, plan.id)
      .then(({ token: invitationToken }) => setInviteLink(Linking.createURL(`/invite/${invitationToken}`)))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.'));
    loadJoinRequests();
  }, [isOwner, token, plan.id, loadJoinRequests]);

  async function copyLink() {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  }

  async function handleApprove(requestId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.approveJoinRequest(token, plan.id, requestId);
      await loadJoinRequests();
      onParticipantsChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(requestId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.rejectJoinRequest(token, plan.id, requestId);
      await loadJoinRequests();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Cerrar" accessibilityRole="button">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Confirmados ({confirmed.length})</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={styles.closeButton}
            >
              <Text style={styles.closeLabel}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {error && (
              <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
                {error}
              </Text>
            )}

            {isOwner && (
              <View style={styles.inviteCard}>
                <Text style={styles.inviteLabel}>Invitar a más gente</Text>
                {inviteLink ? (
                  <View style={styles.inviteRow}>
                    <Text style={styles.inviteLink} numberOfLines={1}>
                      {inviteLink}
                    </Text>
                    <Pressable
                      onPress={copyLink}
                      accessibilityRole="button"
                      accessibilityLabel="Copiar enlace de invitación"
                      style={[styles.copyButton, linkCopied && styles.copyButtonDone]}
                    >
                      <Text style={styles.copyButtonLabel}>{linkCopied ? 'Copiado ✓' : 'Copiar'}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <ActivityIndicator accessibilityLabel="Generando enlace" />
                )}
              </View>
            )}

            {isOwner && plan.visibility === 'privada' && joinRequests.length > 0 && (
              <>
                <Text style={styles.pendingLabel}>Solicitudes pendientes ({joinRequests.length})</Text>
                <View style={styles.pendingCard}>
                  {joinRequests.map((r) => (
                    <View key={r.id} style={styles.pendingRow}>
                      <Text style={styles.name}>{r.name}</Text>
                      <View style={styles.pendingActions}>
                        <Pressable
                          onPress={() => handleReject(r.id)}
                          disabled={busy}
                          accessibilityRole="button"
                          accessibilityLabel={`Rechazar solicitud de ${r.name}`}
                          style={styles.rejectButton}
                        >
                          <Text style={styles.rejectButtonLabel}>✕</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleApprove(r.id)}
                          disabled={busy}
                          accessibilityRole="button"
                          accessibilityLabel={`Aprobar solicitud de ${r.name}`}
                          style={styles.approveButton}
                        >
                          <Text style={styles.approveButtonLabel}>✓</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {confirmed.map((p) => {
              const isGuest = !p.userId;
              const isPlanOwner = p.userId === plan.ownerId;
              return (
                <View key={p.id} style={styles.row}>
                  <View style={[styles.avatar, isGuest && styles.avatarGuest]}>
                    <Text style={[styles.avatarLabel, isGuest && styles.avatarLabelGuest]}>
                      {isGuest ? '?' : getInitials(p.name)}
                    </Text>
                  </View>
                  <Text style={styles.name}>{p.name}</Text>
                  {isPlanOwner && (
                    <View style={styles.badgeOwner}>
                      <Text style={styles.badgeOwnerLabel}>ORGANIZADOR</Text>
                    </View>
                  )}
                  {isGuest && (
                    <View style={styles.badgeGuest}>
                      <Text style={styles.badgeGuestLabel}>SIN CUENTA</Text>
                    </View>
                  )}
                </View>
              );
            })}
            {confirmed.length === 0 && <Text style={styles.emptyText}>Nadie ha confirmado todavía.</Text>}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(22,27,46,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#F5F5F2', borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '80%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#161B2E' },
  closeButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { fontSize: 16, color: '#8C8C88' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  error: { color: '#C0392B', fontSize: 13, marginBottom: 10 },
  inviteCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6E6E3', borderRadius: 10, padding: 14, marginBottom: 16 },
  inviteLabel: { fontSize: 11, color: '#8C8C88', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F0EE',
    borderWidth: 1,
    borderColor: '#DCDCD8',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  inviteLink: { flex: 1, fontSize: 11, color: '#161B2E' },
  copyButton: { minHeight: 32, borderRadius: 6, backgroundColor: '#161B2E', paddingHorizontal: 10, justifyContent: 'center', marginLeft: 8 },
  copyButtonDone: { backgroundColor: '#0E6E64' },
  copyButtonLabel: { color: '#fff', fontSize: 10, fontWeight: '700' },
  pendingLabel: { fontSize: 11, fontWeight: '700', color: '#C9A15A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  pendingCard: { backgroundColor: '#FBF3E7', borderRadius: 10, paddingHorizontal: 14, marginBottom: 16 },
  pendingRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  pendingActions: { flexDirection: 'row', gap: 8 },
  rejectButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButtonLabel: { color: '#8C8C88', fontSize: 13, fontWeight: '700' },
  approveButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButtonLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E6E3',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGuest: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#C7C7C2', borderStyle: 'dashed' },
  avatarLabel: { color: '#fff', fontSize: 10, fontWeight: '700' },
  avatarLabelGuest: { color: '#8C8C88' },
  name: { flex: 1, fontSize: 13, color: '#161B2E' },
  badgeOwner: { backgroundColor: '#E8F3F1', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeOwnerLabel: { fontSize: 9, fontWeight: '700', color: '#0E6E64' },
  badgeGuest: { backgroundColor: '#EDEDEA', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeGuestLabel: { fontSize: 9, fontWeight: '700', color: '#6B6B67' },
  emptyText: { fontSize: 12, color: '#8C8C88', textAlign: 'center', paddingVertical: 16 },
});
