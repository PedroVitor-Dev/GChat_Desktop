/** Estado efetivo do modo streamer (mostrado na janela, bandeja e configurações). */
export interface StreamerStatus {
  active: boolean;
  /** Por que está ativo: ligado à mão ou detectado automaticamente. */
  reason: 'manual' | 'auto' | null;
  /** Programas de transmissão detectados agora (ex.: "OBS Studio"). */
  apps: string[];
}

export const STREAMER_OFF: StreamerStatus = { active: false, reason: null, apps: [] };
