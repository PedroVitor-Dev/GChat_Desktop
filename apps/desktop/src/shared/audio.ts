/** Contrato entre o main e a janela oculta que toca os sons (Web Audio). */
export const AudioChannel = {
  /** main → player: tocar bytes de áudio. */
  Play: 'audio:play',
  /** main → player: decodificar e medir (validação de importação). */
  Probe: 'audio:probe',
  /** player → main: resultado do probe. */
  ProbeResult: 'audio:probe-result',
} as const;

export interface PlayRequest {
  /** Chave de cache (id do som). */
  key: string;
  bytes: Uint8Array;
  /** 0 a 100. */
  volume: number;
}

export interface ProbeRequest {
  requestId: number;
  bytes: Uint8Array;
}

export type ProbeResult =
  { requestId: number; ok: true; seconds: number } | { requestId: number; ok: false };

/** Toque mais longo que isso é cortado (sons de notificação devem ser curtos). */
export const MAX_PLAY_SECONDS = 10;
