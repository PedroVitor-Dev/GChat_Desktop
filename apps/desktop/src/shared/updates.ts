/** Estado da atualização automática, mostrado nas configurações, na barra e na bandeja. */
export type UpdateState =
  | 'unsupported' // versão de desenvolvimento: só o app instalado se atualiza
  | 'idle'
  | 'checking'
  | 'not-available'
  | 'available' // encontrada, aguardando download (verificação manual)
  | 'downloading'
  | 'downloaded' // pronta: reiniciar para instalar
  | 'error';

export interface UpdateStatus {
  state: UpdateState;
  currentVersion: string;
  /** Versão nova, quando houver. */
  version?: string;
  /** 0–100 durante o download. */
  percent?: number;
  /** Mensagem amigável em caso de erro. */
  error?: string;
  /** Epoch ms da última verificação concluída. */
  checkedAt?: number;
}

/** Traduz erros do electron-updater para algo que o usuário entenda (sem detalhes técnicos). */
export function friendlyUpdateError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes('latest.yml') || msg.includes('404') || msg.includes('no published versions')) {
    return 'Ainda não há uma versão publicada com atualização automática.';
  }
  if (
    msg.includes('net::') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('network')
  ) {
    return 'Sem conexão com o GitHub. Verifique a internet e tente de novo.';
  }
  if (msg.includes('sha512') || msg.includes('checksum') || msg.includes('signature')) {
    return 'O download veio corrompido e foi descartado por segurança. Tente de novo.';
  }
  return 'Não foi possível verificar atualizações agora. Tente de novo mais tarde.';
}
