# Desenvolvimento

Requisitos: Windows 10/11 x64, Node.js ≥ 22.12 e npm ≥ 11.

```bash
npm install          # instala todos os workspaces (o Electron é baixado no primeiro uso)
npm run dev          # app Windows em modo desenvolvimento (HMR no renderer)
npm run build        # gera app, extensão (apps/extension/dist) e native host
npm run check        # typecheck + lint + formatação + testes
```

## Workspaces

| Pacote              | Saída                                   | Observação                                                                      |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| `packages/protocol` | — (consumido como fonte)                | Mensagens, validadores e codec do Native Messaging                              |
| `apps/desktop`      | `apps/desktop/out`                      | Electron + React + Tailwind; `npm run dist -w @gchat/desktop` gera o instalador |
| `apps/extension`    | `apps/extension/dist`                   | Carregar sem compactação em `chrome://extensions` / `edge://extensions`         |
| `apps/native-host`  | `apps/native-host/dist/native-host.cjs` | Vira executável e é registrado no Windows na Fase 4                             |

## Scripts de instalação

O npm 11 bloqueia scripts de instalação por padrão. As decisões ficam em
`allowScripts` no `package.json` da raiz:

- `esbuild`: **permitido** (instala o binário nativo).
- `electron-winstaller`: **negado** (é do Squirrel; usamos NSIS).

## Segurança da janela

- `sandbox`, `contextIsolation`, sem `nodeIntegration` e sem `<webview>`.
- CSP restrita no `index.html`; navegação e `window.open` bloqueados (links https
  explícitos abrem no navegador padrão).
- O IPC só aceita canais da lista em `src/shared/ipc.ts`, vindos do renderer local,
  e com argumentos validados (`src/main/ipc/handle.ts`).
- Todas as permissões de navegador (câmera, microfone etc.) são negadas.
