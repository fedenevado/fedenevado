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
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { api, ApiError, type ListTemplate } from '@/api/client';

export default function ListTemplatesScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [templates, setTemplates] = useState<ListTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [itemText, setItemText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      setTemplates(await api.listTemplates(token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!token) {
    return <Redirect href="/login" />;
  }

  function startNew() {
    setEditingId(null);
    setTitle('');
    setItems([]);
    setItemText('');
    setShowForm(true);
  }

  function startEdit(template: ListTemplate) {
    setEditingId(template.id);
    setTitle(template.title);
    setItems([...template.items]);
    setItemText('');
    setExpandedId(null);
    setShowForm(true);
  }

  function addItemToForm() {
    if (!itemText.trim()) return;
    setItems((prev) => [...prev, itemText.trim()]);
    setItemText('');
  }

  function removeItemFromForm(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const canSave = title.trim().length > 0 && items.length > 0;

  async function saveTemplate() {
    if (!canSave || !token) return;
    setBusy(true);
    setError(null);
    try {
      if (editingId) {
        await api.updateListTemplate(token, editingId, { title: title.trim(), items });
      } else {
        await api.createListTemplate(token, { title: title.trim(), items });
      }
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteListTemplate(token, id);
      setConfirmDeleteId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backButton}
        >
          <Text style={styles.backLabel}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.title}>Plantillas de listas</Text>
      </View>

      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
          {error}
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loading} accessibilityLabel="Cargando plantillas" />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {templates.length === 0 && !showForm && (
            <Text style={styles.emptyText}>
              Aún no tienes plantillas guardadas. Se crean desde las listas de un plan, o aquí mismo.
            </Text>
          )}

          {templates.map((t) => {
            const isOpen = expandedId === t.id;
            return (
              <View key={t.id} style={styles.card}>
                <Pressable
                  onPress={() => setExpandedId(isOpen ? null : t.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.title}, ${t.items.length} elementos`}
                  accessibilityState={{ expanded: isOpen }}
                  style={styles.cardHeader}
                >
                  <Text style={styles.cardTitle}>★ {t.title}</Text>
                  <Text style={styles.cardMeta}>{t.items.length} elementos</Text>
                </Pressable>
                <View style={styles.cardActions}>
                  <Pressable
                    onPress={() => startEdit(t)}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar plantilla ${t.title}`}
                    style={styles.iconButton}
                  >
                    <Text style={styles.iconButtonLabel}>Editar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirmDeleteId(t.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar plantilla ${t.title}`}
                    style={styles.iconButton}
                  >
                    <Text style={[styles.iconButtonLabel, styles.iconButtonDanger]}>Eliminar</Text>
                  </Pressable>
                </View>
                {isOpen && (
                  <View style={styles.cardItems}>
                    {t.items.map((text, i) => (
                      <Text key={i} style={styles.cardItemText}>
                        • {text}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {showForm ? (
            <View style={styles.formCard}>
              <Text style={styles.sectionLabel}>{editingId ? 'Editar plantilla' : 'Nueva plantilla'}</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Ej: Qué llevar a la playa"
                accessibilityLabel="Título de la plantilla"
                style={styles.input}
              />
              {items.map((text, i) => (
                <View key={i} style={styles.formItemRow}>
                  <Text style={styles.formItemText}>• {text}</Text>
                  <Pressable
                    onPress={() => removeItemFromForm(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar elemento ${text}`}
                    style={styles.itemDeleteButton}
                  >
                    <Text style={styles.itemDeleteLabel}>✕</Text>
                  </Pressable>
                </View>
              ))}
              <View style={styles.addItemRow}>
                <TextInput
                  value={itemText}
                  onChangeText={setItemText}
                  onSubmitEditing={addItemToForm}
                  placeholder="Añadir elemento..."
                  accessibilityLabel="Añadir elemento a la plantilla"
                  style={[styles.input, styles.flex1]}
                />
                <Pressable
                  onPress={addItemToForm}
                  accessibilityRole="button"
                  accessibilityLabel="Añadir elemento a la plantilla"
                  style={styles.addItemButton}
                >
                  <Text style={styles.addItemButtonLabel}>+</Text>
                </Pressable>
              </View>
              <View style={styles.row}>
                <Pressable
                  onPress={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar"
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonLabel}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={saveTemplate}
                  disabled={!canSave || busy}
                  accessibilityRole="button"
                  accessibilityLabel={editingId ? 'Guardar cambios de la plantilla' : 'Guardar plantilla'}
                  style={[styles.primaryButton, styles.flex1, (!canSave || busy) && styles.buttonDisabled]}
                >
                  <Text style={styles.primaryButtonLabel}>{editingId ? 'Guardar cambios' : 'Guardar plantilla'}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={startNew}
              accessibilityRole="button"
              accessibilityLabel="Nueva plantilla"
              style={styles.newTemplateButton}
            >
              <Text style={styles.newTemplateButtonLabel}>+ Nueva plantilla</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {confirmDeleteId && (
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>¿Eliminar esta plantilla?</Text>
            <Text style={styles.dialogSubtitle}>Las listas ya creadas a partir de ella no se ven afectadas.</Text>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => setConfirmDeleteId(null)}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonLabel}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => deleteTemplate(confirmDeleteId)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Confirmar eliminar plantilla"
                style={styles.dangerButton}
              >
                <Text style={styles.dangerButtonLabel}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F2', padding: 20, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 4 },
  backButton: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  backLabel: { fontSize: 15, color: '#161B2E', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: '#161B2E', flexShrink: 1 },
  error: { color: '#C0392B', fontSize: 13, marginBottom: 10 },
  loading: { marginTop: 24 },
  scrollContent: { paddingBottom: 40 },
  emptyText: { fontSize: 12, color: '#8C8C88', textAlign: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
  cardHeader: { minHeight: 44, paddingHorizontal: 14, paddingTop: 12, justifyContent: 'center' },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#161B2E' },
  cardMeta: { fontSize: 10, color: '#8C8C88', marginTop: 2 },
  cardActions: { flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 6, gap: 4 },
  iconButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  iconButtonLabel: { fontSize: 11, fontWeight: '700', color: '#8C8C88' },
  iconButtonDanger: { color: '#FF5A3C' },
  cardItems: { paddingHorizontal: 14, paddingBottom: 12 },
  cardItemText: { fontSize: 12, color: '#5A5A56', paddingVertical: 3 },
  formCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14 },
  sectionLabel: {
    fontSize: 11,
    color: '#8C8C88',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  formItemRow: { minHeight: 36, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formItemText: { fontSize: 12, color: '#161B2E', flexShrink: 1 },
  itemDeleteButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  itemDeleteLabel: { fontSize: 14, color: '#8C8C88' },
  addItemRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  flex1: { flex: 1 },
  addItemButton: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 8,
    backgroundColor: '#F5F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemButtonLabel: { color: '#161B2E', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  primaryButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
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
  newTemplateButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTemplateButtonLabel: { color: '#161B2E', fontSize: 13, fontWeight: '700' },
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
});
