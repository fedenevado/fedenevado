import { useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useURL } from 'expo-linking';
import { useAuth } from '@/auth/auth-context';
import { api, ApiError } from '@/api/client';

// Supabase redirige tras el enlace del email añadiendo los parámetros de la
// sesión de recuperación como fragmento (#access_token=...&type=recovery),
// no como query string, así que hay que parsear la URL a mano.
function parseLinkParams(url: string | null): Record<string, string> {
  if (!url) return {};
  const params: Record<string, string> = {};
  const [beforeHash, hash] = url.split('#');
  const query = beforeHash.includes('?') ? beforeHash.split('?')[1] : undefined;
  for (const part of [query, hash]) {
    if (!part) continue;
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const [key, value] = pair.split('=');
      if (key) params[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
    }
  }
  return params;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { applySession } = useAuth();
  const url = useURL();
  const params = useMemo(() => parseLinkParams(url), [url]);
  const accessToken = params.type === 'recovery' && params.access_token ? params.access_token : null;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): string | null {
    if (password.trim().length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden.';
    return null;
  }

  async function submit() {
    if (!accessToken) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const session = await api.resetPassword(accessToken, password);
      await applySession(session.accessToken, session.refreshToken);
      router.replace('/home');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!accessToken) {
    return (
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Enlace no válido</Text>
          <View style={styles.card}>
            <Text style={styles.subtitle}>
              Este enlace de recuperación no es válido o ha caducado. Pide uno nuevo desde la
              pantalla de inicio de sesión.
            </Text>
            <Pressable
              onPress={() => router.replace('/forgot-password')}
              accessibilityRole="button"
              accessibilityLabel="Pedir un enlace nuevo"
              style={styles.button}
            >
              <Text style={styles.buttonLabel}>Pedir un enlace nuevo</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Nueva contraseña</Text>

        <View style={styles.card}>
          <Text style={styles.subtitle}>Escribe tu nueva contraseña para tu cuenta de cantixplora.</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Nueva contraseña"
            secureTextEntry
            autoComplete="password-new"
            accessibilityLabel="Nueva contraseña"
            style={styles.input}
          />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirmar nueva contraseña"
            secureTextEntry
            autoComplete="password-new"
            accessibilityLabel="Confirmar nueva contraseña"
            style={styles.input}
            onSubmitEditing={submit}
          />

          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
              {error}
            </Text>
          )}

          <Pressable
            onPress={submit}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Guardar nueva contraseña"
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" accessibilityLabel="Guardando" />
            ) : (
              <Text style={styles.buttonLabel}>Guardar contraseña</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#161B2E' },
  container: { flexGrow: 1, padding: 24, paddingTop: 64 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  subtitle: { fontSize: 13, color: '#5A5A56', marginBottom: 18, lineHeight: 18 },
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
  button: {
    minHeight: 44,
    backgroundColor: '#161B2E',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
