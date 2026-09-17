import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import type { Plan, Reminder } from '@/api/client';
import { planTypeColor } from '@/plans/plan-types';

interface CalendarViewProps {
  plans: Plan[];
  reminders: Reminder[];
  onSelectDay: (isoDate: string) => void;
}

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function dayKey(year: number, month: number, day: number): string {
  return `${year}-${month}-${day}`;
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function CalendarView({ plans, reminders, onSelectDay }: CalendarViewProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const touchStartX = useRef<number | null>(null);

  const eventDays: Record<string, Plan[]> = {};
  const pushEvent = (key: string, plan: Plan) => {
    if (!eventDays[key]) eventDays[key] = [];
    eventDays[key].push(plan);
  };
  plans.forEach((plan) => {
    if (plan.endDate) {
      let d = new Date(`${plan.startDate}T00:00:00`);
      const endD = new Date(`${plan.endDate}T00:00:00`);
      while (d <= endD) {
        pushEvent(dayKey(d.getFullYear(), d.getMonth(), d.getDate()), plan);
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      }
    } else {
      const d = new Date(`${plan.startDate}T00:00:00`);
      pushEvent(dayKey(d.getFullYear(), d.getMonth(), d.getDate()), plan);
    }
  });

  const reminderDays: Record<string, Reminder[]> = {};
  reminders.forEach((reminder) => {
    const d = new Date(`${reminder.date}T00:00:00`);
    const key = dayKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!reminderDays[key]) reminderDays[key] = [];
    reminderDays[key].push(reminder);
  });

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = firstOfMonth
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(' de ', ' ');
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }
  function goToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }

  function handleTouchStart(e: GestureResponderEvent) {
    touchStartX.current = e.nativeEvent.touches[0]?.pageX ?? null;
  }
  function handleTouchEnd(e: GestureResponderEvent) {
    if (touchStartX.current === null) return;
    const endX = e.nativeEvent.changedTouches[0]?.pageX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    if (delta > 45) prevMonth();
    else if (delta < -45) nextMonth();
    touchStartX.current = null;
  }

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <View style={styles.navButtons}>
          <Pressable
            onPress={prevMonth}
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
            style={styles.navButton}
          >
            <View style={styles.navCircle}>
              <Text style={styles.navArrow}>‹</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={nextMonth}
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
            style={styles.navButton}
          >
            <View style={styles.navCircle}>
              <Text style={styles.navArrow}>›</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {!isCurrentMonth && (
        <Pressable
          onPress={goToday}
          accessibilityRole="button"
          accessibilityLabel="Ir al mes de hoy"
          style={styles.todayLink}
        >
          <Text style={styles.todayLinkLabel}>Hoy</Text>
        </Pressable>
      )}

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {cells.map((day, i) => {
          if (day === null) {
            return <View key={`blank-${i}`} style={styles.cellSlot} />;
          }

          const key = dayKey(viewYear, viewMonth, day);
          const dayEvents = eventDays[key] ?? [];
          const firstEvent = dayEvents[0];
          const uniqueTypes = [...new Set(dayEvents.map((p) => p.type))];
          const isMulti = uniqueTypes.length > 1;
          const dayReminders = reminderDays[key] ?? [];
          const hasReminder = dayReminders.length > 0;
          const allRemindersDone = hasReminder && dayReminders.every((r) => r.done);
          const isToday = isCurrentMonth && day === now.getDate();
          const cellDate = new Date(viewYear, viewMonth, day);
          const isPast = cellDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const isoDate = toIsoDate(viewYear, viewMonth, day);

          const backgroundColor = isPast
            ? '#F0F0EE'
            : isMulti
              ? '#fff'
              : firstEvent
                ? planTypeColor(firstEvent.type)
                : '#fff';
          const textColor = isPast ? '#B8B2A8' : isMulti ? '#161B2E' : firstEvent ? '#fff' : '#161B2E';
          const reminderDotColor = allRemindersDone ? 'transparent' : firstEvent && !isMulti ? '#fff' : '#3F6FBF';

          const labelParts = [`${day} de ${monthLabel}`];
          if (dayEvents.length === 1) labelParts.push(`plan ${dayEvents[0].title}`);
          else if (dayEvents.length > 1) labelParts.push(`${dayEvents.length} planes`);
          if (hasReminder) labelParts.push(allRemindersDone ? 'tareas de ruta completadas' : 'tarea de ruta pendiente');

          return (
            <View key={key} style={styles.cellSlot}>
              <Pressable
                onPress={() => onSelectDay(isoDate)}
                accessibilityRole="button"
                accessibilityLabel={labelParts.join(', ')}
                style={[
                  styles.cell,
                  { backgroundColor },
                  isToday && styles.cellToday,
                  isMulti && !isPast && styles.cellMultiBorder,
                ]}
              >
                <Text style={[styles.cellDay, { color: textColor }]}>{day}</Text>
                {isMulti && !isPast && (
                  <View style={styles.dotRow}>
                    {uniqueTypes.slice(0, 4).map((t) => (
                      <View key={t} style={[styles.typeDot, { backgroundColor: planTypeColor(t) }]} />
                    ))}
                  </View>
                )}
                {hasReminder && (
                  <View
                    style={[
                      styles.reminderDot,
                      allRemindersDone
                        ? { borderWidth: 1, borderColor: firstEvent && !isMulti ? '#fff' : '#3F6FBF' }
                        : { backgroundColor: reminderDotColor },
                    ]}
                  />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  monthLabel: { fontSize: 17, fontWeight: '700', color: '#161B2E', textTransform: 'capitalize' },
  navButtons: { flexDirection: 'row' },
  navButton: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  navCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCDCD8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { fontSize: 16, color: '#161B2E', fontWeight: '700' },
  todayLink: { alignSelf: 'flex-end', minHeight: 32, justifyContent: 'center', marginBottom: 6 },
  todayLinkLabel: { fontSize: 11, color: '#161B2E', fontWeight: '700' },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: { flexBasis: '14.28%', textAlign: 'center', fontSize: 9, fontWeight: '700', color: '#8C8C88' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellSlot: { flexBasis: '14.28%', padding: 2 },
  cell: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E6E6E3',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cellToday: { borderWidth: 2, borderColor: '#161B2E' },
  cellMultiBorder: { borderColor: '#C7C7C2' },
  cellDay: { fontSize: 12, fontWeight: '600' },
  dotRow: { flexDirection: 'row', gap: 2 },
  typeDot: { width: 4, height: 4, borderRadius: 2 },
  reminderDot: { position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 2.5 },
});
