/**
 * Diagnóstico de notificações (Fase 3 → insumo da Fase 4).
 * Só METADADOS: qual API foi usada e o tamanho/tipo de cada campo. Nunca conteúdo.
 * Ativado com a variável de ambiente GCHAT_DIAG=1.
 */
export const DIAG_CHANNEL = 'chat:diag';
export const DIAG_FLAG = '--gchat-diag';

export interface NotificationDiag {
  api: string;
  frame: 'top' | 'iframe';
  /** Ex.: { title: "string(12)", body: "string(40)", tag: "ausente" } */
  fields: Record<string, string>;
}
