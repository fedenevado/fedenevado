import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { api, ApiError } from '@/api/client';
import { inviteHref, onboardingWithInviteHref, parseInviteParam } from '@/invite/invite-token';

const USERNAME_FORMAT_ERROR = 'Solo minúsculas, números, puntos y guiones bajos (3-20 caracteres).';
const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  const { token, user, login, register } = useAuth();
  // Llegan desde la vista previa de una invitación sin cuenta (invite/[token].tsx):
  // tras autenticarse hay que volver a esa invitación para unirse al plan.
  const params = useLocalSearchParams<{ invite?: string; mode?: string }>();
  const inviteToken = parseInviteParam(params.invite);
  const [mode, setMode] = useState<Mode>(params.mode === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const availabilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sugiere un username a partir del nombre mientras el usuario no haya
  // editado el campo a mano (debounced: el endpoint es público y va limitado
  // a 20/min, escribir el nombre entero disparado a cada tecla lo agotaría).
  useEffect(() => {
    if (mode !== 'signup' || usernameTouched || !name.trim()) return;
    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    suggestionTimer.current = setTimeout(async () => {
      try {
        const { username: suggested } = await api.suggestUsername(name.trim());
        setUsername(suggested);
      } catch {
        // Sugerencia best-effort: si falla, el usuario simplemente escribe el suyo.
      }
    }, 500);
    return () => {
      if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    };
  }, [name, mode, usernameTouched]);

  // Validación en vivo del username editado a mano: formato primero (sin red),
  // disponibilidad después (debounced, mismo motivo que arriba).
  useEffect(() => {
    if (mode !== 'signup' || !usernameTouched) return;
    if (!username) {
      setUsernameError(null);
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      setUsernameError(USERNAME_FORMAT_ERROR);
      return;
    }
    setUsernameError(null);
    if (availabilityTimer.current) clearTimeout(availabilityTimer.current);
    setIsCheckingUsername(true);
    availabilityTimer.current = setTimeout(async () => {
      try {
        const { available, reason } = await api.checkUsernameAvailability(username);
        setUsernameError(available ? null : (reason ?? 'Ese nombre de usuario ya está en uso.'));
      } catch {
        // No se pudo comprobar disponibilidad ahora: se revalida igualmente al enviar.
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);
    return () => {
      if (availabilityTimer.current) clearTimeout(availabilityTimer.current);
    };
  }, [username, mode, usernameTouched]);

  function handleUsernameChange(value: string) {
    setUsernameTouched(true);
    setUsername(value.toLowerCase());
  }

  function validate(): string | null {
    if (mode === 'signup' && !name.trim()) return 'Escribe tu nombre completo.';
    if (mode === 'signup' && !USERNAME_REGEX.test(username)) return USERNAME_FORMAT_ERROR;
    if (mode === 'signup' && usernameError) return usernameError;
    if (mode === 'signup' && isCheckingUsername) return 'Espera a que se compruebe el nombre de usuario.';
    if (!email.trim()) return 'Escribe tu email.';
    if (!password.trim()) return 'Escribe tu contraseña.';
    if (mode === 'signup' && password.trim().length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    return null;
  }

  async function submit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        setJustRegistered(true);
        await register(name.trim(), username, email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setJustRegistered(false);
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (token && user) {
    if (justRegistered) {
      return <Redirect href={inviteToken ? onboardingWithInviteHref(inviteToken) : '/onboarding'} />;
    }
    return <Redirect href={inviteToken ? inviteHref(inviteToken) : '/home'} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Image
          source={require('../../assets/cantixplora-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessible
          accessibilityRole="header"
          accessibilityLabel="Cantixplora"
        />
        <Text style={styles.subtitle}>Planes, gastos y calendario con tus amigos, en un solo sitio.</Text>

        <View style={styles.card}>
          <View style={styles.tabRow}>
            {(
              [
                { key: 'login', label: 'Iniciar sesión' },
                { key: 'signup', label: 'Crear cuenta' },
              ] as const
            ).map((tab) => {
              const isActive = mode === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => {
                    setMode(tab.key);
                    setError(null);
                  }}
                  accessibilityRole="tab"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: isActive }}
                  style={[styles.tab, isActive && styles.tabActive]}
                >
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {mode === 'signup' && (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nombre completo"
              autoCapitalize="words"
              accessibilityLabel="Nombre completo"
              style={styles.input}
            />
          )}
          {mode === 'signup' && (
            <>
              <View style={styles.usernameRow}>
                <Text style={styles.usernamePrefix}>@</Text>
                <TextInput
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="nombre.de.usuario"
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Nombre de usuario"
                  style={styles.usernameInput}
                />
                {isCheckingUsername && <ActivityIndicator size="small" accessibilityLabel="Comprobando disponibilidad" />}
              </View>
              {usernameError && (
                <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
                  {usernameError}
                </Text>
              )}
            </>
          )}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            secureTextEntry
            autoComplete="password"
            accessibilityLabel="Contraseña"
            style={styles.input}
            onSubmitEditing={submit}
          />

          {mode === 'login' && (
            <Pressable
              onPress={() => router.push('/forgot-password')}
              accessibilityRole="button"
              accessibilityLabel="¿Olvidaste tu contraseña?"
              style={styles.forgotPasswordLink}
            >
              <Text style={styles.forgotPasswordLabel}>¿Olvidaste tu contraseña?</Text>
            </Pressable>
          )}

          {error && (
            <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
              {error}
            </Text>
          )}

          <Pressable
            onPress={submit}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" accessibilityLabel="Enviando" />
            ) : (
              <Text style={styles.buttonLabel}>{mode === 'signup' ? 'Crear cuenta' : 'Entrar'}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#2D1E1B' },
  container: { flexGrow: 1, padding: 24, paddingTop: 64 },
  // 900×177 → misma proporción para que no se deforme.
  logo: { alignSelf: 'center', width: 200, height: 200 * (177 / 900), marginBottom: 12 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 32, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F0F0EE',
  },
  tabActive: { backgroundColor: '#2D1E1B' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#2D1E1B' },
  tabLabelActive: { color: '#fff', fontWeight: '800', textDecorationLine: 'underline' },
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
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 4,
  },
  usernamePrefix: { fontSize: 15, color: '#6B6B67', fontWeight: '600' },
  usernameInput: { flex: 1, minHeight: 44, fontSize: 15 },
  forgotPasswordLink: { minHeight: 44, justifyContent: 'center', alignItems: 'flex-end', marginBottom: 4 },
  forgotPasswordLabel: { fontSize: 13, color: '#2D1E1B', fontWeight: '600' },
  button: {
    minHeight: 44,
    backgroundColor: '#2D1E1B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
