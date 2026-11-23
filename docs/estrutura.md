# Estrutura de diretórios

Monorepo com **npm workspaces**. Hoje há um único app (`apps/desktop`); a estrutura
permite separar pacotes no futuro (por exemplo, um "modo corporativo" com a API
oficial) sem reorganizar o projeto.

```
GChat_Desktop/
├─ apps/
│  └─ desktop/                     # App Windows (Electron + React + TS + Tailwind)
│     ├─ src/
│     │  ├─ main/                  # Processo principal
│     │  │  ├─ index.ts            # bootstrap, instância única, janelas
│     │  │  ├─ menu.ts             # menu pt-BR (oculto; Alt exibe)
│     │  │  ├─ security.ts         # endurecimento das janelas locais
│     │  │  ├─ chat/               # janela do Google Chat
│     │  │  │  ├─ chat-window.ts   # janela, navegação, popups, menu de contexto
│     │  │  │  ├─ policy.ts        # regras puras de navegação/permissões (+ testes)
│     │  │  │  ├─ session.ts       # sessão persistente por conta
│     │  │  │  └─ diagnostics.ts   # GCHAT_DIAG=1: metadados das notificações
│     │  │  ├─ ipc/                # canais IPC + validação de remetente/payload
│     │  │  ├─ notifications/      # (Fase 4) Notification Manager
│     │  │  ├─ sounds/             # (Fase 5) biblioteca e validação de áudio
│     │  │  ├─ tray/               # (Fase 6) bandeja, contador, autostart
│     │  │  └─ store/              # (Fase 7) configurações versionadas
│     │  ├─ preload/
│     │  │  ├─ index.ts            # janela de configurações (API mínima)
│     │  │  └─ chat.ts             # janela do Chat (hook de notificações)
│     │  ├─ renderer/              # Telas React de configurações
│     │  └─ shared/                # tipos compartilhados main ⇄ preload ⇄ renderer
│     ├─ resources/                # ícones, sons predefinidos
│     └─ electron-builder.yml      # instalador NSIS x64
├─ spikes/
│  └─ electron-login/              # reteste rápido do login do Google no Electron
├─ docs/
└─ package.json
```

## Princípios

- **Código que depende do Google Chat em um só lugar:** `src/preload/chat.ts`. É lá
  que o comportamento não documentado do Chat é observado.
- **Regras de segurança como funções puras e testadas:** `src/main/chat/policy.ts`.
- **Nada de conteúdo de mensagem em log:** só metadados (tipos, tamanhos, contagens).
