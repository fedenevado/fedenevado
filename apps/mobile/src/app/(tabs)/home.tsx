import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useFocusEffect, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { api, ApiError, type Friend, type Plan, type Reminder, type ReminderInput } from '@/api/client';
import { useBadges } from '@/badges/badge-context';
import { formatPlanDate, planTypeLabel } from '@/plans/plan-types';
import { CalendarView } from '@/plans/calendar-view';
import { DaySheet } from '@/plans/day-sheet';

const PLANS_ROUTE = '/plans' as Href;
const NEW_PLAN_ROUTE = '/plan-form' as Href;

function planHref(id: string): Href {
  return `/plan/${id}` as Href;
}
function newPlanHref(initialDate: string): Href {
  return `/plan-form?initialDate=${initialDate}` as Href;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HomeScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { refreshBadges } = useBadges();
  const insets = useSafeAreaInsets();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [autoReminderForm, setAutoReminderForm] = useState(false);

  const loadAll = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const [planList, reminderList, friendList] = await Promise.all([
        api.listPlans(token),
        api.listReminders(token),
        api.listFriends(token),
      ]);
      setPlans(planList);
      setReminders(reminderList);
      setFriends(friendList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
    refreshBadges();
  }, [token, refreshBadges]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const userId = user?.id ?? null;
  const todayISO = todayIso();

  const { visiblePlans, nextPlan, thisWeek, todaysPlans } = useMemo(() => {
    const myRsvp = (p: Plan) => p.participants.find((part) => part.userId === userId)?.rsvpStatus;
    const visible = plans.filter((p) => myRsvp(p) !== 'no');
    const upcoming = [...visible]
      .filter((p) => p.startDate >= todayISO)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const next = upcoming[0];
    const week = upcoming.slice(0, 4);
    const today = visible.filter((p) =>
      p.endDate ? todayISO >= p.startDate && todayISO <= p.endDate : p.startDate === todayISO,
    );
    return { visiblePlans: visible, nextPlan: next, thisWeek: week, todaysPlans: today };
  }, [plans, userId, todayISO]);

  const upcomingReminders = useMemo(
    () =>
      [...reminders]
        .filter((r) => r.date >= todayISO && !r.done)
        .sort((a, b) => (a.date === b.date ? (a.time ?? '').localeCompare(b.time ?? '') : a.date.localeCompare(b.date)))
        .slice(0, 4),
    [reminders, todayISO],
  );
  const todaysReminders = useMemo(() => reminders.filter((r) => r.date === todayISO), [reminders, todayISO]);
  const nextPlanIsToday = !!nextPlan && todaysPlans.some((p) => p.id === nextPlan.id);
  const firstName = (user?.name ?? '').split(' ')[0];

  async function toggleReminderDone(id: string, done: boolean) {
    if (!token) return;
    await api.setReminderDone(token, id, done);
    await loadAll();
  }
  async function createReminder(input: ReminderInput) {
    if (!token) return;
    await api.createReminder(token, input);
    await loadAll();
  }
  async function updateReminder(id: string, input: Partial<Omit<ReminderInput, 'items'>>) {
    if (!token) return;
    await api.updateReminder(token, id, input);
    await loadAll();
  }
  async function deleteReminder(id: string) {
    if (!token) return;
    await api.deleteReminder(token, id);
    await loadAll();
  }
  async function addReminderItem(reminderId: string, text: string) {
    if (!token) return;
    await api.addReminderItem(token, reminderId, text);
    await loadAll();
  }
  async function toggleReminderItem(reminderId: string, itemId: string, done: boolean) {
    if (!token) return;
    await api.updateReminderItem(token, reminderId, itemId, done);
    await loadAll();
  }
  async function deleteReminderItem(reminderId: string, itemId: string) {
    if (!token) return;
    await api.deleteReminderItem(token, reminderId, itemId);
    await loadAll();
  }

  function openDay(date: string) {
    setAutoReminderForm(false);
    setSelectedDay(date);
  }
  function quickAddReminder(date: string) {
    setAutoReminderForm(true);
    setSelectedDay(date);
  }
  function handleAddEventFromSheet(date: string) {
    setSelectedDay(null);
    router.push(newPlanHref(date));
  }

  if (!token || !user) {
    return <Redirect href="/login" />;
  }

  const hasNothing = visiblePlans.length === 0 && reminders.length === 0;

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={styles.loading} accessibilityLabel="Cargando" />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}>
          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
              {error}
            </Text>
          )}

          {hasNothing ? (
            <View style={styles.emptyState}>
              <Text style={styles.greeting}>Hola, {firstName}</Text>
              <Text style={styles.emptyTitle}>Aún no tienes planes</Text>
              <Text style={styles.emptySubtitle}>
                Crea tu primer plan para empezar a organizar viajes, comidas o eventos con tus amigos.
              </Text>
              <Pressable
                onPress={() => router.push(NEW_PLAN_ROUTE)}
                accessibilityRole="button"
                accessibilityLabel="Crear tu primer plan"
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonLabel}>+ Crear tu primer plan</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.greeting}>Hola, {firstName}</Text>

              {nextPlan && !nextPlanIsToday && (
                <>
                  <Text style={styles.sectionLabel}>Tu próximo plan</Text>
                  <View style={styles.card}>
                    <Pressable
                      onPress={() => router.push(planHref(nextPlan.id))}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir plan ${nextPlan.title}`}
                      style={styles.planRow}
                    >
                      <Text style={styles.planTitle}>{nextPlan.title}</Text>
                      <Text style={styles.planMeta}>
                        {formatPlanDate(nextPlan.startDate, nextPlan.endDate, nextPlan.time)}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}

              <View style={styles.calendarWrap}>
                <CalendarView plans={plans} reminders={reminders} onSelectDay={openDay} />
              </View>

              <Text style={styles.sectionLabel}>Hoy</Text>
              {todaysPlans.length > 0 || todaysReminders.length > 0 ? (
                <View style={styles.card}>
                  {todaysPlans.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => router.push(planHref(p.id))}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir plan ${p.title}`}
                      style={styles.planRow}
                    >
                      <Text style={styles.planTitle}>{p.title}</Text>
                      <Text style={styles.planMeta}>{p.time ?? planTypeLabel(p.type)}</Text>
                    </Pressable>
                  ))}
                  {todaysReminders.map((r) => (
                    <ReminderRow key={r.id} reminder={r} onToggleDone={toggleReminderDone} onPress={() => openDay(r.date)} />
                  ))}
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.emptySubtitle}>No tienes nada para hoy.</Text>
                  <View style={styles.quickAddRow}>
                    <Pressable
                      onPress={() => router.push(newPlanHref(todayISO))}
                      accessibilityRole="button"
                      accessibilityLabel="Añadir evento hoy"
                      style={styles.primaryButtonSmall}
                    >
                      <Text style={styles.primaryButtonLabel}>+ Evento</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => quickAddReminder(todayISO)}
                      accessibilityRole="button"
                      accessibilityLabel="Añadir tarea de ruta hoy"
                      style={styles.secondaryButtonSmall}
                    >
                      <Text style={styles.secondaryButtonLabel}>+ Tarea</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {upcomingReminders.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Tus tareas de ruta</Text>
                  <View style={styles.card}>
                    {upcomingReminders.map((r) => (
                      <ReminderRow
                        key={r.id}
                        reminder={r}
                        onToggleDone={toggleReminderDone}
                        onPress={() => openDay(r.date)}
                        showDate
                      />
                    ))}
                  </View>
                </>
              )}

              {thisWeek.length > 1 && (
                <>
                  <Text style={styles.sectionLabel}>Próximamente</Text>
                  <View style={styles.card}>
                    {thisWeek.slice(1).map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => router.push(planHref(p.id))}
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir plan ${p.title}`}
                        style={styles.planRow}
                      >
                        <Text style={styles.planTitle}>{p.title}</Text>
                        <Text style={styles.planMeta}>{formatPlanDate(p.startDate, p.endDate, p.time)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}

              <Pressable
                onPress={() => router.push(PLANS_ROUTE)}
                accessibilityRole="button"
                accessibilityLabel="Ver todos los planes"
                style={styles.seeAllLink}
              >
                <Text style={styles.seeAllLabel}>Ver todos los planes →</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}

      {selectedDay && (
        <DaySheet
          date={selectedDay}
          currentUserId={user.id}
          plans={plans}
          reminders={reminders}
          friends={friends}
          initialShowReminderForm={autoReminderForm}
          onClose={() => setSelectedDay(null)}
          onOpenPlan={(planId) => {
            setSelectedDay(null);
            router.push(planHref(planId));
          }}
          onAddEvent={handleAddEventFromSheet}
          onCreateReminder={createReminder}
          onUpdateReminder={updateReminder}
          onDeleteReminder={deleteReminder}
          onToggleReminderDone={toggleReminderDone}
          onAddReminderItem={addReminderItem}
          onToggleReminderItem={toggleReminderItem}
          onDeleteReminderItem={deleteReminderItem}
        />
      )}
    </View>
  );
}

function ReminderRow({
  reminder,
  onToggleDone,
  onPress,
  showDate,
}: {
  reminder: Reminder;
  onToggleDone: (id: string, done: boolean) => void;
  onPress: () => void;
  showDate?: boolean;
}) {
  const hasItems = reminder.items.length > 0;
  const doneCount = reminder.items.filter((it) => it.done).length;
  return (
    <View style={styles.reminderRow}>
      <Pressable
        onPress={() => onToggleDone(reminder.id, !reminder.done)}
        accessibilityRole="checkbox"
        accessibilityLabel={`Marcar ${reminder.title} como ${reminder.done ? 'pendiente' : 'hecha'}`}
        accessibilityState={{ checked: reminder.done }}
        style={styles.checkbox}
      >
        {reminder.done && <Text style={styles.checkboxMark}>✓</Text>}
      </Pressable>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Ver tarea ${reminder.title}`} style={styles.reminderInfo}>
        <Text style={[styles.reminderTitle, reminder.done && styles.reminderTitleDone]}>{reminder.title}</Text>
        {hasItems && (
          <Text style={styles.reminderMeta}>
            {doneCount}/{reminder.items.length}
          </Text>
        )}
      </Pressable>
      {showDate ? (
        <Text style={styles.reminderMeta}>{formatPlanDate(reminder.date, null, reminder.time)}</Text>
      ) : (
        reminder.time && <Text style={styles.reminderMeta}>{reminder.time}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F2' },
  loading: { marginTop: 40 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  error: { color: '#C0392B', fontSize: 13, marginBottom: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  greeting: { fontSize: 13, color: '#8C8C88', marginBottom: 8 },
  emptyTitle: { fontSize: 19, fontWeight: '700', color: '#161B2E', marginBottom: 6, textAlign: 'center' },
  emptySubtitle: { fontSize: 12, color: '#8C8C88', textAlign: 'center', marginBottom: 20, maxWidth: 260 },
  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sectionLabel: {
    fontSize: 11,
    color: '#8C8C88',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
  },
  card: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4 },
  calendarWrap: { marginTop: 4, marginBottom: 4 },
  planRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FAFAF8',
  },
  planTitle: { fontSize: 13, fontWeight: '600', color: '#161B2E', flexShrink: 1, paddingRight: 8 },
  planMeta: { fontSize: 11, color: '#8C8C88' },
  reminderRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FAFAF8',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: { color: '#161B2E', fontSize: 12, fontWeight: '700' },
  reminderInfo: { flex: 1, minHeight: 44, justifyContent: 'center' },
  reminderTitle: { fontSize: 12, fontWeight: '600', color: '#161B2E' },
  reminderTitleDone: { textDecorationLine: 'line-through', color: '#8C8C88' },
  reminderMeta: { fontSize: 10, color: '#8C8C88' },
  quickAddRow: { flexDirection: 'row', gap: 8, paddingBottom: 14 },
  primaryButtonSmall: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonSmall: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonLabel: { color: '#161B2E', fontSize: 12, fontWeight: '700' },
  seeAllLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  seeAllLabel: { fontSize: 12, fontWeight: '600', color: '#161B2E' },
});
