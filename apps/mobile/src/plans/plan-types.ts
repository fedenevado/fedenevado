import type { PlanType } from '@/api/client';

export const PLAN_TYPE_OPTIONS: { value: PlanType; label: string; color: string }[] = [
  { value: 'viaje', label: 'Viaje', color: '#0E6E64' },
  { value: 'comida', label: 'Comida', color: '#C9A15A' },
  { value: 'evento', label: 'Evento', color: '#FF5A3C' },
  { value: 'plan_casual', label: 'Plan casual', color: '#6B5CA5' },
];

export function planTypeLabel(type: PlanType): string {
  return PLAN_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

export function planTypeColor(type: PlanType): string {
  return PLAN_TYPE_OPTIONS.find((t) => t.value === type)?.color ?? '#8C8C88';
}

export function isoDateToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function dateToIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function dateToTimeString(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatPlanDate(startDate: string, endDate: string | null, time: string | null): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      timeZone: 'UTC',
    });
  let label = fmt(startDate);
  if (endDate) {
    label += ` – ${fmt(endDate)}`;
  }
  if (time) {
    label += ` · ${time}`;
  }
  return label;
}
