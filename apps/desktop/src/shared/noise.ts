/** Supressor de ruído nas chamadas (GTCRN, no próprio computador). */

/** preload do Meet → main (invoke): está ligado? */
export const NOISE_STATE_CHANNEL = 'meet:noise-state';
/** main → preload do Meet: ligou/desligou (vale na hora, inclusive em chamada). */
export const NOISE_SET_CHANNEL = 'meet:noise';

/**
 * Eventos do preload (mundo isolado) para o gancho na página. Eventos próprios em
 * vez de postMessage: o Meet tem ouvintes de mensagens que param a propagação.
 */
export const NOISE_EVENT_ON = 'gchat-noise-on';
export const NOISE_EVENT_OFF = 'gchat-noise-off';
