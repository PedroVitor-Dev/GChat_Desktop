import { EventEmitter } from 'node:events';
import type { StreamerSettings } from '../../shared/settings';
import type { StreamerStatus } from '../../shared/streamer';
import type { SettingsStore } from '../store/settings-store';
import { StreamingDetector } from './streaming-detector';

/** Estado efetivo a partir da configuração e dos programas detectados (pura). */
export function resolveStreamer(
  settings: StreamerSettings,
  apps: string[],
  autoSuppressed = false,
): StreamerStatus {
  if (settings.enabled) return { active: true, reason: 'manual', apps };
  if (settings.auto && apps.length > 0 && !autoSuppressed) {
    return { active: true, reason: 'auto', apps };
  }
  return { active: false, reason: null, apps };
}

/**
 * Modo streamer, como no Discord: liga à mão ou sozinho quando um programa de
 * transmissão/gravação está aberto. A detecção só roda com "automático" ligado.
 */
export class StreamerMode extends EventEmitter<{ change: [StreamerStatus] }> {
  private readonly detector = new StreamingDetector();
  private current: StreamerStatus;
  /** Desligado pelo usuário durante uma transmissão: só volta quando o programa fechar. */
  private autoSuppressed = false;

  constructor(private readonly settings: SettingsStore) {
    super();
    this.current = resolveStreamer(settings.get().streamer, []);
    this.detector.on('change', (apps) => {
      if (apps.length === 0) this.autoSuppressed = false;
      this.refresh();
    });
    settings.on('change', () => {
      this.syncDetector();
      this.refresh();
    });
    this.syncDetector();
  }

  status(): StreamerStatus {
    return this.current;
  }

  /**
   * Liga/desliga pelo usuário (bandeja, configurações). Desligar durante uma
   * transmissão detectada vale até o programa fechar, como no Discord.
   */
  setManual(enabled: boolean): void {
    this.autoSuppressed = !enabled && this.detector.detected().length > 0;
    this.settings.update({ streamer: { enabled } });
    this.refresh();
  }

  /** Inverte o estado efetivo (o que o usuário vê). */
  toggle(): void {
    this.setManual(!this.current.active);
  }

  dispose(): void {
    this.detector.stop();
  }

  private syncDetector(): void {
    if (this.settings.get().streamer.auto) this.detector.start();
    else this.detector.stop();
  }

  private refresh(): void {
    const next = resolveStreamer(
      this.settings.get().streamer,
      this.detector.detected(),
      this.autoSuppressed,
    );
    const changed =
      next.active !== this.current.active ||
      next.reason !== this.current.reason ||
      next.apps.join('|') !== this.current.apps.join('|');
    this.current = next;
    if (changed) this.emit('change', next);
  }
}
