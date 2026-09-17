import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useFocusEffect, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { api, ApiError, type Plan, type PlanType } from '@/api/client';
import {
  PLAN_TYPE_OPTIONS,
  dateToIsoDate,
  formatPlanDate,
  isoDateToDate,
  planTypeColor,
  planTypeLabel,
} from '@/plans/plan-types';
import { PickerField } from '@/plans/picker-field';

const NEW_PLAN_ROUTE = '/plan-form' as Href;

function planHref(id: string): Href {
  return `/plan/${id}` as Href;
}

function myRsvp(plan: Plan, userId: string | null) {
  return plan.participants.find((p) => p.userId === userId)?.rsvpStatus ?? 'pending';
}

const RSVP_LABEL: Record<string, string> = {
  pending: 'Sin responder',
  yes: 'Voy',
  maybe: 'Tal vez',
  no: 'No voy',
};

export default function PlansScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<PlanType[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadPlans = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const list = await api.listPlans(token);
      setPlans(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [loadPlans]),
  );

  const authUserId = user?.id ?? null;
  const todayISO = new Date().toISOString().slice(0, 10);

  const { pending, upcoming, past } = useMemo(() => {
    const filtered = plans.filter((p) => {
      if (typeFilter.length > 0 && !typeFilter.includes(p.type)) return false;
      if (dateFrom && p.startDate < dateFrom) return false;
      if (dateTo && p.startDate > dateTo) return false;
      return true;
    });
    const visible = filtered.filter((p) => myRsvp(p, authUserId) !== 'no');

    const pendingList = visible
      .filter((p) => p.startDate >= todayISO && ['pending', 'maybe'].includes(myRsvp(p, authUserId)))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const upcomingList = visible
      .filter((p) => p.startDate >= todayISO && !['pending', 'maybe'].includes(myRsvp(p, authUserId)))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const pastList = visible
      .filter((p) => p.startDate < todayISO)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));

    return { pending: pendingList, upcoming: upcomingList, past: pastList };
  }, [plans, typeFilter, dateFrom, dateTo, authUserId, todayISO]);

  if (!token || !user) {
    return <Redirect href="/login" />;
  }

  const userId = user.id;

  function toggleType(t: PlanType) {
    setTypeFilter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function clearFilters() {
    setTypeFilter([]);
    setDateFrom('');
    setDateTo('');
  }

  const activeFilterCount = typeFilter.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  function renderPlan(plan: Plan, opacity = 1) {
    const rsvp = myRsvp(plan, userId);
    return (
      <Pressable
        key={plan.id}
        onPress={() => router.push(planHref(plan.id))}
        accessibilityRole="button"
        accessibilityLabel={`${plan.title}, ${planTypeLabel(plan.type)}, ${formatPlanDate(plan.startDate, plan.endDate, plan.time)}, ${RSVP_LABEL[rsvp]}`}
        style={[styles.planRow, { opacity }]}
      >
        <View style={[styles.typeDot, { backgroundColor: planTypeColor(plan.type) }]} />
        <View style={styles.planInfo}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planMeta}>
            {planTypeLabel(plan.type)} · {formatPlanDate(plan.startDate, plan.endDate, plan.time)}
          </Text>
        </View>
        <Text style={styles.rsvpBadge}>{RSVP_LABEL[rsvp]}</Text>
      </Pressable>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 20 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Mis planes</Text>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => setShowFilters((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`Filtros${activeFilterCount ? `, ${activeFilterCount} activos` : ''}`}
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
        >
          <Text style={[styles.filterButtonLabel, activeFilterCount > 0 && styles.filterButtonLabelActive]}>
            Filtros{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(NEW_PLAN_ROUTE)}
          accessibilityRole="button"
          accessibilityLabel="Crear nuevo plan"
          style={styles.newButton}
        >
          <Text style={styles.newButtonLabel}>+ Nuevo plan</Text>
        </Pressable>
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Tipo de plan</Text>
          <View style={styles.chipRow}>
            {PLAN_TYPE_OPTIONS.map((t) => {
              const active = typeFilter.includes(t.value);
              return (
                <Pressable
                  key={t.value}
                  onPress={() => toggleType(t.value)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Filtrar por ${t.label}`}
                  accessibilityState={{ checked: active }}
                  style={[styles.chip, active && { backgroundColor: t.color, borderColor: t.color }]}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.filterLabel}>Rango de fechas</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <PickerField
                mode="date"
                value={dateFrom ? isoDateToDate(dateFrom) : null}
                placeholder="Desde"
                accessibilityLabel="Filtrar desde fecha"
                formatLabel={(d) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                onChange={(d) => setDateFrom(dateToIsoDate(d))}
                onClear={() => setDateFrom('')}
              />
            </View>
            <View style={styles.dateField}>
              <PickerField
                mode="date"
                value={dateTo ? isoDateToDate(dateTo) : null}
                minimumDate={dateFrom ? isoDateToDate(dateFrom) : undefined}
                placeholder="Hasta"
                accessibilityLabel="Filtrar hasta fecha"
                formatLabel={(d) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                onChange={(d) => setDateTo(dateToIsoDate(d))}
                onClear={() => setDateTo('')}
              />
            </View>
          </View>
          {activeFilterCount > 0 && (
            <Pressable
              onPress={clearFilters}
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros"
              style={styles.clearFilters}
            >
              <Text style={styles.clearFiltersLabel}>Limpiar filtros</Text>
            </Pressable>
          )}
        </View>
      )}

      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
          {error}
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loading} accessibilityLabel="Cargando planes" />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {pending.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, styles.sectionLabelPending]}>Pendientes ({pending.length})</Text>
              {pending.map((p) => renderPlan(p))}
            </>
          )}

          <Text style={styles.sectionLabel}>Próximos ({upcoming.length})</Text>
          {upcoming.length === 0 ? (
            <Text style={styles.emptyText}>No hay planes próximos con estos filtros.</Text>
          ) : (
            upcoming.map((p) => renderPlan(p))
          )}

          <Text style={styles.sectionLabel}>Pasados ({past.length})</Text>
          {past.length === 0 ? (
            <Text style={styles.emptyText}>No hay planes pasados con estos filtros.</Text>
          ) : (
            past.map((p) => renderPlan(p, 0.6))
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F2', padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#161B2E', marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: { backgroundColor: '#161B2E', borderColor: '#161B2E' },
  filterButtonLabel: { fontSize: 12, fontWeight: '700', color: '#161B2E' },
  filterButtonLabelActive: { color: '#fff' },
  newButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 20,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newButtonLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  filterPanel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E6E6E3',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  filterLabel: { fontSize: 11, color: '#8C8C88', textTransform: 'uppercase', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: { fontSize: 12, fontWeight: '600', color: '#161B2E' },
  chipLabelActive: { color: '#fff' },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateField: { flex: 1 },
  clearFilters: { minHeight: 44, alignItems: 'flex-end', justifyContent: 'center', marginTop: 8 },
  clearFiltersLabel: { fontSize: 12, fontWeight: '700', color: '#FF5A3C' },
  error: { color: '#C0392B', fontSize: 13, marginBottom: 10 },
  loading: { marginTop: 24 },
  scrollContent: { paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11,
    color: '#8C8C88',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionLabelPending: { color: '#C9A15A', marginTop: 0 },
  emptyText: { fontSize: 12, color: '#8C8C88', marginBottom: 8 },
  planRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    gap: 10,
  },
  typeDot: { width: 10, height: 10, borderRadius: 5 },
  planInfo: { flex: 1 },
  planTitle: { fontSize: 14, fontWeight: '600', color: '#161B2E' },
  planMeta: { fontSize: 12, color: '#8C8C88', marginTop: 2 },
  rsvpBadge: { fontSize: 11, fontWeight: '700', color: '#161B2E' },
});
