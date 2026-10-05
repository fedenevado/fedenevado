import type { PlanType } from '@/api/client';

export const PLAN_TYPE_OPTIONS: { value: PlanType; label: string; color: string; textColor: string }[] = [
  { value: 'viaje', label: 'Viaje', color: '#0E6E64', textColor: '#fff' },
  // Colores corporativos reales de Cantixplora (extraídos del logo). El
  // dorado (#F7C117) es casi invisible como texto/icono sobre fondo claro
  // (1.5-1.7:1, no pasa ni el 3:1 de un gráfico) y el coral (#F9452A) da
  // 3.55:1 sobre blanco (pasa 3:1, no 4.5:1) — por eso el texto que va
  // ENCIMA de estos fondos no es blanco, es #2D1E1B (marca): 9.59:1 sobre
  // dorado y 4.50:1 sobre coral, ambos cumplen AA sin negrita ni icono.
  { value: 'comida', label: 'Comida', color: '#F7C117', textColor: '#2D1E1B' },
  { value: 'evento', label: 'Evento', color: '#F9452A', textColor: '#2D1E1B' },
  { value: 'plan_casual', label: 'Plan casual', color: '#6B5CA5', textColor: '#fff' },
];

export function planTypeLabel(type: PlanType): string {
  return PLAN_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

export function planTypeColor(type: PlanType): string {
  return PLAN_TYPE_OPTIONS.find((t) => t.value === type)?.color ?? '#6B6B67';
}

export function planTypeTextColor(type: PlanType): string {
  return PLAN_TYPE_OPTIONS.find((t) => t.value === type)?.textColor ?? '#fff';
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
