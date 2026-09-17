import { useState } from 'react';
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
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  const { token, login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

  function validate(): string | null {
    if (mode === 'signup' && !name.trim()) return 'Escribe tu nombre completo.';
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
        await register(name.trim(), email.trim(), password);
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

  if (token) {
    return <Redirect href={justRegistered ? '/onboarding' : '/home'} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>cantixplora</Text>
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
  flex: { flex: 1, backgroundColor: '#161B2E' },
  container: { flexGrow: 1, padding: 24, paddingTop: 64 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 32 },
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
  tabActive: { backgroundColor: '#161B2E' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#161B2E' },
  tabLabelActive: { color: '#fff' },
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
  forgotPasswordLink: { minHeight: 44, justifyContent: 'center', alignItems: 'flex-end', marginBottom: 4 },
  forgotPasswordLabel: { fontSize: 13, color: '#161B2E', fontWeight: '600' },
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
