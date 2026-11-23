/**
 * Preload da janela do Google Chat (sandbox + contextIsolation).
 *
 * Fase 3: não expõe nada à página, exceto quando o diagnóstico está ligado
 * (GCHAT_DIAG=1). Nesse caso instala, no world da página, um observador de
 * notificações que reporta apenas metadados. Não altera o comportamento do Chat.
 */
import { contextBridge, ipcRenderer } from 'electron';
import { DIAG_CHANNEL, DIAG_FLAG, type NotificationDiag } from '../shared/diagnostics';

if (process.argv.includes(DIAG_FLAG)) {
  contextBridge.exposeInMainWorld('__gchatDiag', {
    report: (diag: NotificationDiag) => ipcRenderer.send(DIAG_CHANNEL, diag),
  });

  // Função serializada e executada no world da página (sem closures).
  contextBridge.executeInMainWorld({
    func: () => {
      type Reporter = { report: (d: unknown) => void };
      const reporter = (window as unknown as { __gchatDiag?: Reporter }).__gchatDiag;
      if (!reporter) return;
      const frame = window === window.top ? 'top' : 'iframe';
      const describe = (v: unknown): string => {
        if (v === undefined || v === null) return 'ausente';
        if (typeof v === 'string') return `string(${v.length})`;
        if (typeof v === 'object') return `object{${Object.keys(v).join(',')}}`;
        return typeof v;
      };
      const fields = (title: unknown, options?: Record<string, unknown>) => {
        const out: Record<string, string> = { title: describe(title) };
        for (const key of Object.keys(options ?? {})) out[key] = describe(options?.[key]);
        return out;
      };

      const Original = window.Notification;
      if (typeof Original === 'function') {
        const Observed = function Notification(title: string, options?: NotificationOptions) {
          reporter.report({
            api: 'window.Notification',
            frame,
            fields: fields(title, options as Record<string, unknown>),
          });
          return new Original(title, options);
        } as unknown as typeof Notification;
        Observed.prototype = Original.prototype;
        Object.defineProperty(Observed, 'permission', { get: () => Original.permission });
        Object.defineProperty(Observed, 'requestPermission', {
          value: Original.requestPermission.bind(Original),
        });
        window.Notification = Observed;
      }

      const proto = window.ServiceWorkerRegistration?.prototype;
      if (proto?.showNotification) {
        const show = proto.showNotification;
        proto.showNotification = function (title: string, options?: NotificationOptions) {
          reporter.report({
            api: 'ServiceWorkerRegistration.showNotification',
            frame,
            fields: fields(title, options as Record<string, unknown>),
          });
          return show.call(this, title, options);
        };
      }
    },
  });
}
