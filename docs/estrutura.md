# Estrutura de diretórios

Monorepo com **npm workspaces**. Os componentes rodam em processos diferentes
(navegador, ponte nativa e app Windows) e compartilham apenas o protocolo tipado.

```
GChat_Desktop/
├─ apps/
│  ├─ desktop/                  # App Windows (Electron + React + TS + Tailwind)
│  │  ├─ src/
│  │  │  ├─ main/               # Processo principal
│  │  │  │  ├─ index.ts         # bootstrap, single-instance, AppUserModelID
│  │  │  │  ├─ ipc/             # canais IPC + validação de payload
│  │  │  │  ├─ bridge/          # servidor do named pipe (fala com o native-host)
│  │  │  │  ├─ notifications/   # Notification Manager (dedup, regras, silêncio)
│  │  │  │  ├─ sounds/          # importação/validação de áudio, biblioteca
│  │  │  │  ├─ tray/            # bandeja, menu, contador
│  │  │  │  ├─ system/          # autostart, tema, registro do native host
│  │  │  │  └─ store/           # persistência de configurações (schema versionado)
│  │  │  ├─ preload/            # API mínima exposta via contextBridge
│  │  │  └─ renderer/           # Telas React: Geral, Notificações, Sons, Contas,
│  │  │                         #   Aparência, Privacidade, Sobre
│  │  ├─ resources/             # ícones, sons predefinidos
│  │  └─ electron-builder.yml   # instalador NSIS x64
│  ├─ extension/                # Extensão MV3 (Chrome e Edge)
│  │  ├─ src/
│  │  │  ├─ main-world/         # notification-hook.ts (world MAIN)
│  │  │  ├─ content/            # bridge isolado (valida e repassa)
│  │  │  └─ background/         # service worker + connectNative
│  │  └─ manifest.json
│  └─ native-host/              # ponte stdio ↔ named pipe (executável mínimo)
├─ packages/
│  └─ protocol/                 # tipos e validadores das mensagens entre componentes
├─ spikes/
│  └─ notification-probe/       # sonda da Fase 1 (descartável)
├─ docs/                        # viabilidade, arquitetura e decisões
└─ package.json                 # workspaces, scripts raiz
```

## Princípios

- **Uma única fonte de verdade para mensagens:** `packages/protocol` define cada
  mensagem e o seu validador. Extensão, native host e app importam daí.
- **Código não documentado em um só lugar:** tudo o que depende do comportamento
  interno do Google Chat fica em `apps/extension/src/main-world/`.
- **Nada de conteúdo de mensagem em log:** os logs registram apenas eventos e
  metadados (tamanhos, contagens, hashes).
