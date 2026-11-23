/**
 * Configurações do app: tipos, padrões, validação e migração. Compartilhado entre
 * main e renderer. O main é a única fonte de verdade; o renderer só propõe alterações.
 */
import { SOUND_EXTENSIONS, SOUND_LIMITS, isCustomSoundId, isSoundId } from './sounds';
import type { CustomSound, SoundExtension, SoundId } from './sounds';
import { DEFAULT_ACCOUNT, normalizeAccounts, type AccountsSettings } from './accounts';

export const SETTINGS_VERSION = 2;

/** Horário no formato "HH:MM" (24 h). */
export type ClockTime = `${number}:${number}`;

export interface QuietHours {
  enabled: boolean;
  start: ClockTime;
  end: ClockTime;
}

export interface MentionSettings {
  /** Palavras que caracterizam uma menção (ex.: "@Pedro"). Vazio = desligado. */
  keywords: string[];
  /** Menções avisam mesmo no horário de silêncio. */
  bypassQuietHours: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  /** Mostrar o nome do remetente/conversa no toast. */
  showSender: boolean;
  /** Mostrar o texto da mensagem no toast. */
  showPreview: boolean;
  quietHours: QuietHours;
  mentions: MentionSettings;
  /** Chaves das conversas silenciadas (nome exibido no título da notificação). */
  mutedConversations: string[];
}

export interface SoundSettings {
  /** Desligado: toasts silenciosos, mas continuam aparecendo. */
  enabled: boolean;
  /** 0 a 100. Vale para os sons do app (o som do Windows segue o volume do sistema). */
  volume: number;
  defaultSound: SoundId;
  /** null = usa o som padrão. */
  mentionSound: SoundId | null;
  /** Som específico por conversa (chave = nome exibido). */
  conversationSounds: Record<string, SoundId>;
  /** Sons importados. Só o main altera esta lista. */
  library: CustomSound[];
}

export type ThemeChoice = 'dark' | 'light' | 'system';

export interface AppearanceSettings {
  /** Tema do app. Também é repassado ao Chat (que segue o tema do sistema por padrão). */
  theme: ThemeChoice;
  /** Experimental: aplica a paleta estilo Discord dentro do Google Chat. */
  chatTheme: boolean;
}

export interface GeneralSettings {
  /** Abrir junto com o Windows (só no app instalado). */
  launchAtLogin: boolean;
  /** Ao abrir com o Windows, ficar só na bandeja. */
  startMinimized: boolean;
  /** Fechar a janela mantém o app rodando na bandeja. */
  closeToTray: boolean;
  /** Aviso "continua rodando na bandeja" já foi mostrado. Só o main altera. */
  trayHintShown: boolean;
}

/** Modo streamer: protege a tela enquanto você transmite ou grava. */
export interface StreamerSettings {
  /** Ligado manualmente (independe da detecção). */
  enabled: boolean;
  /** Liga sozinho enquanto um programa de transmissão/gravação estiver aberto. */
  auto: boolean;
  /** Não mostra notificação nenhuma. */
  pauseNotifications: boolean;
  /** Se as notificações continuarem, esconde remetente e texto. */
  hideContent: boolean;
  /** Sem sons. */
  muteSounds: boolean;
}

export interface Settings {
  version: typeof SETTINGS_VERSION;
  general: GeneralSettings;
  /** Só o main altera (ciclo de vida das sessões). */
  accounts: AccountsSettings;
  notifications: NotificationSettings;
  sounds: SoundSettings;
  appearance: AppearanceSettings;
  streamer: StreamerSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  general: {
    launchAtLogin: false,
    startMinimized: true,
    closeToTray: true,
    trayHintShown: false,
  },
  accounts: { list: [DEFAULT_ACCOUNT], active: DEFAULT_ACCOUNT.id },
  notifications: {
    enabled: true,
    showSender: true,
    showPreview: true,
    quietHours: { enabled: false, start: '22:00', end: '07:00' },
    mentions: { keywords: [], bypassQuietHours: false },
    mutedConversations: [],
  },
  sounds: {
    enabled: true,
    volume: 80,
    defaultSound: 'builtin:gota',
    mentionSound: null,
    conversationSounds: {},
    library: [],
  },
  appearance: { theme: 'dark', chatTheme: false },
  streamer: {
    enabled: false,
    auto: true,
    pauseNotifications: true,
    hideContent: true,
    muteSounds: true,
  },
};

export const LIMITS = {
  conversationKey: 200,
  mutedConversations: 500,
  conversationSounds: 200,
  keyword: 60,
  keywords: 20,
} as const;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Atualização parcial aceita pelo IPC. `sounds.library` é ignorado se vier do renderer. */
export type SettingsPatch = DeepPartial<Omit<Settings, 'version'>>;

const THEMES: readonly ThemeChoice[] = ['dark', 'light', 'system'];

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isClockTime = (v: unknown): v is ClockTime => typeof v === 'string' && CLOCK.test(v);

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const clock = (v: unknown, fallback: ClockTime): ClockTime => (isClockTime(v) ? v : fallback);
const sound = (v: unknown, fallback: SoundId): SoundId => (isSoundId(v) ? v : fallback);

function cleanStrings(v: unknown, fallback: string[], maxLength: number, maxItems: number) {
  if (!Array.isArray(v)) return fallback;
  const items = v
    .filter((k): k is string => typeof k === 'string')
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && k.length <= maxLength);
  return [...new Set(items)].slice(0, maxItems);
}

