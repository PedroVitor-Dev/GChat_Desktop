import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { isTrustedRendererUrl } from '../security';

/**
 * Registra um handler IPC com duas validações obrigatórias:
 * 1. o remetente tem de ser um frame do nosso renderer local;
 * 2. os argumentos passam pelo validador antes de chegar à lógica.
 */
export function handle<A, R>(
  channel: string,
  validate: (args: unknown[]) => A,
  fn: (args: A, event: IpcMainInvokeEvent) => R | Promise<R>,
): void {
  ipcMain.handle(channel, async (event, ...raw: unknown[]) => {
    const url = event.senderFrame?.url ?? '';
    if (!isTrustedRendererUrl(url)) {
      throw new Error(`IPC ${channel} recusado: remetente não confiável`);
    }
    return fn(validate(raw), event);
  });
}

export const noArgs = (args: unknown[]): void => {
  if (args.length !== 0) throw new TypeError('argumentos inesperados');
};
