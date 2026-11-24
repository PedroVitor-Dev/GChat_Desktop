import { createHash } from 'node:crypto';
import type { CapturedNotification } from '../../shared/notifications';
import type {
  ClockTime,
  NotificationSettings,
  QuietHours,
  SoundSettings,
} from '../../shared/settings';
import type { SoundId } from '../../shared/sounds';

const minutes = (t: ClockTime): number => {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * Está dentro do horário de silêncio? Suporta faixas que cruzam a meia-noite
 * (22:00 → 07:00). Início igual ao fim é tratado como faixa vazia.
 */
export function isInQuietHours(now: Date, quiet: QuietHours): boolean {
  if (!quiet.enabled) return false;
  const start = minutes(quiet.start);
  const end = minutes(quiet.end);
  if (start === end) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  return start < end ? current >= start && current < end : current >= start || current < end;
}

/**
 * Mesma conversa? Compara nomes sem diferenciar maiúsculas, acentos e espaços
 * (ex.: o título da página do Chat e o título da notificação).
 */
export function sameConversation(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  return norm(a) !== '' && norm(a) === norm(b);
}

/** Chave da conversa: o título exibido (remetente ou espaço). Sem ID oficial no Chat. */
export const conversationKey = (n: CapturedNotification): string => n.title.trim();

export function isMuted(n: CapturedNotification, settings: NotificationSettings): boolean {
  return settings.mutedConversations.includes(conversationKey(n));
}

/** Pessoa prioritária (VIP): sempre avisa, mesmo no silêncio, Não perturbe ou streamer. */
export function isVip(
  n: CapturedNotification,
  settings: Pick<NotificationSettings, 'vipConversations'>,
): boolean {
  return settings.vipConversations.includes(conversationKey(n));
}

/** Minúsculas e sem acentos, para comparar "@João" com "@joao". */
const fold = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** "@" seguido de uma letra (inclui acentos): "@Pedro", "@todos". Ignora e-mails. */
const AT_MENTION = /(^|[^\p{L}\p{N}._%+-])@\p{L}/u;

/**
 * É uma menção? O Chat não marca menções na notificação, então:
 * - com palavras configuradas pelo usuário (ex.: "@Pedro", "Pedro Vitor"),
 *   procura qualquer uma delas no texto (sem diferenciar maiúsculas/acentos);
 * - sem palavras, qualquer "@nome" no texto conta como menção. Menos preciso
 *   (pode ser menção a outra pessoa), mas faz o som de menção funcionar de imediato.
 */
export function isMention(n: CapturedNotification, keywords: readonly string[]): boolean {
  if (!n.body) return false;
  if (keywords.length === 0) return AT_MENTION.test(n.body);
  const text = fold(n.body);
  return keywords.some((k) => text.includes(fold(k)));
}

/** Escolhe o som: pessoa prioritária > menção > som da conversa > som padrão. */
export function chooseSound(
  n: CapturedNotification,
  sounds: Pick<
    SoundSettings,
    'enabled' | 'defaultSound' | 'mentionSound' | 'conversationSounds' | 'vipSound'
  >,
  mention: boolean,
  vip = false,
): SoundId {
  if (!sounds.enabled) return 'none';
  if (vip && sounds.vipSound) return sounds.vipSound;
  if (mention && sounds.mentionSound) return sounds.mentionSound;
  return sounds.conversationSounds[conversationKey(n)] ?? sounds.defaultSound;
}

/** Título e corpo do toast conforme as opções de privacidade. */
export function formatToast(
  n: CapturedNotification,
  settings: Pick<NotificationSettings, 'showSender' | 'showPreview'>,
): { title: string; body: string } {
  const title = settings.showSender ? n.title : 'Google Chat';
  if (!settings.showPreview) {
    return {
      title,
      body: settings.showSender ? 'Nova mensagem' : 'Você recebeu uma nova mensagem',
    };
  }
  return { title, body: n.body ?? 'Nova mensagem' };
}

/**
 * Deduplicação: a mesma notificação (tag + título + corpo) dentro da janela de
 * tempo é descartada. Guarda só o hash, nunca o conteúdo.
 */
export class Deduplicator {
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly windowMs = 10_000,
    private readonly maxEntries = 500,
  ) {}

  isDuplicate(n: CapturedNotification, now = Date.now()): boolean {
    for (const [key, at] of this.seen) {
      if (now - at <= this.windowMs) break; // Map mantém ordem de inserção
      this.seen.delete(key);
    }
    const key = createHash('sha256')
      .update(`${n.tag ?? ''}\u0000${n.title}\u0000${n.body ?? ''}`)
      .digest('base64');
    if (this.seen.has(key)) return true;
    this.seen.set(key, now);
    if (this.seen.size > this.maxEntries) {
      const oldest = this.seen.keys().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    return false;
  }
}
