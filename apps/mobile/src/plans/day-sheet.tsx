import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, type Friend, type Plan, type Reminder, type ReminderInput } from '@/api/client';
import { formatDateLabel, isoDateToDate, planTypeColor, planTypeLabel } from '@/plans/plan-types';
import { PickerField } from '@/plans/picker-field';

interface DaySheetProps {
  date: string;
  currentUserId: string;
  plans: Plan[];
  reminders: Reminder[];
  friends: Friend[];
  initialShowReminderForm?: boolean;
  onClose: () => void;
  onOpenPlan: (planId: string) => void;
  onAddEvent: (date: string) => void;
  onCreateReminder: (input: ReminderInput) => Promise<void>;
  onUpdateReminder: (id: string, input: Partial<Omit<ReminderInput, 'items'>>) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
  onToggleReminderDone: (id: string, done: boolean) => Promise<void>;
  onAddReminderItem: (reminderId: string, text: string) => Promise<void>;
  onToggleReminderItem: (reminderId: string, itemId: string, done: boolean) => Promise<void>;
  onDeleteReminderItem: (reminderId: string, itemId: string) => Promise<void>;
}

function timeToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
function dateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function DaySheet({
  date,
  currentUserId,
  plans,
  reminders,
  friends,
  initialShowReminderForm,
  onClose,
  onOpenPlan,
  onAddEvent,
  onCreateReminder,
  onUpdateReminder,
  onDeleteReminder,
  onToggleReminderDone,
  onAddReminderItem,
  onToggleReminderItem,
  onDeleteReminderItem,
}: DaySheetProps) {
  const [showForm, setShowForm] = useState(!!initialShowReminderForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [draftItems, setDraftItems] = useState<string[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plansForDay = useMemo(
    () => plans.filter((p) => (p.endDate ? date >= p.startDate && date <= p.endDate : p.startDate === date)),
    [plans, date],
  );
  const remindersForDay = useMemo(() => reminders.filter((r) => r.date === date), [reminders, date]);
  const editingReminder = editingId ? (remindersForDay.find((r) => r.id === editingId) ?? null) : null;
  const isOwner = editingReminder ? editingReminder.ownerId === currentUserId : true;

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setTime('');
    setSharedWith([]);
    setDraftItems([]);
    setNewItemText('');
    setError(null);
  }

  function startAdd() {
    resetForm();
    setShowForm(true);
  }

  function startEdit(reminder: Reminder) {
    setEditingId(reminder.id);
    setTitle(reminder.title);
    setTime(reminder.time ?? '');
    setSharedWith(reminder.sharedWith.map((s) => s.userId));
    setDraftItems([]);
    setNewItemText('');
    setError(null);
    setShowForm(true);
  }

  function toggleShare(friendId: string) {
    setSharedWith((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]));
  }

  function addDraftItem() {
    if (!newItemText.trim()) return;
    setDraftItems((prev) => [...prev, newItemText.trim()]);
    setNewItemText('');
  }

  async function handleAddExistingItem() {
    if (!newItemText.trim() || !editingId) return;
    const text = newItemText.trim();
    setNewItemText('');
    try {
      await onAddReminderItem(editingId, text);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo añadir el elemento.');
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Escribe un título para la tarea.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (editingId) {
        await onUpdateReminder(editingId, { title: title.trim(), date, time: time || undefined, sharedWith });
      } else {
        await onCreateReminder({
          title: title.trim(),
          date,
          time: time || undefined,
          sharedWith,
          items: draftItems,
        });
      }
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la tarea.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setIsSaving(true);
    try {
      await onDeleteReminder(id);
      setConfirmDeleteId(null);
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo borrar la tarea.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Cerrar" accessibilityRole="button">
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{formatDateLabel(isoDateToDate(date))}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={styles.closeButton}
            >
              <Text style={styles.closeLabel}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {error && (
              <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
                {error}
              </Text>
            )}

            {!showForm && (
              <>
                {plansForDay.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Planes</Text>
                    {plansForDay.map((plan) => (
                      <Pressable
                        key={plan.id}
                        onPress={() => onOpenPlan(plan.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir plan ${plan.title}`}
                        style={styles.planRow}
                      >
                        <View style={[styles.typeDot, { backgroundColor: planTypeColor(plan.type) }]} />
                        <Text style={styles.planTitle}>{plan.title}</Text>
                        <Text style={styles.planType}>{planTypeLabel(plan.type)}</Text>
                      </Pressable>
                    ))}
                  </>
                )}

                {remindersForDay.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Tareas de ruta</Text>
                    {remindersForDay.map((reminder) => {
                      const hasItems = reminder.items.length > 0;
                      const doneCount = reminder.items.filter((it) => it.done).length;
                      return (
                        <View key={reminder.id} style={styles.reminderRow}>
                          <Pressable
                            onPress={() => onToggleReminderDone(reminder.id, !reminder.done)}
                            accessibilityRole="checkbox"
                            accessibilityLabel={`Marcar ${reminder.title} como ${reminder.done ? 'pendiente' : 'hecha'}`}
                            accessibilityState={{ checked: reminder.done }}
                            style={styles.checkbox}
                          >
                            {reminder.done && <Text style={styles.checkboxMark}>✓</Text>}
                          </Pressable>
                          <Pressable
                            onPress={() => startEdit(reminder)}
                            accessibilityRole="button"
                            accessibilityLabel={`Editar tarea ${reminder.title}`}
                            style={styles.reminderInfo}
                          >
                            <Text style={[styles.reminderTitle, reminder.done && styles.reminderTitleDone]}>
                              {reminder.title}
                            </Text>
                            {hasItems && (
                              <Text style={styles.reminderMeta}>
                                {doneCount}/{reminder.items.length}
                              </Text>
                            )}
                          </Pressable>
                          {reminder.time && <Text style={styles.reminderTime}>{reminder.time}</Text>}
                        </View>
                      );
                    })}
                  </>
                )}

                {plansForDay.length === 0 && remindersForDay.length === 0 && (
                  <Text style={styles.emptyText}>No tienes nada para este día.</Text>
                )}

                <View style={styles.quickAddRow}>
                  <Pressable
                    onPress={() => onAddEvent(date)}
                    accessibilityRole="button"
                    accessibilityLabel="Añadir evento este día"
                    style={styles.primaryButton}
                  >
                    <Text style={styles.primaryButtonLabel}>+ Evento</Text>
                  </Pressable>
                  <Pressable
                    onPress={startAdd}
                    accessibilityRole="button"
                    accessibilityLabel="Añadir tarea de ruta este día"
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonLabel}>+ Tarea</Text>
                  </Pressable>
                </View>
              </>
            )}

            {showForm && (
              <>
                <Text style={styles.sectionLabel}>{editingId ? 'Editar tarea' : 'Nueva tarea'}</Text>

                {isOwner && (
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Título de la tarea"
                    accessibilityLabel="Título de la tarea de ruta"
                    style={styles.input}
                  />
                )}
                {!isOwner && <Text style={styles.reminderTitle}>{title}</Text>}

                {isOwner && (
                  <PickerField
                    mode="time"
                    value={time ? timeToDate(time) : null}
                    placeholder="Hora (opcional)"
                    accessibilityLabel="Hora de la tarea"
                    formatLabel={(d) => dateToTime(d)}
                    onChange={(d) => setTime(dateToTime(d))}
                    onClear={() => setTime('')}
                  />
                )}

                {isOwner && (
                  <>
                    <Text style={styles.label}>Compartir con</Text>
                    {friends.length === 0 ? (
                      <Text style={styles.emptyText}>Todavía no tienes amigos con quien compartir.</Text>
                    ) : (
                      friends.map((f) => {
                        const active = sharedWith.includes(f.id);
                        return (
                          <Pressable
                            key={f.id}
                            onPress={() => toggleShare(f.id)}
                            accessibilityRole="checkbox"
                            accessibilityLabel={`Compartir con ${f.name}`}
                            accessibilityState={{ checked: active }}
                            style={[styles.friendRow, active && styles.friendRowActive]}
                          >
                            <Text style={styles.friendName}>{f.name}</Text>
                            <Text style={styles.friendCheck}>{active ? '✓' : ''}</Text>
                          </Pressable>
                        );
                      })
                    )}
                  </>
                )}

                <Text style={styles.label}>Checklist</Text>
                {(editingId ? (editingReminder?.items ?? []) : []).map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Pressable
                      onPress={() => onToggleReminderItem(editingId!, item.id, !item.done)}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`Elemento ${item.text}, marcar como ${item.done ? 'pendiente' : 'hecho'}`}
                      accessibilityState={{ checked: item.done }}
                      style={styles.itemCheckbox}
                    >
                      {item.done && <Text style={styles.checkboxMark}>✓</Text>}
                    </Pressable>
                    <Text style={[styles.itemText, item.done && styles.reminderTitleDone]}>{item.text}</Text>
                    <Pressable
                      onPress={() => onDeleteReminderItem(editingId!, item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Borrar elemento ${item.text}`}
                      style={styles.itemDelete}
                    >
                      <Text style={styles.itemDeleteLabel}>✕</Text>
                    </Pressable>
                  </View>
                ))}
                {!editingId &&
                  draftItems.map((text, i) => (
                    <View key={`${text}-${i}`} style={styles.itemRow}>
                      <View style={styles.itemCheckbox} />
                      <Text style={styles.itemText}>{text}</Text>
                      <Pressable
                        onPress={() => setDraftItems((prev) => prev.filter((_, idx) => idx !== i))}
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar elemento ${text}`}
                        style={styles.itemDelete}
                      >
                        <Text style={styles.itemDeleteLabel}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                <View style={styles.addItemRow}>
                  <TextInput
                    value={newItemText}
                    onChangeText={setNewItemText}
                    placeholder="Añadir elemento..."
                    accessibilityLabel="Nuevo elemento del checklist"
                    style={[styles.input, styles.flex1]}
                    onSubmitEditing={editingId ? handleAddExistingItem : addDraftItem}
                  />
                  <Pressable
                    onPress={editingId ? handleAddExistingItem : addDraftItem}
                    accessibilityRole="button"
                    accessibilityLabel="Añadir elemento"
                    style={styles.addItemButton}
                  >
                    <Text style={styles.addItemButtonLabel}>Añadir</Text>
                  </Pressable>
                </View>

                <View style={styles.formButtonsRow}>
                  <Pressable
                    onPress={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar"
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonLabel}>Cancelar</Text>
                  </Pressable>
                  {isOwner && (
                    <Pressable
                      onPress={handleSave}
                      disabled={isSaving}
                      accessibilityRole="button"
                      accessibilityLabel="Guardar tarea"
                      style={[styles.primaryButton, styles.flex1, isSaving && styles.buttonDisabled]}
                    >
                      <Text style={styles.primaryButtonLabel}>Guardar</Text>
                    </Pressable>
                  )}
                </View>

                {editingId && isOwner && (
                  <Pressable
                    onPress={() => setConfirmDeleteId(editingId)}
                    accessibilityRole="button"
                    accessibilityLabel="Borrar tarea de ruta"
                    style={styles.dangerLink}
                  >
                    <Text style={styles.dangerLinkLabel}>Borrar tarea</Text>
                  </Pressable>
                )}
              </>
            )}
          </ScrollView>

          {confirmDeleteId && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmDialog}>
                <Text style={styles.confirmTitle}>¿Borrar esta tarea de ruta?</Text>
                <Text style={styles.confirmSubtitle}>No se puede deshacer.</Text>
                <View style={styles.formButtonsRow}>
                  <Pressable
                    onPress={() => setConfirmDeleteId(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar"
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonLabel}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(confirmDeleteId)}
                    disabled={isSaving}
                    accessibilityRole="button"
                    accessibilityLabel="Confirmar borrar tarea"
                    style={[styles.dangerButton, styles.flex1]}
                  >
                    <Text style={styles.dangerButtonLabel}>Borrar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(22,27,46,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#F5F5F2', borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '85%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#161B2E', textTransform: 'capitalize', flexShrink: 1 },
  closeButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { fontSize: 16, color: '#8C8C88' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  error: { color: '#C0392B', fontSize: 13, marginBottom: 10 },
  sectionLabel: {
    fontSize: 11,
    color: '#8C8C88',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 8,
  },
  label: { fontSize: 11, color: '#8C8C88', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
  emptyText: { fontSize: 12, color: '#8C8C88', textAlign: 'center', paddingVertical: 12 },
  planRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E6E3',
  },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  planTitle: { flex: 1, fontSize: 13, color: '#161B2E' },
  planType: { fontSize: 10, color: '#8C8C88', fontWeight: '700' },
  reminderRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E6E3',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: { color: '#161B2E', fontSize: 12, fontWeight: '700' },
  reminderInfo: { flex: 1, minHeight: 44, justifyContent: 'center' },
  reminderTitle: { fontSize: 13, fontWeight: '600', color: '#161B2E' },
  reminderTitleDone: { textDecorationLine: 'line-through', color: '#8C8C88' },
  reminderMeta: { fontSize: 10, color: '#8C8C88' },
  reminderTime: { fontSize: 11, color: '#8C8C88' },
  quickAddRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  flex1: { flex: 1 },
  friendRow: {
    minHeight: 44,
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
  itemRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  itemCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1, fontSize: 13, color: '#161B2E' },
  itemDelete: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  itemDeleteLabel: { fontSize: 12, color: '#8C8C88' },
  addItemRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addItemButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DCDCD8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemButtonLabel: { fontSize: 12, fontWeight: '700', color: '#161B2E' },
  formButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    flex: 1,
  },
  primaryButtonLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    flex: 1,
  },
  secondaryButtonLabel: { color: '#161B2E', fontSize: 13, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  dangerLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  dangerLinkLabel: { color: '#C0392B', fontSize: 12, fontWeight: '700' },
  dangerButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#C0392B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dangerButtonLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  confirmOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(22,27,46,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmDialog: { backgroundColor: '#fff', borderRadius: 12, padding: 18, width: '100%' },
  confirmTitle: { fontSize: 15, fontWeight: '700', color: '#161B2E', marginBottom: 4 },
  confirmSubtitle: { fontSize: 12, color: '#8C8C88' },
});
