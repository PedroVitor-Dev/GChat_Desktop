# Decisão de arquitetura: só o app (Electron carregando o Google Chat)

Data: 23/11/2026 · Substitui a arquitetura B de [fase-1-viabilidade.md](fase-1-viabilidade.md)

## Contexto

A pesquisa da Fase 1 apontou que o Google declara bloquear login em navegadores
incorporados. Por isso a primeira escolha foi PWA + extensão + app. O usuário pediu
para usar **só o app**, sem extensão e sem navegador aberto, e fizemos um teste
prático (`spikes/electron-login`):

- Electron 45.4.1 / Chromium 156, **user-agent padrão do Electron** (ele se identifica
  como `Electron/45.4.1` e com o nome do app; não há falsificação);
- login com uma conta Google real, incluindo a verificação em duas etapas, concluído;
- o Google Chat abriu normalmente.

## Decisão

O app carrega `https://chat.google.com/` em uma janela própria com sessão
persistente. Não há extensão, native host nem dependência de navegador.

## Consequências

**Ganhos**

- Instala e usa: um único programa.
- Funciona com o navegador fechado. O app precisa estar aberto, mesmo que na bandeja.
- O hook de notificações roda no preload do próprio app. Sem Native Messaging,
  registro no Windows nem pipe, o caminho é bem mais simples e confiável.
- Várias contas viram sessões (partições) separadas dentro do app.

**Riscos e mitigação**

| Risco                                          | Mitigação                                                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| O Google passar a bloquear o login no Electron | Manter `spikes/electron-login` para reteste rápido. O plano B (extensão + native host) está documentado e implementado no commit `b643d2c`   |
| Mudança no formato das notificações do Chat    | Diagnóstico embutido (`GCHAT_DIAG=1`) e hook isolado em um só módulo                                                                         |
| Página remota dentro do app                    | Sandbox, `contextIsolation`, sem Node, preload mínimo, navegação restrita ao Google e permissões em lista branca (`src/main/chat/policy.ts`) |

**Regras que continuam valendo**

- Nunca alterar o user-agent para se passar por outro navegador.
- Nunca ler, copiar ou exportar cookies, tokens ou credenciais da sessão.
- Não modificar o conteúdo das mensagens nem a interface do Chat.

## Aprendizados do plano B (para não repetir)

- O executável do Electron **não funciona** como native host direto: o stdin fecha na
  inicialização e ele escreve `\r\n` no stdout, o que corrompe o protocolo. A
  alternativa que funcionou foi `ELECTRON_RUN_AS_NODE=1` via `.cmd`.
- O `cmd.exe` lê `.cmd` na code page OEM: caminhos com acento ("Programação")
  quebram. Use só caminhos relativos (`%~dp0`).
