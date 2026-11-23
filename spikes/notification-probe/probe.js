// Sonda da Fase 1: descobre COMO o Google Chat dispara notificações.
// Privacidade: registra só metadados (presença e tamanho dos campos), nunca o conteúdo.
// Não altera o comportamento da página: toda chamada é repassada à API original.
(() => {
  'use strict';

  const PREFIX = '[GChat Probe]';
  const frame = window === window.top ? 'top' : 'iframe';
  const describe = (value) => {
    if (value === undefined || value === null) return 'ausente';
    if (typeof value === 'string') return `string(${value.length})`;
    if (typeof value === 'object') return `object{${Object.keys(value).join(',')}}`;
    return typeof value;
  };
  const describeOptions = (options = {}) =>
    Object.fromEntries(Object.keys(options).map((key) => [key, describe(options[key])]));

  const report = (api, title, options) => {
    console.info(PREFIX, {
      api,
      frame,
      origin: location.origin,
      at: new Date().toISOString(),
      title: describe(title),
      options: describeOptions(options),
      permission: typeof Notification !== 'undefined' ? Notification.permission : 'n/a',
    });
  };

  // 1) new Notification(...) na página
  const Original = window.Notification;
  if (typeof Original === 'function') {
    const Probed = function Notification(title, options) {
      report('window.Notification', title, options);
      return new Original(title, options);
    };
    Probed.prototype = Original.prototype;
    Object.defineProperty(Probed, 'permission', { get: () => Original.permission });
    Probed.requestPermission = (...args) => {
      console.info(PREFIX, { api: 'Notification.requestPermission', frame });
      return Original.requestPermission(...args);
    };
    if ('maxActions' in Original) {
      Object.defineProperty(Probed, 'maxActions', { get: () => Original.maxActions });
    }
    window.Notification = Probed;
  }

  // 2) registration.showNotification(...) chamado a partir da página
  const proto = window.ServiceWorkerRegistration && ServiceWorkerRegistration.prototype;
  if (proto && typeof proto.showNotification === 'function') {
    const originalShow = proto.showNotification;
    proto.showNotification = function (title, options) {
      report('ServiceWorkerRegistration.showNotification', title, options);
      return originalShow.call(this, title, options);
    };
  }

  // 3) Contexto: existe service worker registrado? (indica possível push direto)
  if (frame === 'top' && navigator.serviceWorker) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) =>
        console.info(PREFIX, {
          api: 'serviceWorker.getRegistrations',
          count: regs.length,
          scopes: regs.map((r) => new URL(r.scope).pathname),
        }),
      )
      .catch(() => {});
  }

  console.info(PREFIX, { event: 'sonda ativa', frame, origin: location.origin });
})();
