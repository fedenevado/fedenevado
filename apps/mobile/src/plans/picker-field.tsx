import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

interface PickerFieldProps {
  mode: 'date' | 'time';
  value: Date | null;
  minimumDate?: Date;
  placeholder: string;
  accessibilityLabel: string;
  formatLabel: (date: Date) => string;
  onChange: (date: Date) => void;
  onClear?: () => void;
}

// En Android el diálogo nativo es imperativo (DateTimePickerAndroid.open), no
// hay que montar el componente condicionalmente. En iOS no existe ese diálogo
// nativo con botones de confirmar/cancelar, así que se envuelve en un Modal
// propio con un calendario "inline" (grid tocable) y un botón "Listo".
export function PickerField({
  mode,
  value,
  minimumDate,
  placeholder,
  accessibilityLabel,
  formatLabel,
  onChange,
  onClear,
}: PickerFieldProps) {
  const [iosVisible, setIosVisible] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());

  function open() {
    const initial = value ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode,
        minimumDate,
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) onChange(selected);
        },
      });
      return;
    }
    setDraft(initial);
    setIosVisible(true);
  }

  function confirmIOS() {
    onChange(draft);
    setIosVisible(false);
  }

  return (
    <View>
      <View style={styles.row}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={styles.field}
        >
          <Text style={value ? styles.value : styles.placeholder}>{value ? formatLabel(value) : placeholder}</Text>
        </Pressable>
        {onClear && value && (
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${accessibilityLabel.toLowerCase()}`}
            style={styles.clearButton}
          >
            <Text style={styles.clearLabel}>✕</Text>
          </Pressable>
        )}
      </View>

      {Platform.OS === 'ios' && (
        <Modal visible={iosVisible} transparent animationType="slide" onRequestClose={() => setIosVisible(false)}>
          <Pressable style={styles.overlay} onPress={() => setIosVisible(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display={mode === 'date' ? 'inline' : 'spinner'}
                minimumDate={minimumDate}
                onChange={(_event, selected) => selected && setDraft(selected)}
              />
              <Pressable
                onPress={confirmIOS}
                accessibilityRole="button"
                accessibilityLabel="Confirmar selección"
                style={styles.confirmButton}
              >
                <Text style={styles.confirmLabel}>Listo</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
  field: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  value: { fontSize: 14, color: '#161B2E' },
  placeholder: { fontSize: 14, color: '#8C8C88' },
  clearButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  clearLabel: { fontSize: 16, color: '#8C8C88', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  confirmButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#161B2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  confirmLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
