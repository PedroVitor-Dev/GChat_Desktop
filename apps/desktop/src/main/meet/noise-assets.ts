import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { protocol, type Session } from 'electron';

/**
 * Arquivos do supressor de ruído (GTCRN, MIT) para a página do Meet.
 *
 * A política de segurança (CSP) do Meet não deixa carregar scripts de fora. O
 * esquema `gchat-audio://` é privilegiado (`bypassCSP`) e entrega SÓ estes dois
 * arquivos do pacote, lidos do disco do próprio app; nada vem da internet.
 */
export const NOISE_SCHEME = 'gchat-audio';

const resolveAsset = createRequire(import.meta.url).resolve;
const ASSETS: Record<string, { module: string; type: string }> = {
  '/gtcrn-worklet.js': {
    module: '@sapphi-red/web-noise-suppressor/gtcrnWorklet.js',
    type: 'text/javascript',
  },
  '/gtcrn.wasm': {
    module: '@sapphi-red/web-noise-suppressor/gtcrn.wasm',
    type: 'application/wasm',
  },
};

/** Precisa rodar antes do `app.ready`. */
export function registerNoiseScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: NOISE_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        bypassCSP: true,
      },
    },
  ]);
}

const served = new WeakSet<Session>();

/** Atende `gchat-audio://noise/<arquivo>` na sessão da conta (Chat/Meet). */
export function serveNoiseAssets(ses: Session): void {
  if (served.has(ses)) return;
  served.add(ses);
  ses.protocol.handle(NOISE_SCHEME, async (request) => {
    const url = new URL(request.url);
    const asset = url.host === 'noise' ? ASSETS[url.pathname] : undefined;
    if (!asset) return new Response('não encontrado', { status: 404 });
    try {
      const bytes = await readFile(resolveAsset(asset.module));
      return new Response(new Uint8Array(bytes), {
        headers: {
          'content-type': asset.type,
          'access-control-allow-origin': '*',
          'cache-control': 'max-age=86400',
        },
      });
    } catch {
      return new Response('indisponível', { status: 500 });
    }
  });
}
