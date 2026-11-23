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
│     │  │  ├─ shell/              # janela principal estilo Discord (título, trilho, view do Chat)
│     │  │  ├─ security.ts         # endurecimento das janelas locais
│     │  │  ├─ chat/               # janela do Google Chat
│     │  │  │  ├─ chat-view.ts     # view do Chat: navegação, popups, menu de contexto
│     │  │  │  ├─ chat-theme.css   # tema experimental (tokens Material 3)
│     │  │  │  ├─ policy.ts        # regras puras de navegação/permissões (+ testes)
│     │  │  │  ├─ session.ts       # sessão persistente por conta
│     │  │  │  └─ diagnostics.ts   # GCHAT_DIAG=1: metadados das notificações
│     │  │  ├─ ipc/                # canais IPC + validação de remetente/payload
│     │  │  ├─ notifications/      # Notification Manager (regras, dedup, toasts)
│     │  │  ├─ sounds/             # biblioteca, validação e player de áudio
│     │  │  ├─ tray/               # bandeja (menu, contador)
│     │  │  └─ store/              # configurações versionadas (com migração)
│     │  ├─ preload/
│     │  │  ├─ index.ts            # janela de configurações (API mínima)
│     │  │  └─ chat.ts             # janela do Chat (hook de notificações)
│     │  ├─ renderer/              # shell + configurações (React) e player oculto (audio.html)
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
