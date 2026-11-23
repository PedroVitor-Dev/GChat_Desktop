/** Canal do postMessage entre o world MAIN e o world ISOLATED. */
export const PAGE_CHANNEL = 'gchat-desktop-plus:v1';

/** Formato do que o hook publica. É sempre revalidado no lado isolado. */
export interface PageNotificationEvent {
  channel: typeof PAGE_CHANNEL;
  kind: 'notification';
  title: string;
  body?: string;
  tag?: string;
}
