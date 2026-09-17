import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { api, ApiError, type Plan, type RsvpStatus } from '@/api/client';
import { formatPlanDate, planTypeColor, planTypeLabel } from '@/plans/plan-types';
import { ExpensesTab } from '@/plans/expenses-tab';
import { ListsTab } from '@/plans/lists-tab';
import { ChatTab } from '@/plans/chat-tab';
import { GuestListSheet } from '@/plans/guest-list-sheet';

type DetailTab = 'detalles' | 'chat' | 'listas' | 'gastos';

const RSVP_LABEL: Record<RsvpStatus, string> = {
  pending: 'Sin responder',
  yes: 'Voy',
  maybe: 'Tal vez',
  no: 'No voy',
};

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

function editHref(id: string): Href {
  return `/plan-form?id=${id}` as Href;
}

export default function PlanDetailScreen() {
  const router = useRouter();
  const { id, tab: initialTabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { token, user } = useAuth();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [rsvpPromptOpen, setRsvpPromptOpen] = useState(false);
  const [rsvpPromptInitialized, setRsvpPromptInitialized] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGuestList, setShowGuestList] = useState(false);
  const [tab, setTab] = useState<DetailTab>(
    initialTabParam === 'gastos' || initialTabParam === 'chat' || initialTabParam === 'listas'
      ? initialTabParam
      : 'detalles',
  );

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      setError(null);
      const result = await api.getPlan(token, id);
      setPlan(result);
      if (!rsvpPromptInitialized) {
        const mine = result.participants.find((p) => p.userId === user?.id);
        setRsvpPromptOpen(!mine || mine.rsvpStatus === 'pending');
        setRsvpPromptInitialized(true);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
    // rsvpPromptInitialized intentionally excluded: it only gates the first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!token || !user) {
    return <Redirect href="/login" />;
  }

  async function applyRsvp(status: RsvpStatus) {
    if (!token || !id) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.setRsvp(token, id, status as Exclude<RsvpStatus, 'pending'>);
      setPlan(updated);
      setRsvpPromptOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  function handleRsvpChoice(status: RsvpStatus) {
    if (status === 'no') {
      setShowDeclineConfirm(true);
      return;
    }
    applyRsvp(status);
  }

  async function confirmDecline() {
    setShowDeclineConfirm(false);
    await applyRsvp('no');
    router.replace('/plans' as Href);
  }

  function reconsiderDecline() {
    setShowDeclineConfirm(false);
    applyRsvp('maybe');
  }

  async function handleDelete() {
    if (!token || !id) return;
    setBusy(true);
    setError(null);
    try {
      await api.deletePlan(token, id);
      router.replace('/plans' as Href);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
      setBusy(false);
    }
  }

  if (isLoading || !plan) {
    return (
      <View style={styles.loadingContainer}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator style={styles.loading} accessibilityLabel="Cargando plan" />}
      </View>
    );
  }

  const mine = plan.participants.find((p) => p.userId === user.id);
  const myRsvp: RsvpStatus = mine?.rsvpStatus ?? 'pending';
  const isOwner = plan.ownerId === user.id;
  const owner = plan.participants.find((p) => p.userId === plan.ownerId);

  if (myRsvp === 'pending' && rsvpPromptOpen) {
    return (
      <View style={styles.gateContainer}>
        <Text style={styles.gateTitle}>¿Vas a ir?</Text>
        <Text style={styles.gateSubtitle}>Dinos si asistirás a &quot;{plan.title}&quot;.</Text>

        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>Vista rápida</Text>
          <Text style={styles.previewLine}>
            <Text style={styles.previewBold}>Lugar: </Text>
            {plan.location || 'Por definir'}
          </Text>
          <Text style={styles.previewLine}>
            <Text style={styles.previewBold}>Fecha: </Text>
            {formatPlanDate(plan.startDate, plan.endDate, plan.time)}
          </Text>
          <Text style={styles.previewLine}>
            <Text style={styles.previewBold}>Organiza: </Text>
            {owner?.name ?? '—'}
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.gateButtons}>
          {(['yes', 'maybe', 'no'] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => handleRsvpChoice(key)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={RSVP_LABEL[key]}
              style={[styles.gateButton, key === 'yes' ? styles.gateButtonPrimary : styles.gateButtonSecondary]}
            >
              <Text style={key === 'yes' ? styles.gateButtonPrimaryLabel : styles.gateButtonSecondaryLabel}>
                {RSVP_LABEL[key]}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setRsvpPromptOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Ver más tarde, solo estoy mirando"
            style={styles.laterLink}
          >
            <Text style={styles.laterLinkLabel}>Ver más tarde, solo estoy mirando</Text>
          </Pressable>
        </View>

        {showDeclineConfirm && (
          <DeclineConfirmDialog title={plan.title} onReconsider={reconsiderDecline} onConfirm={confirmDecline} />
        )}
      </View>
    );
  }

  if (myRsvp === 'no' && !rsvpPromptOpen) {
    return (
      <View style={styles.gateContainer}>
        <Text style={styles.wave}>👋</Text>
        <Text style={styles.gateTitle}>Has indicado que no vas</Text>
        <Text style={styles.gateSubtitle}>No verás las novedades de &quot;{plan.title}&quot; mientras mantengas esta respuesta.</Text>
        <Pressable
          onPress={() => setRsvpPromptOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Cambiar mi respuesta"
          style={styles.secondaryWideButton}
        >
          <Text style={styles.secondaryWideButtonLabel}>Cambiar mi respuesta</Text>
        </Pressable>
      </View>
    );
  }

  const confirmedParticipants = plan.participants.filter((p) => p.rsvpStatus === 'yes');
  const visibleAvatars = confirmedParticipants.slice(0, 4);
  const extraConfirmedCount = confirmedParticipants.length - visibleAvatars.length;

  return (
    <View style={styles.container}>
      <View style={[styles.headerBand, { backgroundColor: planTypeColor(plan.type) }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backButton}
        >
          <Text style={styles.backLabel}>‹ Planes</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {plan.title}
        </Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {plan.location ? `${plan.location} · ` : ''}
          {formatPlanDate(plan.startDate, plan.endDate, plan.time)}
        </Text>

        <View style={styles.headerBottomRow}>
          <Pressable
            onPress={() => setRsvpPromptOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Tu respuesta: ${RSVP_LABEL[myRsvp]}. Toca para cambiarla`}
            style={styles.rsvpBadge}
          >
            <Text style={styles.rsvpBadgeLabel}>{RSVP_LABEL[myRsvp].toUpperCase()}</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowGuestList(true)}
            accessibilityRole="button"
            accessibilityLabel={`Ver confirmados, ${confirmedParticipants.length}`}
            style={styles.avatarStack}
          >
            {visibleAvatars.map((p, i) => (
              <View
                key={p.id}
                style={[styles.avatarCircle, i > 0 && styles.avatarCircleOverlap, !p.userId && styles.avatarCircleGuest]}
              >
                <Text style={[styles.avatarLabel, !p.userId && styles.avatarLabelGuest]}>
                  {p.userId ? getInitials(p.name) : '?'}
                </Text>
              </View>
            ))}
            <Text style={styles.avatarCount}>
              {extraConfirmedCount > 0 ? `+${extraConfirmedCount}` : confirmedParticipants.length}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.tabRow}>
          {(
            [
              { key: 'detalles', label: 'Detalles' },
              { key: 'chat', label: 'Chat' },
              { key: 'listas', label: 'Listas' },
              { key: 'gastos', label: 'Gastos' },
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

      {tab === 'gastos' ? (
        <ExpensesTab
          token={token}
          planId={plan.id}
          myUserId={user.id}
          confirmedParticipants={plan.participants.filter((p) => p.rsvpStatus === 'yes' && p.userId)}
        />
      ) : tab === 'listas' ? (
        <ListsTab token={token} planId={plan.id} />
      ) : tab === 'chat' ? (
        <ChatTab token={token} planId={plan.id} myUserId={user.id} />
      ) : (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.typeBadgeRow}>
          <View style={[styles.typeDot, { backgroundColor: planTypeColor(plan.type) }]} />
          <Text style={styles.typeLabel}>{planTypeLabel(plan.type)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLine}>
            <Text style={styles.cardBold}>Fecha: </Text>
            {formatPlanDate(plan.startDate, plan.endDate, plan.time)}
          </Text>
          <Text style={styles.cardLine}>
            <Text style={styles.cardBold}>Lugar: </Text>
            {plan.location || 'Por definir'}
          </Text>
          <Text style={styles.cardLine}>
            <Text style={styles.cardBold}>Organiza: </Text>
            {owner?.name ?? '—'}
          </Text>
          <Text style={styles.cardLine}>
            <Text style={styles.cardBold}>Tu respuesta: </Text>
            {RSVP_LABEL[myRsvp]}
          </Text>
        </View>

        <Pressable
          onPress={() => setRsvpPromptOpen(true)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Cambiar mi respuesta"
          style={styles.secondaryWideButton}
        >
          <Text style={styles.secondaryWideButtonLabel}>Cambiar mi respuesta</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>Participantes ({plan.participants.length})</Text>
        {plan.participants.map((p) => (
          <View key={p.id} style={styles.participantRow}>
            <Text style={styles.participantName}>
              {p.name}
              {p.userId === plan.ownerId ? ' (organiza)' : ''}
            </Text>
            <Text style={styles.participantRsvp}>{RSVP_LABEL[p.rsvpStatus]}</Text>
          </View>
        ))}

        {isOwner && (
          <View style={styles.ownerActions}>
            <Pressable
              onPress={() => router.push(editHref(plan.id))}
              accessibilityRole="button"
              accessibilityLabel="Editar plan"
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonLabel}>Editar</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowDeleteConfirm(true)}
              accessibilityRole="button"
              accessibilityLabel="Eliminar plan"
              style={styles.dangerButton}
            >
              <Text style={styles.dangerButtonLabel}>Eliminar</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      )}
      </View>

      {rsvpPromptOpen && (
        <ChangeRsvpModal
          current={myRsvp}
          busy={busy}
          onChoose={handleRsvpChoice}
          onCancel={() => setRsvpPromptOpen(false)}
        />
      )}

      {showDeclineConfirm && (
        <DeclineConfirmDialog title={plan.title} onReconsider={reconsiderDecline} onConfirm={confirmDecline} />
      )}

      {showDeleteConfirm && (
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>¿Eliminar &quot;{plan.title}&quot;?</Text>
            <Text style={styles.dialogSubtitle}>Se borrará el plan y no se puede deshacer.</Text>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonLabel}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Confirmar eliminar plan"
                style={styles.dangerButton}
              >
                <Text style={styles.dangerButtonLabel}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {showGuestList && (
        <GuestListSheet
          token={token}
          plan={plan}
          isOwner={isOwner}
          onClose={() => setShowGuestList(false)}
          onParticipantsChanged={load}
        />
      )}
    </View>
  );
}

function DeclineConfirmDialog({
  title,
  onReconsider,
  onConfirm,
}: {
  title: string;
  onReconsider: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <Text style={styles.dialogTitle}>¿De verdad no vienes?</Text>
        <Text style={styles.dialogSubtitle}>&quot;{title}&quot; dejará de aparecer en tu lista de planes.</Text>
        <View style={styles.dialogButtonsColumn}>
          <Pressable
            onPress={onReconsider}
            accessibilityRole="button"
            accessibilityLabel="Me lo pienso"
            style={styles.secondaryWideButton}
          >
            <Text style={styles.secondaryWideButtonLabel}>Me lo pienso</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel="No, no voy"
            style={styles.dangerWideButton}
          >
            <Text style={styles.dangerWideButtonLabel}>No, no voy</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ChangeRsvpModal({
  current,
  busy,
  onChoose,
  onCancel,
}: {
  current: RsvpStatus;
  busy: boolean;
  onChoose: (status: RsvpStatus) => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <Text style={styles.dialogTitle}>Cambiar tu respuesta</Text>
        <View style={styles.dialogButtonsColumn}>
          {(['yes', 'maybe', 'no'] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => onChoose(key)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={RSVP_LABEL[key]}
              accessibilityState={{ selected: current === key }}
              style={[styles.gateButton, current === key ? styles.gateButtonPrimary : styles.gateButtonSecondary]}
            >
              <Text style={current === key ? styles.gateButtonPrimaryLabel : styles.gateButtonSecondaryLabel}>
                {RSVP_LABEL[key]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          style={styles.laterLink}
        >
          <Text style={styles.laterLinkLabel}>Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F2' },
  loadingContainer: { flex: 1, backgroundColor: '#F5F5F2', padding: 20, paddingTop: 56 },
  headerBand: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  backButton: { minHeight: 44, justifyContent: 'center', marginBottom: 6, alignSelf: 'flex-start' },
  backLabel: { fontSize: 13, color: '#fff', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, marginBottom: 12 },
  headerBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  rsvpBadge: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  rsvpBadgeLabel: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  avatarStack: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#161B2E',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleOverlap: { marginLeft: -8 },
  avatarCircleGuest: { backgroundColor: '#fff', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.9)' },
  avatarLabel: { fontSize: 8, fontWeight: '700', color: '#fff' },
  avatarLabelGuest: { color: '#8C8C88' },
  avatarCount: { fontSize: 11, color: '#fff', marginLeft: 6, fontWeight: '600' },
  body: { flex: 1, padding: 20, paddingTop: 16 },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
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
  error: { color: '#C0392B', fontSize: 13, marginBottom: 10 },
  loading: { marginTop: 24 },
  scrollContent: { paddingBottom: 40 },
  typeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  typeDot: { width: 10, height: 10, borderRadius: 5 },
  typeLabel: { fontSize: 12, fontWeight: '700', color: '#161B2E' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 16 },
  cardLine: { fontSize: 13, color: '#161B2E', marginBottom: 6 },
  cardBold: { fontWeight: '700' },
  sectionLabel: {
    fontSize: 11,
    color: '#8C8C88',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
  },
  participantRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  participantName: { fontSize: 13, color: '#161B2E' },
  participantRsvp: { fontSize: 12, color: '#8C8C88', fontWeight: '600' },
  ownerActions: { flexDirection: 'row', gap: 8, marginTop: 20 },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonLabel: { color: '#161B2E', fontSize: 13, fontWeight: '700' },
  dangerButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#FF5A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  secondaryWideButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  secondaryWideButtonLabel: { color: '#161B2E', fontSize: 13, fontWeight: '700' },
  dangerWideButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#FF5A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerWideButtonLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  gateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FAFAF8',
  },
  wave: { fontSize: 34, marginBottom: 10 },
  gateTitle: { fontSize: 18, fontWeight: '700', color: '#161B2E', marginBottom: 6, textAlign: 'center' },
  gateSubtitle: { fontSize: 13, color: '#8C8C88', marginBottom: 18, textAlign: 'center', maxWidth: 260 },
  previewCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, width: '100%', maxWidth: 280, marginBottom: 18 },
  previewLabel: { fontSize: 10, color: '#8C8C88', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  previewLine: { fontSize: 13, color: '#161B2E', marginBottom: 4 },
  previewBold: { fontWeight: '700' },
  gateButtons: { width: '100%', maxWidth: 280, gap: 10 },
  gateButton: {
    minHeight: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCDCD8',
  },
  gateButtonPrimary: { backgroundColor: '#161B2E', borderColor: '#161B2E' },
  gateButtonPrimaryLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
  gateButtonSecondary: { backgroundColor: '#fff' },
  gateButtonSecondaryLabel: { color: '#161B2E', fontSize: 14, fontWeight: '700' },
  laterLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  laterLinkLabel: { fontSize: 12, color: '#8C8C88' },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(22,27,46,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: { backgroundColor: '#fff', borderRadius: 14, padding: 20, width: '100%', maxWidth: 320 },
  dialogTitle: { fontSize: 15, fontWeight: '700', color: '#161B2E', marginBottom: 6 },
  dialogSubtitle: { fontSize: 12, color: '#8C8C88', marginBottom: 16 },
  dialogButtons: { flexDirection: 'row', gap: 8 },
  dialogButtonsColumn: { gap: 8, marginBottom: 4 },
});
