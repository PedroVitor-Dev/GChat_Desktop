/**
 * Native Messaging host: iniciado pelo Chrome/Edge, faz a ponte
 * stdio (navegador) ⇄ named pipe (app GChat Desktop+). Sem lógica de negócio.
 *
 * - stdout é EXCLUSIVO do protocolo; qualquer diagnóstico vai para stderr.
 * - Mensagens são validadas nas duas direções antes de serem repassadas.
 * - O processo termina quando o navegador fecha o stdin ou o pipe cai.
 */
import { connect } from 'node:net';
import {
  FrameDecoder,
  PIPE_PATH,
  encodeFrame,
  parseAppToExtension,
  parseExtensionToApp,
} from '@gchat/protocol';

const log = (msg: string): void => {
  process.stderr.write(`[gchat-native-host] ${msg}\n`);
};

const pipe = connect(PIPE_PATH);
const fromBrowser = new FrameDecoder();
const fromApp = new FrameDecoder();
const pending: Uint8Array[] = [];
let pipeReady = false;

const shutdown = (reason: string, code = 0): never => {
  log(`encerrando: ${reason}`);
  pipe.destroy();
  process.exit(code);
};

pipe.on('connect', () => {
  pipeReady = true;
  for (const frame of pending.splice(0)) pipe.write(frame);
});
// Fase 6: se o app não estiver rodando, iniciá-lo e tentar de novo.
pipe.on('error', (err) => shutdown(`pipe indisponível (${err.message})`, 1));
pipe.on('close', () => shutdown('pipe fechado'));

process.stdin.on('data', (chunk: Buffer) => {
  try {
    for (const raw of fromBrowser.push(chunk)) {
      const parsed = parseExtensionToApp(raw);
      if (!parsed.ok) {
        log(`mensagem do navegador descartada: ${parsed.error}`);
        continue;
      }
      const frame = encodeFrame(parsed.value);
      if (pipeReady) pipe.write(frame);
      else pending.push(frame);
    }
  } catch (err) {
    shutdown(`stream do navegador inválido (${(err as Error).message})`, 1);
  }
});
process.stdin.on('end', () => shutdown('navegador fechou a conexão'));

pipe.on('data', (chunk: Buffer) => {
  try {
    for (const raw of fromApp.push(chunk)) {
      const parsed = parseAppToExtension(raw);
      if (parsed.ok) process.stdout.write(encodeFrame(parsed.value));
      else log(`mensagem do app descartada: ${parsed.error}`);
    }
  } catch (err) {
    shutdown(`stream do app inválido (${(err as Error).message})`, 1);
  }
});
