import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, ApiError, type ChatMessage } from '@/api/client';

const POLL_INTERVAL_MS = 4000;

interface Props {
  token: string;
  planId: string;
  myUserId: string;
}

export function ChatTab({ token, planId, myUserId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  // Anuncio de accesibilidad para mensajes entrantes: se lee con
  // accessibilityLiveRegion="polite" (nunca "assertive"), así VoiceOver/
  // TalkBack lo anuncia sin interrumpir la lectura en curso del usuario.
  const [announcement, setAnnouncement] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await api.listMessages(token, planId);

      if (!isFirstLoadRef.current) {
        const incoming = result.filter((m) => !seenIdsRef.current.has(m.id) && m.senderId !== myUserId);
        if (incoming.length === 1) {
          setAnnouncement(`Nuevo mensaje de ${incoming[0].senderName}: ${incoming[0].content}`);
        } else if (incoming.length > 1) {
          setAnnouncement(`${incoming.length} mensajes nuevos, el último de ${incoming[incoming.length - 1].senderName}`);
        }
      }
      seenIdsRef.current = new Set(result.map((m) => m.id));
      isFirstLoadRef.current = false;

      setMessages(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  }, [token, planId, myUserId]);

  useEffect(() => {
    load();
    // El intervalo se limpia al desmontar (al cambiar de pestaña), y se
    // pausa mientras la app está en segundo plano para no gastar datos ni
    // batería, ni chocar con el rate-limit del backend sin necesidad.
    let interval: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      if (interval) return;
      interval = setInterval(load, POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }

    if (AppState.currentState === 'active') startPolling();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        load();
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [load]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: !isFirstLoadRef.current });
  }, [messages]);

  async function handleSend() {
    const content = draft.trim();
    if (!content) return;
    setSending(true);
    setError(null);
    try {
      await api.sendMessage(token, planId, content);
      setDraft('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setSending(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        <ActivityIndicator style={styles.loading} accessibilityLabel="Cargando chat" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text accessibilityLiveRegion="polite" style={styles.srOnly}>
        {announcement}
      </Text>

      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
          {error}
        </Text>
      )}

      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.length === 0 && <Text style={styles.emptyText}>Aún no hay mensajes. Escribe el primero.</Text>}
        {messages.map((m) => {
          const isMine = m.senderId === myUserId;
          return (
            <View key={m.id} style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {!isMine && <Text style={styles.senderName}>{m.senderName}</Text>}
                <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{m.content}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={handleSend}
          placeholder="Escribe un mensaje..."
          accessibilityLabel="Escribe un mensaje"
          style={[styles.input, styles.flex1]}
          multiline
        />
        <Pressable
          onPress={handleSend}
          disabled={sending || !draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
          style={[styles.sendButton, (sending || !draft.trim()) && styles.buttonDisabled]}
        >
          <Text style={styles.sendButtonLabel}>Enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  loading: { marginTop: 24 },
  error: { color: '#C0392B', fontSize: 13, marginBottom: 10 },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
  messages: { flex: 1 },
  messagesContent: { paddingBottom: 12 },
  emptyText: { fontSize: 12, color: '#8C8C88', textAlign: 'center', marginTop: 30 },
  bubbleRow: { marginBottom: 8, flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: '#161B2E' },
  bubbleTheirs: { backgroundColor: '#fff' },
  senderName: { fontSize: 10, fontWeight: '700', color: '#0E6E64', marginBottom: 2 },
  bubbleText: { fontSize: 13, color: '#161B2E' },
  bubbleTextMine: { color: '#fff' },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'flex-end' },
  input: {
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: '#fff',
  },
  flex1: { flex: 1 },
  sendButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FF5A3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
});
