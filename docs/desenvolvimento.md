# Desenvolvimento

Requisitos: Windows 10/11 x64, Node.js ≥ 22.12 e npm ≥ 11.

```bash
npm install          # instala as dependências (o Electron é baixado no primeiro uso)
npm run dev          # app em modo desenvolvimento (HMR nas configurações)
npm run build        # build de produção em apps/desktop/out
npm run check        # typecheck + lint + formatação + testes
```

Instalador (Fase 10): `npm run dist -w @gchat/desktop` → `apps/desktop/release/`.

## Diagnóstico de notificações

Mostra no terminal **apenas metadados** de cada notificação capturada (API, tipo e
tamanho dos campos) e o que o app fez com ela (exibida, duplicada, silenciada...).

```powershell
npm run build -w @gchat/desktop; $env:GCHAT_DIAG = '1'; npx electron apps/desktop
```

Para abrir direto nas configurações: `npx electron apps/desktop --settings`.

## Onde ficam os dados

`%APPDATA%\GChat Desktop+`. A sessão do Google fica em `Partitions\account-1`,
criptografada pelo Chromium com a proteção de dados do Windows (DPAPI). O app não
lê nem copia esses dados. Para "deslogar tudo", apague a pasta `Partitions`.

## Scripts de instalação

O npm 11 bloqueia scripts de instalação por padrão. As decisões ficam em
`allowScripts` no `package.json` da raiz:

- `esbuild`: **permitido** (instala o binário nativo usado pelo Vite).
- `electron-winstaller`: **negado** (é do Squirrel; usamos NSIS).

## Segurança

**Janela do Google Chat** (`src/main/chat/`):

- `sandbox`, `contextIsolation`, sem Node e sem `<webview>`.
- Sessão própria e persistente, separada da janela de configurações.
- Navegação na janela restrita a domínios do Google. Provedores de SSO externos só
  são aceitos durante o login. O resto abre no navegador padrão.
- Permissões em lista branca: notificações, escrita na área de transferência, tela
  cheia e mídia (chamadas), apenas para `chat.google.com` e `meet.google.com`.
- User-agent padrão do Electron, sem falsificação.

**Janela de configurações:**

- O mesmo isolamento, mais uma CSP restrita.
- Nenhuma navegação ou permissão.
- O IPC só aceita canais da lista em `src/shared/ipc.ts`, vindos do renderer local e
  com argumentos validados.