function cleanConversationSounds(v: unknown, fallback: Record<string, SoundId>) {
  if (!isObj(v)) return fallback;
  const out: Record<string, SoundId> = {};
  for (const [rawKey, value] of Object.entries(v).slice(0, LIMITS.conversationSounds)) {
    const key = rawKey.trim();
    if (key && key.length <= LIMITS.conversationKey && isSoundId(value)) out[key] = value;
  }
  return out;
}

function cleanLibrary(v: unknown, fallback: CustomSound[]): CustomSound[] {
  if (!Array.isArray(v)) return fallback;
  const out: CustomSound[] = [];
  for (const item of v) {
    if (!isObj(item) || !isCustomSoundId(item['id'])) continue;
    const name = typeof item['name'] === 'string' ? item['name'].trim() : '';
    const ext = item['ext'];
    if (!name || name.length > SOUND_LIMITS.nameLength) continue;
    if (!SOUND_EXTENSIONS.includes(ext as SoundExtension)) continue;
    if (out.some((s) => s.id === item['id'])) continue;
    out.push({ id: item['id'], name, ext: ext as SoundExtension });
  }
  return out.slice(0, SOUND_LIMITS.library);
}

/** Converte arquivos de versões anteriores para o formato atual. */
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw['version'] !== 1) return raw;
  const n = isObj(raw['notifications']) ? raw['notifications'] : {};
  // v1 só tinha "som do Windows" ligado/desligado.
  const defaultSound: SoundId = n['systemSound'] === false ? 'none' : 'system';
  return { ...raw, version: 2, sounds: { defaultSound } };
}

interface NormalizeOptions {
  /** Só o main pode alterar campos internos (biblioteca de sons, avisos já exibidos). */
  allowLibrary?: boolean;
}

/**
 * Normaliza qualquer entrada (arquivo do disco, patch do renderer) para um
 * Settings válido. Campos inválidos ou ausentes caem no valor de `base`.
 */
export function normalizeSettings(
  input: unknown,
  base: Settings = DEFAULT_SETTINGS,
  { allowLibrary = true }: NormalizeOptions = {},
): Settings {
  const raw = isObj(input) ? migrate(input) : {};
  const n = isObj(raw['notifications']) ? raw['notifications'] : {};
  const q = isObj(n['quietHours']) ? n['quietHours'] : {};
  const m = isObj(n['mentions']) ? n['mentions'] : {};
  const s = isObj(raw['sounds']) ? raw['sounds'] : {};
  const a = isObj(raw['appearance']) ? raw['appearance'] : {};
  const st = isObj(raw['streamer']) ? raw['streamer'] : {};
  const g = isObj(raw['general']) ? raw['general'] : {};
  const bg = base.general;
  const bn = base.notifications;
  const bs = base.sounds;

  const volume =
    typeof s['volume'] === 'number' && Number.isFinite(s['volume'])
      ? Math.round(Math.min(100, Math.max(0, s['volume'])))
      : bs.volume;

  return {
    version: SETTINGS_VERSION,
    general: {
      launchAtLogin: bool(g['launchAtLogin'], bg.launchAtLogin),
      startMinimized: bool(g['startMinimized'], bg.startMinimized),
      closeToTray: bool(g['closeToTray'], bg.closeToTray),
      trayHintShown: allowLibrary ? bool(g['trayHintShown'], bg.trayHintShown) : bg.trayHintShown,
    },
    accounts: allowLibrary ? normalizeAccounts(raw['accounts'], base.accounts) : base.accounts,
    notifications: {
      enabled: bool(n['enabled'], bn.enabled),
      showSender: bool(n['showSender'], bn.showSender),
      showPreview: bool(n['showPreview'], bn.showPreview),
      quietHours: {
        enabled: bool(q['enabled'], bn.quietHours.enabled),
        start: clock(q['start'], bn.quietHours.start),
        end: clock(q['end'], bn.quietHours.end),
      },
      mentions: {
        keywords: cleanStrings(
          m['keywords'],
          bn.mentions.keywords,
          LIMITS.keyword,
          LIMITS.keywords,
        ),
        bypassQuietHours: bool(m['bypassQuietHours'], bn.mentions.bypassQuietHours),
      },
      mutedConversations: cleanStrings(
        n['mutedConversations'],
        bn.mutedConversations,
        LIMITS.conversationKey,
        LIMITS.mutedConversations,
      ),
    },
    sounds: {
      enabled: bool(s['enabled'], bs.enabled),
      volume,
      defaultSound: sound(s['defaultSound'], bs.defaultSound),
      mentionSound:
        s['mentionSound'] === null
          ? null
          : isSoundId(s['mentionSound'])
            ? s['mentionSound']
            : bs.mentionSound,
      conversationSounds: cleanConversationSounds(s['conversationSounds'], bs.conversationSounds),
      library: allowLibrary ? cleanLibrary(s['library'], bs.library) : bs.library,
    },
    appearance: {
      theme: THEMES.includes(a['theme'] as ThemeChoice)
        ? (a['theme'] as ThemeChoice)
        : base.appearance.theme,
      chatTheme: bool(a['chatTheme'], base.appearance.chatTheme),
    },
    streamer: {
      enabled: bool(st['enabled'], base.streamer.enabled),
      auto: bool(st['auto'], base.streamer.auto),
      pauseNotifications: bool(st['pauseNotifications'], base.streamer.pauseNotifications),
      hideContent: bool(st['hideContent'], base.streamer.hideContent),
      muteSounds: bool(st['muteSounds'], base.streamer.muteSounds),
    },
  };
}

/** Aplica um patch vindo do renderer (sem poder mexer na biblioteca de sons). */
export function applyPatch(current: Settings, patch: unknown): Settings {
  return normalizeSettings(patch, current, { allowLibrary: false });
}
