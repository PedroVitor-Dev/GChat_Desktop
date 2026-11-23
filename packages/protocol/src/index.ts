export * from './messages';
export * from './framing';

/** Nome do host registrado no Chrome/Edge (apenas minúsculas, dígitos, `_` e `.`). */
export const NATIVE_HOST_NAME = 'com.pedrovitor.gchat_desktop_plus';

/** Named pipe usado entre o native-host e o app Windows. */
export const PIPE_PATH = '\\\\.\\pipe\\gchat-desktop-plus';
