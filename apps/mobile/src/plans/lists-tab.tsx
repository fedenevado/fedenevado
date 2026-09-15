import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, ApiError, type ListTemplate, type PlanList } from '@/api/client';

interface Props {
  token: string;
  planId: string;
}

export function ListsTab({ token, planId }: Props) {
  const [lists, setLists] = useState<PlanList[]>([]);
  const [templates, setTemplates] = useState<ListTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newListTitle, setNewListTitle] = useState('');
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [confirmDeleteListId, setConfirmDeleteListId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [listResult, templateResult] = await Promise.all([
        api.listLists(token, planId),
        api.listTemplates(token),
      ]);
      setLists(listResult);
      setTemplates(templateResult);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  }, [token, planId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createList() {
    if (!newListTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.createList(token, planId, { title: newListTitle.trim() });
      setNewListTitle('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function createListFromTemplate(template: ListTemplate) {
    setBusy(true);
    setError(null);
    try {
      await api.createList(token, planId, { templateId: template.id });
      setShowTemplatePicker(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteList(listId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteList(token, planId, listId);
      setConfirmDeleteListId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function addItem(listId: string) {
    const text = (newItemText[listId] ?? '').trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      await api.addListItem(token, planId, listId, text);
      setNewItemText((prev) => ({ ...prev, [listId]: '' }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleItem(listId: string, itemId: string, done: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api.updateListItem(token, planId, listId, itemId, !done);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(listId: string, itemId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteListItem(token, planId, listId, itemId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleTemplate(list: PlanList) {
    setBusy(true);
    setError(null);
    try {
      if (list.templateId) {
        await api.unsaveListTemplate(token, planId, list.id);
      } else {
        await api.saveListAsTemplate(token, planId, list.id);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        <ActivityIndicator style={styles.loading} accessibilityLabel="Cargando listas" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
            {error}
          </Text>
        )}

        {lists.length === 0 && (
          <Text style={styles.emptyText}>Aún no hay listas. Crea una para organizar qué llevar, comprar o hacer.</Text>
        )}

        {lists.map((list) => {
          const doneCount = list.items.filter((it) => it.done).length;
          return (
            <View key={list.id} style={styles.listCard}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>{list.title}</Text>
                <View style={styles.listHeaderActions}>
                  <Text style={styles.listProgress}>
                    {doneCount}/{list.items.length}
                  </Text>
                  <Pressable
                    onPress={() => toggleTemplate(list)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={
                      list.templateId ? `Dejar de guardar "${list.title}" como plantilla` : `Guardar "${list.title}" como plantilla`
                    }
                    accessibilityState={{ selected: !!list.templateId }}
                    style={styles.iconButton}
                  >
                    <Text style={[styles.iconButtonLabel, list.templateId && styles.iconButtonActive]}>
                      {list.templateId ? '★ Plantilla' : '☆ Plantilla'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirmDeleteListId(list.id)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar lista ${list.title}`}
                    style={styles.iconButton}
                  >
                    <Text style={[styles.iconButtonLabel, styles.iconButtonDanger]}>Eliminar</Text>
                  </Pressable>
                </View>
              </View>

              {list.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Pressable
                    onPress={() => toggleItem(list.id, item.id, item.done)}
                    disabled={busy}
                    accessibilityRole="checkbox"
                    accessibilityLabel={item.text}
                    accessibilityState={{ checked: item.done }}
                    style={styles.itemCheckRow}
                  >
                    <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
                      {item.done && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                    <Text style={[styles.itemText, item.done && styles.itemTextDone]}>{item.text}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteItem(list.id, item.id)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar elemento ${item.text}`}
                    style={styles.itemDeleteButton}
                  >
                    <Text style={styles.itemDeleteLabel}>✕</Text>
                  </Pressable>
                </View>
              ))}

              <View style={styles.addItemRow}>
                <TextInput
                  value={newItemText[list.id] ?? ''}
                  onChangeText={(text) => setNewItemText((prev) => ({ ...prev, [list.id]: text }))}
                  onSubmitEditing={() => addItem(list.id)}
                  placeholder="Añadir elemento..."
                  accessibilityLabel={`Añadir elemento a ${list.title}`}
                  style={[styles.input, styles.flex1]}
                />
                <Pressable
                  onPress={() => addItem(list.id)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Añadir elemento a ${list.title}`}
                  style={styles.addItemButton}
                >
                  <Text style={styles.addItemButtonLabel}>+</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Nueva lista</Text>
          <View style={styles.addItemRow}>
            <TextInput
              value={newListTitle}
              onChangeText={setNewListTitle}
              onSubmitEditing={createList}
              placeholder="Ej: Lista de la compra"
              accessibilityLabel="Título de la nueva lista"
              style={[styles.input, styles.flex1]}
            />
            <Pressable
              onPress={createList}
              disabled={busy || !newListTitle.trim()}
              accessibilityRole="button"
              accessibilityLabel="Crear lista"
              style={[styles.primaryButton, (busy || !newListTitle.trim()) && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonLabel}>Crear</Text>
            </Pressable>
          </View>

          {templates.length > 0 && (
            <Pressable
              onPress={() => setShowTemplatePicker((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={`O usa una plantilla guardada, ${templates.length} disponibles`}
              accessibilityState={{ expanded: showTemplatePicker }}
              style={styles.templateToggle}
            >
              <Text style={styles.templateToggleLabel}>★ O usa una plantilla guardada ({templates.length})</Text>
            </Pressable>
          )}

          {showTemplatePicker &&
            templates.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => createListFromTemplate(t)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Crear lista desde plantilla ${t.title}, ${t.items.length} elementos`}
                style={styles.templateRow}
              >
                <Text style={styles.templateRowTitle}>{t.title}</Text>
                <Text style={styles.templateRowMeta}>{t.items.length} elementos</Text>
              </Pressable>
            ))}
        </View>
      </ScrollView>

      {confirmDeleteListId && (
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>¿Eliminar esta lista?</Text>
            <Text style={styles.dialogSubtitle}>Esta acción no se puede deshacer.</Text>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => setConfirmDeleteListId(null)}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonLabel}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => deleteList(confirmDeleteListId)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Confirmar eliminar lista"
                style={styles.dangerButton}
              >
                <Text style={styles.dangerButtonLabel}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  loading: { marginTop: 24 },
  error: { color: '#C0392B', fontSize: 13, marginBottom: 10 },
  emptyText: { fontSize: 12, color: '#8C8C88', textAlign: 'center', marginTop: 20, marginBottom: 16 },
  listCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 },
  listTitle: { fontSize: 13, fontWeight: '700', color: '#161B2E', flexShrink: 1 },
  listHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listProgress: { fontSize: 11, color: '#8C8C88', marginRight: 4 },
  iconButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  iconButtonLabel: { fontSize: 11, fontWeight: '700', color: '#8C8C88' },
  iconButtonActive: { color: '#0E6E64' },
  iconButtonDanger: { color: '#FF5A3C' },
  itemRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#FAFAF8',
  },
  itemCheckRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingRight: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#0E6E64', borderWidth: 0 },
  checkboxMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  itemText: { fontSize: 13, color: '#161B2E', flexShrink: 1 },
  itemTextDone: { color: '#8C8C88', textDecorationLine: 'line-through' },
  itemDeleteButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  itemDeleteLabel: { fontSize: 14, color: '#8C8C88' },
  addItemRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    backgroundColor: '#fff',
  },
  flex1: { flex: 1 },
  addItemButton: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 8,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemButtonLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  formCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14 },
  sectionLabel: {
    fontSize: 11,
    color: '#8C8C88',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  primaryButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  templateToggle: { minHeight: 44, justifyContent: 'center', marginTop: 6 },
  templateToggleLabel: { fontSize: 12, fontWeight: '600', color: '#161B2E' },
  templateRow: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E6E6E3',
    marginTop: 6,
  },
  templateRowTitle: { fontSize: 12, fontWeight: '600', color: '#161B2E' },
  templateRowMeta: { fontSize: 10, color: '#8C8C88' },
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
