/**
 * "Não perturbe" do app, como no Discord: pausa os avisos (toast e som) por um
 * tempo e volta sozinho. "Até eu reativar" é o antigo "Pausar notificações"
 * (`notifications.enabled = false`). Funções puras: o relógio vem de fora.
 */

export type DndDuration = '30m' | '1h' | '8h' | 'tomorrow' | 'forever';

export const DND_OPTIONS: readonly { id: DndDuration; label: string }[] = [
  { id: '30m', label: 'Por 30 minutos' },
  { id: '1h', label: 'Por 1 hora' },
  { id: '8h', label: 'Por 8 horas' },
  { id: 'tomorrow', label: 'Até amanhã (8:00)' },
  { id: 'forever', label: 'Até eu reativar' },
];

export function isDndDuration(value: unknown): value is DndDuration {
  return DND_OPTIONS.some((o) => o.id === value);
}

/** Hora em que "até amanhã" termina. */
export const DND_MORNING_HOUR = 8;

/**
 * Fim da pausa (epoch ms); null = sem prazo ("até eu reativar").
 * "Até amanhã" vai até as 8:00 da próxima manhã; de madrugada (antes das 5:00),
 * é a manhã do mesmo dia.
 */
export function dndUntil(duration: DndDuration, now: Date): number | null {
  const minutes = { '30m': 30, '1h': 60, '8h': 480 } as const;
  if (duration === 'forever') return null;
  if (duration !== 'tomorrow') return now.getTime() + minutes[duration] * 60_000;
  const end = new Date(now);
  end.setHours(DND_MORNING_HOUR, 0, 0, 0);
  if (now.getHours() >= 5) end.setDate(end.getDate() + 1);
  return end.getTime();
}

export interface DndStatus {
  active: boolean;
  /** Fim da pausa (epoch ms); null = sem prazo. */
  until: number | null;
}

export const DND_OFF: DndStatus = { active: false, until: null };

/** Estado efetivo a partir das configurações de notificação. */
export function resolveDnd(
  n: { enabled: boolean; pausedUntil: number | null },
  now: number,
): DndStatus {
  if (!n.enabled) return { active: true, until: null };
  if (n.pausedUntil !== null && n.pausedUntil > now) return { active: true, until: n.pausedUntil };
  return DND_OFF;
}

const time = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** "até 14:30", "até amanhã às 08:00", "até eu reativar". */
export function describeDnd(status: DndStatus, now: Date): string {
  if (!status.active) return '';
  if (status.until === null) return 'até eu reativar';
  const end = new Date(status.until);
  const sameDay = end.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay) return `até ${time(end)}`;
  if (end.toDateString() === tomorrow.toDateString()) return `até amanhã às ${time(end)}`;
  return `até ${end.toLocaleDateString('pt-BR')} às ${time(end)}`;
}
