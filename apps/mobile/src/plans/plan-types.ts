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
