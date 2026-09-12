import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, ApiError, type BalancesResult, type Expense, type PlanParticipant, type SettlementTransfer } from '@/api/client';

interface Props {
  token: string;
  planId: string;
  myUserId: string;
  confirmedParticipants: PlanParticipant[];
}

export function ExpensesTab({ token, planId, myUserId, confirmedParticipants }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<BalancesResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(myUserId);
  const [splitWith, setSplitWith] = useState<string[]>(confirmedParticipants.map((p) => p.userId as string));

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [expenseList, balanceResult] = await Promise.all([
        api.listExpenses(token, planId),
        api.getBalances(token, planId),
      ]);
      setExpenses(expenseList);
      setBalances(balanceResult);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  }, [token, planId]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setDescription('');
    setAmount('');
    setPaidBy(myUserId);
    setSplitWith(confirmedParticipants.map((p) => p.userId as string));
  }

  function startEdit(expense: Expense) {
    setEditingId(expense.id);
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setPaidBy(expense.paidBy);
    setSplitWith(expense.splits.map((s) => s.userId));
  }

  function toggleSplit(userId: string) {
    setSplitWith((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  const amountValue = parseFloat(amount);
  const canSave = description.trim().length > 0 && amountValue > 0 && splitWith.length > 0;

  async function saveExpense() {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      const input = { description: description.trim(), amount: amountValue, paidBy, splitWith };
      if (editingId) {
        await api.updateExpense(token, planId, editingId, input);
      } else {
        await api.createExpense(token, planId, input);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteExpense(token, planId, id);
      setConfirmDeleteId(null);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseAccounts() {
    setShowCloseConfirm(false);
    setBusy(true);
    setError(null);
    try {
      await api.closeAccounts(token, planId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReopenAccounts() {
    setBusy(true);
    setError(null);
    try {
      await api.reopenAccounts(token, planId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleTransferPaid(transfer: SettlementTransfer) {
    setBusy(true);
    setError(null);
    try {
      if (transfer.paid) {
        await api.unmarkTransferPaid(token, planId, transfer.fromId, transfer.toId);
      } else {
        await api.markTransferPaid(token, planId, transfer.fromId, transfer.toId);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !balances) {
    return (
      <View style={styles.wrapper}>
        <ActivityIndicator style={styles.loading} accessibilityLabel="Cargando gastos" />
      </View>
    );
  }

  const expensesClosed = balances.expensesClosed;

  return (
    <View style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite" role="alert">
          {error}
        </Text>
      )}

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Tu balance</Text>
        <Text style={[styles.balanceAmount, { color: balances.myNet >= 0 ? '#0E6E64' : '#FF5A3C' }]}>
          {balances.myNet >= 0 ? `+${balances.myNet.toFixed(2)}€` : `${balances.myNet.toFixed(2)}€`}
        </Text>
        <Text style={styles.balanceHint}>{balances.myNet >= 0 ? 'Te deben en total' : 'Debes en total'}</Text>
      </View>

      {expensesClosed && (
        <View style={styles.settledCard}>
          <View style={styles.settledHeader}>
            <Text style={styles.settledTitle}>Cuentas cerradas · Resultado final</Text>
            <Pressable
              onPress={handleReopenAccounts}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Volver a editar gastos"
              style={styles.reopenButton}
            >
              <Text style={styles.reopenButtonLabel}>Reabrir</Text>
            </Pressable>
          </View>
          {balances.settlement.length === 0 ? (
            <Text style={styles.settledEmpty}>Todo saldado, nadie debe nada.</Text>
          ) : (
            balances.settlement.map((t) => {
              const involved = myUserId === t.fromId || myUserId === t.toId;
              return (
                <View key={`${t.fromId}-${t.toId}`} style={styles.transferRow}>
                  <View>
                    <Text style={styles.transferNames}>
                      {t.fromName} → {t.toName}
                    </Text>
                    <Text style={styles.transferAmount}>{t.amount.toFixed(2)}€</Text>
                  </View>
                  {involved ? (
                    <Pressable
                      onPress={() => toggleTransferPaid(t)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={
                        t.paid ? `Marcado como pagado, ${t.fromName} a ${t.toName}` : `Marcar como pagado, ${t.fromName} a ${t.toName}`
                      }
                      accessibilityState={{ selected: t.paid }}
                      style={[styles.payButton, t.paid && styles.payButtonPaid]}
                    >
                      <Text style={styles.payButtonLabel}>{t.paid ? 'Pagado' : 'Marcar pagado'}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.transferStatus}>{t.paid ? 'Pagado' : 'Pendiente'}</Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}

      <Text style={styles.sectionLabel}>Gastos</Text>
      <View style={styles.expenseList}>
        {expenses.length === 0 && <Text style={styles.emptyText}>Sin gastos todavía.</Text>}
        {expenses.map((e) => (
          <View key={e.id} style={styles.expenseRow}>
            <View style={styles.expenseInfo}>
              <Text style={styles.expenseDesc}>{e.description}</Text>
              <Text style={styles.expenseMeta}>
                Pagó {e.paidByName} · entre {e.splits.length}
                {e.splits.length < confirmedParticipants.length ? (
                  <Text style={styles.expenseMetaWarn}> (no todos)</Text>
                ) : null}
              </Text>
            </View>
            <View style={styles.expenseActions}>
              <Text style={styles.expenseAmount}>{e.amount.toFixed(2)}€</Text>
              {!expensesClosed && (
                <View style={styles.expenseIcons}>
                  <Pressable
                    onPress={() => startEdit(e)}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar gasto ${e.description}`}
                    style={styles.iconButton}
                  >
                    <Text style={styles.iconButtonLabel}>Editar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirmDeleteId(e.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar gasto ${e.description}`}
                    style={styles.iconButton}
                  >
                    <Text style={[styles.iconButtonLabel, styles.iconButtonDanger]}>Eliminar</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {!expensesClosed && (
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>{editingId ? 'Editar gasto' : 'Añadir gasto'}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Descripción"
            accessibilityLabel="Descripción del gasto"
            style={styles.input}
          />
          <View style={styles.row}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="Importe €"
              keyboardType="decimal-pad"
              accessibilityLabel="Importe del gasto en euros"
              style={[styles.input, styles.flex1]}
            />
          </View>
          <Text style={styles.label}>¿Quién pagó?</Text>
          <View style={styles.chipRow}>
            {confirmedParticipants.map((p) => {
              const active = paidBy === p.userId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPaidBy(p.userId as string)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Pagó ${p.name}`}
                  accessibilityState={{ selected: active }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{p.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>¿Entre quiénes se reparte?</Text>
          {confirmedParticipants.map((p) => {
            const active = splitWith.includes(p.userId as string);
            return (
              <Pressable
                key={p.id}
                onPress={() => toggleSplit(p.userId as string)}
                accessibilityRole="checkbox"
                accessibilityLabel={`Incluir a ${p.name} en el reparto`}
                accessibilityState={{ checked: active }}
                style={[styles.splitRow, active && styles.splitRowActive]}
              >
                <Text style={styles.splitName}>{p.name}</Text>
                <Text style={styles.splitCheck}>{active ? '✓' : ''}</Text>
              </Pressable>
            );
          })}
          {splitWith.length === 0 && <Text style={styles.warnText}>Selecciona al menos una persona.</Text>}
          {amountValue > 0 && splitWith.length > 0 && (
            <Text style={styles.perPersonText}>{(amountValue / splitWith.length).toFixed(2)}€ por persona</Text>
          )}
          <View style={styles.row}>
            {editingId && (
              <Pressable
                onPress={resetForm}
                accessibilityRole="button"
                accessibilityLabel="Cancelar edición"
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonLabel}>Cancelar</Text>
              </Pressable>
            )}
            <Pressable
              onPress={saveExpense}
              disabled={!canSave || busy}
              accessibilityRole="button"
              accessibilityLabel={editingId ? 'Guardar cambios del gasto' : 'Añadir gasto'}
              style={[styles.primaryButton, styles.flex1, (!canSave || busy) && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonLabel}>{editingId ? 'Guardar cambios' : 'Añadir gasto'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {expenses.length > 0 && (
        <Pressable
          onPress={expensesClosed ? handleReopenAccounts : () => setShowCloseConfirm(true)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={expensesClosed ? 'Volver a editar gastos' : 'Cerrar cuentas'}
          style={[styles.closeButton, expensesClosed && styles.closeButtonSecondary]}
        >
          <Text style={[styles.closeButtonLabel, expensesClosed && styles.closeButtonLabelSecondary]}>
            {expensesClosed ? 'Volver a editar gastos' : 'Cerrar cuentas'}
          </Text>
        </Pressable>
      )}
      </ScrollView>

      {showCloseConfirm && (
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>¿Cerrar cuentas?</Text>
            <Text style={styles.dialogSubtitle}>
              Se congelará la edición de gastos y se mostrará el reparto final. Podrás reabrirlas más tarde si hace
              falta.
            </Text>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => setShowCloseConfirm(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonLabel}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleCloseAccounts}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Confirmar cierre de cuentas"
                style={[styles.primaryButton, styles.flex1]}
              >
                <Text style={styles.primaryButtonLabel}>Cerrar cuentas</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {confirmDeleteId && (
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>¿Eliminar este gasto?</Text>
            <Text style={styles.dialogSubtitle}>Esta acción no se puede deshacer.</Text>
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
                onPress={() => handleDeleteExpense(confirmDeleteId)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Confirmar eliminar gasto"
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
  balanceCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14 },
  balanceLabel: { fontSize: 11, color: '#8C8C88', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  balanceAmount: { fontSize: 20, fontWeight: '700' },
  balanceHint: { fontSize: 11, color: '#8C8C88' },
  settledCard: { backgroundColor: '#161B2E', borderRadius: 10, padding: 14, marginBottom: 14 },
  settledHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  settledTitle: { fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: 1, flexShrink: 1 },
  reopenButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reopenButtonLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  settledEmpty: { fontSize: 12, color: '#fff' },
  transferRow: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  transferNames: { fontSize: 12, color: '#fff' },
  transferAmount: { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 2 },
  transferStatus: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  payButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonPaid: { backgroundColor: '#0E6E64', borderWidth: 0 },
  payButtonLabel: { color: '#fff', fontSize: 10, fontWeight: '700' },
  sectionLabel: {
    fontSize: 11,
    color: '#8C8C88',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: { fontSize: 12, color: '#8C8C88', paddingVertical: 14 },
  expenseList: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, marginBottom: 14 },
  expenseRow: {
    minHeight: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FAFAF8',
  },
  expenseInfo: { flexShrink: 1, paddingRight: 8 },
  expenseDesc: { fontSize: 13, fontWeight: '600', color: '#161B2E' },
  expenseMeta: { fontSize: 11, color: '#8C8C88', marginTop: 2 },
  expenseMetaWarn: { color: '#FF5A3C', fontWeight: '700' },
  expenseActions: { alignItems: 'flex-end', gap: 4 },
  expenseAmount: { fontSize: 13, fontWeight: '700', color: '#161B2E' },
  expenseIcons: { flexDirection: 'row', gap: 10 },
  iconButton: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  iconButtonLabel: { fontSize: 11, fontWeight: '700', color: '#8C8C88' },
  iconButtonDanger: { color: '#FF5A3C' },
  formCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14 },
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
  row: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  label: { fontSize: 11, color: '#8C8C88', textTransform: 'uppercase', marginTop: 8, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: '#161B2E', borderColor: '#161B2E' },
  chipLabel: { fontSize: 12, fontWeight: '600', color: '#161B2E' },
  chipLabelActive: { color: '#fff' },
  splitRow: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    marginBottom: 6,
  },
  splitRowActive: { borderColor: '#161B2E', borderWidth: 2, backgroundColor: '#FAFAF8' },
  splitName: { fontSize: 12, color: '#161B2E' },
  splitCheck: { fontSize: 14, color: '#161B2E', fontWeight: '700' },
  warnText: { fontSize: 11, color: '#FF5A3C' },
  perPersonText: { fontSize: 11, color: '#8C8C88', marginTop: 4 },
  primaryButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryButtonLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonLabel: { color: '#161B2E', fontSize: 13, fontWeight: '700' },
  dangerButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#FF5A3C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  dangerButtonLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  closeButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#0E6E64',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  closeButtonLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  closeButtonSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DCDCD8' },
  closeButtonLabelSecondary: { color: '#161B2E' },
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
