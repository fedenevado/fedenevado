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
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { api, ApiError, type InvitationPreview } from '@/api/client';
import { formatPlanDate, planTypeColor, planTypeLabel } from '@/plans/plan-types';

type Status = 'loading' | 'joined' | 'pending' | 'error';
type GuestJoinStatus = 'idle' | 'submitting' | 'joined' | 'pending' | 'error';

function planHref(id: string): Href {
  return `/plan/${id}` as Href;
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
    if (authToken) join();
  }, [authToken, join]);

  // Sin cuenta: vista previa pública del plan (GuestPlanPreview del prototipo).
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestStatus, setGuestStatus] = useState<GuestJoinStatus>('idle');
  const [guestError, setGuestError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!invitationToken) return;
    setPreviewError(null);
    try {
      setPreview(await api.getInvitationPreview(invitationToken));
    } catch (err) {
      setPreviewError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    }
  }, [invitationToken]);

  useEffect(() => {
    if (!authToken) loadPreview();
  }, [authToken, loadPreview]);

  async function joinAsGuest() {
    if (!invitationToken || !guestName.trim()) return;
    setGuestStatus('submitting');
    setGuestError(null);
    try {
      const result = await api.joinAsGuestViaInvitation(invitationToken, guestName.trim());
      setGuestStatus(result.status);
    } catch (err) {
      setGuestError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
      setGuestStatus('error');
    }
  }

  if (!authToken) {
    if (previewError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>No se pudo abrir la invitación</Text>
          <Text style={styles.subtitle}>{previewError}</Text>
          <Pressable
            onPress={() => router.push('/login' as Href)}
            accessibilityRole="button"
            accessibilityLabel="Ir a iniciar sesión"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonLabel}>Iniciar sesión</Text>
          </Pressable>
        </View>
      );
    }

    if (!preview) {
      return (
        <View style={styles.container}>
          <ActivityIndicator accessibilityLabel="Cargando plan" />
        </View>
      );
    }

    return (
      <KeyboardAvoidingView style={styles.guestFlex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.guestScroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.guestHeader, { backgroundColor: planTypeColor(preview.type) }]}>
            <Pressable
              onPress={() => router.push('/login' as Href)}
              accessibilityRole="button"
              accessibilityLabel="Iniciar sesión"
              style={styles.loginPill}
            >
              <Text style={styles.loginPillLabel}>Iniciar sesión</Text>
            </Pressable>
            <Text style={styles.guestType}>{planTypeLabel(preview.type)}</Text>
            <Text style={styles.guestTitle} numberOfLines={2}>
              {preview.title}
            </Text>
            <Text style={styles.guestSubtitle}>
              {preview.location ? `${preview.location} · ` : ''}
              {formatPlanDate(preview.startDate, preview.endDate, preview.time)}
            </Text>
            <Text style={styles.guestOrganizer}>Organiza {preview.organizerName}</Text>
          </View>

          <View style={styles.guestBody}>
            {preview.guestListVisibility !== 'hidden' && preview.confirmedCount !== null && (
              <>
                <Text style={styles.sectionLabel}>{preview.confirmedCount} confirmados</Text>
                {preview.confirmedPreview && preview.confirmedPreview.length > 0 && (
                  <View style={styles.avatarRow}>
                    {preview.confirmedPreview.map((p, i) => (
                      <View
                        key={i}
                        style={[styles.avatarCircle, i > 0 && styles.avatarCircleOverlap]}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      >
                        <Text style={styles.avatarLabel}>{getInitials(p.name)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {guestStatus === 'joined' ? (
              <View style={styles.card}>
                <Text style={styles.celebrationEmoji}>🎉</Text>
                <Text style={styles.celebrationTitle}>¡Te has unido!</Text>
                <Text style={styles.celebrationSubtitle}>
                  Crea una cuenta para chatear, ver gastos y organizar planes tú mismo.
                </Text>
                <Pressable
                  onPress={() => router.push('/login' as Href)}
                  accessibilityRole="button"
                  accessibilityLabel="Crear cuenta"
                  style={styles.primaryButtonWide}
                >
                  <Text style={styles.primaryButtonLabel}>Crear cuenta</Text>
                </Pressable>
              </View>
            ) : guestStatus === 'pending' ? (
              <View style={styles.card}>
                <Text style={styles.celebrationTitle}>Solicitud enviada</Text>
                <Text style={styles.celebrationSubtitle}>
                  Este plan es privado. El organizador tiene que aprobar tu solicitud.
                </Text>
                <Pressable
                  onPress={() => router.push('/login' as Href)}
                  accessibilityRole="button"
                  accessibilityLabel="Crear cuenta"
                  style={styles.primaryButtonWide}
                >
                  <Text style={styles.primaryButtonLabel}>Crear cuenta</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.sectionLabelSm}>¿Vienes?</Text>
                <TextInput
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder="Tu nombre"
                  autoCapitalize="words"
                  accessibilityLabel="Tu nombre"
                  style={styles.input}
                  onSubmitEditing={joinAsGuest}
                />
                {guestError && (
                  <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
                    {guestError}
                  </Text>
                )}
                <Pressable
                  onPress={joinAsGuest}
                  disabled={guestStatus === 'submitting' || !guestName.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Unirme al plan"
                  style={[
                    styles.primaryButtonWide,
                    (guestStatus === 'submitting' || !guestName.trim()) && styles.buttonDisabled,
                  ]}
                >
                  {guestStatus === 'submitting' ? (
                    <ActivityIndicator color="#fff" accessibilityLabel="Enviando" />
                  ) : (
                    <Text style={styles.primaryButtonLabel}>Unirme al plan</Text>
                  )}
                </Pressable>
                <Text style={styles.guestHint}>
                  Te unes como invitado, sin crear cuenta. Podrás crear una más tarde para ver más funciones.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

  guestFlex: { flex: 1, backgroundColor: '#F5F5F2' },
  guestScroll: { flexGrow: 1 },
  guestHeader: { paddingTop: 48, paddingHorizontal: 20, paddingBottom: 20 },
  loginPill: {
    alignSelf: 'flex-end',
    minHeight: 32,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 20,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  loginPillLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  guestType: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  guestTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  guestSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  guestOrganizer: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  guestBody: { flex: 1, padding: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#8C8C88', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  sectionLabelSm: { fontSize: 11, fontWeight: '700', color: '#8C8C88', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  avatarRow: { flexDirection: 'row', marginBottom: 20 },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F5F5F2',
  },
  avatarCircleOverlap: { marginLeft: -10 },
  avatarLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  error: { color: '#C0392B', fontSize: 13, marginBottom: 10 },
  primaryButtonWide: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  guestHint: { fontSize: 10.5, color: '#8C8C88', marginTop: 10, lineHeight: 15 },
  celebrationEmoji: { fontSize: 30, textAlign: 'center', marginBottom: 8 },
  celebrationTitle: { fontSize: 15, fontWeight: '700', color: '#161B2E', textAlign: 'center', marginBottom: 6 },
  celebrationSubtitle: { fontSize: 12, color: '#8C8C88', textAlign: 'center', marginBottom: 16 },
});
