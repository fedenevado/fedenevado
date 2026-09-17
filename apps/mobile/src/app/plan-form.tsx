import { useCallback, useEffect, useState } from 'react';
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
import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { api, ApiError, type Friend, type PlanType } from '@/api/client';
import { PLAN_TYPE_OPTIONS } from '@/plans/plan-types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function planHref(id: string): Href {
  return `/plan/${id}` as Href;
}

export default function PlanFormScreen() {
  const router = useRouter();
  const { id, initialDate, initialInvitedIds } = useLocalSearchParams<{
    id?: string;
    initialDate?: string;
    initialInvitedIds?: string;
  }>();
  const isEdit = !!id;
  const { token } = useAuth();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PlanType>('viaje');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [invited, setInvited] = useState<string[]>([]);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const [friendList, plan] = await Promise.all([
        api.listFriends(token),
        isEdit ? api.getPlan(token, id!) : Promise.resolve(null),
      ]);
      setFriends(friendList);
      if (plan) {
        setTitle(plan.title);
        setType(plan.type);
        setStartDate(plan.startDate);
        setEndDate(plan.endDate ?? '');
        setTime(plan.time ?? '');
        setLocation(plan.location ?? '');
        const friendIds = new Set(friendList.map((f) => f.id));
        setInvited(plan.participants.filter((p) => p.userId && friendIds.has(p.userId)).map((p) => p.userId!));
      } else {
        // Preselección al crear desde el Calendario/Inicio (fecha del día
        // tocado) o desde "Buscar hueco común" (fecha + amigos ya elegidos).
        if (initialDate) setStartDate(initialDate);
        if (initialInvitedIds) setInvited(initialInvitedIds.split(',').filter(Boolean));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  }, [token, isEdit, id]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  if (!token) {
    return <Redirect href="/login" />;
  }

  function toggleFriend(friendId: string) {
    setInvited((prev) => (prev.includes(friendId) ? prev.filter((x) => x !== friendId) : [...prev, friendId]));
  }

  function canAdvanceFromStep2() {
    if (!DATE_RE.test(startDate)) return false;
    if (type === 'viaje' && endDate && !DATE_RE.test(endDate)) return false;
    if ((type === 'comida' || type === 'evento') && time && !TIME_RE.test(time)) return false;
    return true;
  }

  async function handleSubmit() {
    if (!token) return;
    setIsSaving(true);
    setError(null);
    try {
      const input = {
        title: title.trim() || 'Nuevo plan',
        type,
        startDate,
        endDate: type === 'viaje' && endDate ? endDate : undefined,
        time: (type === 'comida' || type === 'evento') && time ? time : undefined,
        location: location.trim() || undefined,
        invitedFriendIds: invited,
      };
      const plan = isEdit ? await api.updatePlan(token, id!, input) : await api.createPlan(token, input);
      router.replace(planHref(plan.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setIsSaving(false);
    }
  }

  const filteredFriends = friends.filter((f) => f.name.toLowerCase().includes(friendSearch.toLowerCase()));

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          style={styles.backButton}
        >
          <Text style={styles.backLabel}>✕</Text>
        </Pressable>
        <Text style={styles.title}>{isEdit ? 'Editar plan' : 'Nuevo plan'}</Text>
      </View>

      <View style={styles.stepBar}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.stepSegment, step >= s && styles.stepSegmentActive]} />
        ))}
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
          {step === 1 && (
            <>
              <Text style={styles.label}>Título</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Ej: Finde en Sintra"
                accessibilityLabel="Título del plan"
                style={styles.input}
              />
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.chipRow}>
                {PLAN_TYPE_OPTIONS.map((t) => {
                  const active = type === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => setType(t.value)}
                      accessibilityRole="radio"
                      accessibilityLabel={`Tipo ${t.label}`}
                      accessibilityState={{ selected: active }}
                      style={[styles.chip, active && { backgroundColor: t.color, borderColor: t.color }]}
                    >
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={() => setStep(2)}
                disabled={!title.trim()}
                accessibilityRole="button"
                accessibilityLabel="Siguiente"
                style={[styles.primaryButton, !title.trim() && styles.buttonDisabled]}
              >
                <Text style={styles.primaryButtonLabel}>Siguiente</Text>
              </Pressable>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.label}>{type === 'viaje' ? 'Fecha de inicio (AAAA-MM-DD)' : 'Fecha (AAAA-MM-DD)'}</Text>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2026-10-03"
                accessibilityLabel="Fecha del plan"
                style={styles.input}
              />
              {type === 'viaje' && (
                <>
                  <Text style={styles.label}>Fecha de fin (AAAA-MM-DD, opcional)</Text>
                  <TextInput
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="2026-10-05"
                    accessibilityLabel="Fecha de fin del plan"
                    style={styles.input}
                  />
                </>
              )}
              {(type === 'comida' || type === 'evento') && (
                <>
                  <Text style={styles.label}>Hora (HH:mm, opcional)</Text>
                  <TextInput
                    value={time}
                    onChangeText={setTime}
                    placeholder="21:00"
                    accessibilityLabel="Hora del plan"
                    style={styles.input}
                  />
                </>
              )}
              <Text style={styles.label}>Lugar (opcional)</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Ej: Sintra, Portugal"
                accessibilityLabel="Lugar del plan"
                style={styles.input}
              />
              <View style={styles.row}>
                <Pressable
                  onPress={() => setStep(1)}
                  accessibilityRole="button"
                  accessibilityLabel="Atrás"
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonLabel}>Atrás</Text>
                </Pressable>
                <Pressable
                  onPress={() => setStep(3)}
                  disabled={!canAdvanceFromStep2()}
                  accessibilityRole="button"
                  accessibilityLabel="Siguiente"
                  style={[styles.primaryButton, styles.flex1, !canAdvanceFromStep2() && styles.buttonDisabled]}
                >
                  <Text style={styles.primaryButtonLabel}>Siguiente</Text>
                </Pressable>
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.label}>Invitar amigos</Text>
              <TextInput
                value={friendSearch}
                onChangeText={setFriendSearch}
                placeholder="Buscar amigo..."
                accessibilityLabel="Buscar amigo para invitar"
                style={styles.input}
              />
              {invited.length > 0 && (
                <Text style={styles.invitedCount}>
                  {invited.length} invitado{invited.length !== 1 ? 's' : ''}
                </Text>
              )}
              {filteredFriends.length === 0 ? (
                <Text style={styles.emptyText}>
                  {friends.length === 0 ? 'Todavía no tienes amigos para invitar.' : `Sin resultados para "${friendSearch}".`}
                </Text>
              ) : (
                filteredFriends.map((f) => {
                  const active = invited.includes(f.id);
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => toggleFriend(f.id)}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`Invitar a ${f.name}`}
                      accessibilityState={{ checked: active }}
                      style={[styles.friendRow, active && styles.friendRowActive]}
                    >
                      <Text style={styles.friendName}>{f.name}</Text>
                      <Text style={styles.friendCheck}>{active ? '✓' : ''}</Text>
                    </Pressable>
                  );
                })
              )}
              <View style={styles.row}>
                <Pressable
                  onPress={() => setStep(2)}
                  accessibilityRole="button"
                  accessibilityLabel="Atrás"
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonLabel}>Atrás</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={isSaving}
                  accessibilityRole="button"
                  accessibilityLabel={isEdit ? 'Guardar cambios' : 'Crear plan'}
                  style={[styles.primaryButton, styles.flex1, isSaving && styles.buttonDisabled]}
                >
                  <Text style={styles.primaryButtonLabel}>{isEdit ? 'Guardar cambios' : 'Crear plan'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F2', padding: 20, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  backLabel: { fontSize: 18, color: '#161B2E', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', color: '#161B2E', marginLeft: 4 },
  stepBar: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  stepSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#DCDCD8' },
  stepSegmentActive: { backgroundColor: '#FF5A3C' },
  error: { color: '#C0392B', fontSize: 13, marginBottom: 10 },
  loading: { marginTop: 24 },
  scrollContent: { paddingBottom: 40 },
  label: { fontSize: 11, color: '#8C8C88', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: { fontSize: 12, fontWeight: '600', color: '#161B2E' },
  chipLabelActive: { color: '#fff' },
  row: { flexDirection: 'row', gap: 8, marginTop: 20 },
  flex1: { flex: 1 },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
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
  },
  secondaryButtonLabel: { color: '#161B2E', fontSize: 14, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  invitedCount: { fontSize: 11, color: '#8C8C88', marginBottom: 6 },
  emptyText: { fontSize: 12, color: '#8C8C88', textAlign: 'center', paddingVertical: 16 },
  friendRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E6E6E3',
    backgroundColor: '#fff',
    marginBottom: 6,
  },
  friendRowActive: { borderColor: '#161B2E', borderWidth: 2 },
  friendName: { fontSize: 13, color: '#161B2E' },
  friendCheck: { fontSize: 14, color: '#161B2E', fontWeight: '700' },
});
