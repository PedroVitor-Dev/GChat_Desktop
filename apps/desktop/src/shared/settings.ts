/**
 * Configurações do app: tipos, padrões e validação. Compartilhado entre main e
 * renderer. O main é a única fonte de verdade; o renderer só propõe alterações.
 */

export const SETTINGS_VERSION = 1;

/** Horário no formato "HH:MM" (24 h). */
export type ClockTime = `${number}:${number}`;

export interface QuietHours {
  enabled: boolean;
  start: ClockTime;
  end: ClockTime;
}

export interface NotificationSettings {
  enabled: boolean;
  /** Mostrar o nome do remetente/conversa no toast. */
  showSender: boolean;
  /** Mostrar o texto da mensagem no toast. */
  showPreview: boolean;
  /** Som padrão do Windows. Substituído pelos sons personalizados na Fase 5. */
  systemSound: boolean;
  quietHours: QuietHours;
  /** Chaves das conversas silenciadas (nome exibido no título da notificação). */
  mutedConversations: string[];
}

export interface Settings {
  version: typeof SETTINGS_VERSION;
  notifications: NotificationSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  notifications: {
    enabled: true,
    showSender: true,
    showPreview: true,
    systemSound: true,
    quietHours: { enabled: false, start: '22:00', end: '07:00' },
    mutedConversations: [],
  },
};

export const LIMITS = {
  conversationKey: 200,
  mutedConversations: 500,
} as const;

/** Atualização parcial aceita pelo IPC (um nível de profundidade por seção). */
export interface SettingsPatch {
  notifications?: Partial<Omit<NotificationSettings, 'quietHours'>> & {
    quietHours?: Partial<QuietHours>;
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isClockTime = (v: unknown): v is ClockTime => typeof v === 'string' && CLOCK.test(v);

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const clock = (v: unknown, fallback: ClockTime): ClockTime => (isClockTime(v) ? v : fallback);

function cleanKeys(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v)) return fallback;
  const keys = v
    .filter((k): k is string => typeof k === 'string')
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && k.length <= LIMITS.conversationKey);
  return [...new Set(keys)].slice(0, LIMITS.mutedConversations);
}

/**
 * Normaliza qualquer entrada (arquivo do disco, patch do renderer) para um
 * Settings válido. Campos inválidos ou ausentes caem no valor de `base`.
 */
export function normalizeSettings(input: unknown, base: Settings = DEFAULT_SETTINGS): Settings {
  const raw = isObj(input) ? input : {};
  const n = isObj(raw['notifications']) ? raw['notifications'] : {};
  const q = isObj(n['quietHours']) ? n['quietHours'] : {};
  const b = base.notifications;

  return {
    version: SETTINGS_VERSION,
    notifications: {
      enabled: bool(n['enabled'], b.enabled),
      showSender: bool(n['showSender'], b.showSender),
      showPreview: bool(n['showPreview'], b.showPreview),
      systemSound: bool(n['systemSound'], b.systemSound),
      quietHours: {
        enabled: bool(q['enabled'], b.quietHours.enabled),
        start: clock(q['start'], b.quietHours.start),
        end: clock(q['end'], b.quietHours.end),
      },
      mutedConversations: cleanKeys(n['mutedConversations'], b.mutedConversations),
    },
  };
}

/** Aplica um patch vindo do renderer sobre as configurações atuais. */
export function applyPatch(current: Settings, patch: unknown): Settings {
  return normalizeSettings(patch, current);
}
