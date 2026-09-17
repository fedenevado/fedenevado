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
import { useRouter } from 'expo-router';
import { api, ApiError } from '@/api/client';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!email.trim()) {
      setError('Escribe tu email.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backButton}
        >
          <Text style={styles.backLabel}>← Volver</Text>
        </Pressable>

        <Text style={styles.title}>Recuperar contraseña</Text>

        <View style={styles.card}>
          {sent ? (
            <>
              <Text style={styles.confirmationText}>
                Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer tu
                contraseña. Revisa tu bandeja de entrada (y la carpeta de spam).
              </Text>
              <Pressable
                onPress={() => router.replace('/login')}
                accessibilityRole="button"
                accessibilityLabel="Volver a iniciar sesión"
                style={styles.button}
              >
                <Text style={styles.buttonLabel}>Volver a iniciar sesión</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Escribe el email de tu cuenta y te enviaremos un enlace para establecer una nueva
                contraseña.
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                accessibilityLabel="Email"
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
                accessibilityLabel="Enviar enlace de recuperación"
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" accessibilityLabel="Enviando" />
                ) : (
                  <Text style={styles.buttonLabel}>Enviar enlace</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#161B2E' },
  container: { flexGrow: 1, padding: 24, paddingTop: 64 },
  backButton: { minHeight: 44, justifyContent: 'center', marginBottom: 16 },
  backLabel: { fontSize: 14, color: '#fff', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  subtitle: { fontSize: 13, color: '#5A5A56', marginBottom: 18, lineHeight: 18 },
  confirmationText: { fontSize: 14, color: '#161B2E', marginBottom: 20, lineHeight: 20 },
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
