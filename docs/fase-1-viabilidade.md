# Fase 1 — Pesquisa de viabilidade

> Status: concluída na parte documental. **Pendente:** validação prática com a sonda
> `spikes/notification-probe` (seção 6) antes de começar a Fase 4.
> Data: 23/11/2026

## 1. Resumo executivo

| Pergunta | Resposta |
|---|---|
| Dá para fazer login no Google dentro de uma janela Electron? | **Não de forma confiável nem permitida.** O Google bloqueia login em frameworks de navegador incorporado (CEF, Electron) desde 04/01/2021. Contornar isso exige falsificar o navegador, que está fora do escopo do projeto. |
| Existe API oficial que avise sobre novas mensagens? | **Sim, mas só para Google Workspace:** a Google Workspace Events API (`google.workspace.chat.message.v1.created`). Ela exige projeto no Google Cloud, OAuth com escopo `chat.messages` e Pub/Sub. Não serve para contas pessoais nem para uso "instale e use". |
| Qual o caminho oficial do Google para o Chat no desktop? | O **app instalável (PWA)** do Chat no Chrome. Ele substituiu o antigo cliente Electron do próprio Google. |
| Arquitetura escolhida | **PWA oficial do Chat no Chrome/Edge + extensão MV3 + aplicativo Windows companheiro (Electron), ligados por Native Messaging.** |

## 2. Restrições encontradas

### 2.1 Autenticação

- O Google bloqueia login de contas Google em frameworks incorporados desde
  **4 de janeiro de 2021**. A orientação oficial é usar o navegador do sistema ou
  migrar para PWA.
- O OAuth em webviews incorporadas está bloqueado desde **30/09/2021**.
- Ferramentas que empacotam sites em Electron (como o ToDesktop) documentam o mesmo
  bloqueio e só oferecem login pelo navegador padrão com retorno por protocolo
  personalizado. Isso funciona para **OAuth de APIs**, mas **não transfere a sessão
  web** do `chat.google.com` para dentro da janela Electron.
- Os clientes Electron de terceiros que ainda funcionam com o Chat alteram o
  user-agent para se passar por Chrome. **Descartado**, conforme a regra do projeto
  de não falsificar a identidade do navegador.

**Conclusão:** carregar o `chat.google.com` em um `BrowserWindow` não é uma base
estável para uso diário.

### 2.2 Notificações

- O Chat web pede permissão de notificação ao navegador e usa as notificações
  dele. A configuração por espaço é feita no próprio Chat.
- O Google **não documenta** o formato interno dessas notificações: título, corpo,
  `tag`, ícone, dados e se partem da página ou do service worker.
  **Tudo o que usarmos daí é comportamento não documentado** e pode mudar sem aviso.
- O PWA do Chat **depende do navegador aberto**. Com o navegador fechado não há
  notificação, e vamos documentar isso para o usuário em vez de prometer.

### 2.3 APIs oficiais (Workspace Events API)

- O evento `google.workspace.chat.message.v1.created` inclui o nome da mensagem e o
  remetente.
- Com autenticação de usuário, a assinatura recebe apenas eventos dos espaços de
  que o usuário participa. O alvo `//chat.googleapis.com/spaces/-` cobre todos.
- Só é permitida **uma assinatura por usuário e alvo**; outra tentativa retorna
  `ALREADY_EXISTS`.
- Exige um projeto no Google Cloud, a tela de consentimento OAuth com escopo
  restrito (que pede verificação do Google para distribuição pública) e um tópico
  Pub/Sub.
- **Uso no projeto:** um "modo corporativo" opcional no futuro, para organizações
  Workspace que aceitem configurar o próprio projeto GCP. Não entra no MVP.

## 3. Comparação de arquiteturas

| Critério | A. Electron carregando o Chat | B. PWA + extensão + app Windows | C. API oficial (Events API) |
|---|---|---|---|
| Login Google | Bloqueado sem falsificar o navegador | **Nativo do navegador** (2FA, passkeys, SSO) | OAuth oficial |
| Contas pessoais (@gmail) | — | **Sim** | Não (só Workspace) |
| Múltiplas contas | Partições de sessão | Perfis do navegador e seletor de contas do Chat | Uma assinatura por conta |
| Acesso aos dados da notificação | Hook na página (não documentado) | Hook na página (não documentado) | **Documentado** |
| Funciona com o navegador fechado | Sim | **Não** | Sim (com o app aberto) |
| Configuração para o usuário | Instalar | Instalar o app e a extensão (o instalador guia) | Projeto GCP, OAuth, Pub/Sub |
| Risco de quebra | **Alto** (bloqueio de login) | Médio (formato da notificação) | Baixo |
| Conformidade com as regras do projeto | Viola (falsificação) | **Atende** | Atende |

**Decisão: arquitetura B.** É a única que atende todas as regras (sem falsificação,
sem tocar em credenciais, login 100% oficial) e funciona para qualquer conta. O
risco que resta (formato das notificações) fica isolado em um único módulo
pequeno e testável, com modo de degradação (seção 5).

## 4. Arquitetura escolhida

```
┌──────────────── Chrome / Edge ────────────────┐       ┌──────── GChat Desktop+ (Windows) ────────┐
│                                               │       │                                          │
│  PWA oficial chat.google.com                  │       │  Processo principal Electron             │
│   └─ notification-hook.ts (world MAIN)        │       │   ├─ Pipe server (\\.\pipe\gchat-plus)   │
│        intercepta window.Notification         │       │   ├─ Notification Manager                │
│        e showNotification()                   │       │   │   (dedup, regras, silêncio,          │
│              │ postMessage                    │       │   │    prioridade, privacidade)          │
│  content bridge (world ISOLATED)              │       │   ├─ Sound Engine (janela oculta)        │
│              │ runtime.sendMessage            │       │   ├─ Toasts nativos do Windows           │
│  service worker da extensão                   │       │   ├─ Bandeja, autostart, contador        │
│   └─ chrome.runtime.connectNative ────────────┼─stdio─┼─► native-host.exe ──named pipe──►        │
│        ◄── comandos (focar conversa) ─────────┼───────┼──                                        │
└───────────────────────────────────────────────┘       │  Janela de configurações (React)         │
                                                        └──────────────────────────────────────────┘
```

### 4.1 Componentes

1. **Extensão MV3 (Chrome e Edge, o mesmo código)**
   - `notification-hook` no *world* `MAIN` (`content_scripts[].world = "MAIN"`,
     recurso documentado). Substitui `window.Notification` e
     `ServiceWorkerRegistration.prototype.showNotification` por versões que
     **leem apenas título, corpo, tag e timestamp** e repassam esses dados.
     Não toca em cookies, tokens, formulários nem no DOM das mensagens.
   - `content bridge` no *world* `ISOLATED`. Valida o formato do `postMessage`,
     descarta o que não for do hook e repassa ao service worker.
   - **Service worker** que mantém a porta `connectNative` com o app e, ao receber
     "foco", chama `chrome.windows.update` / `chrome.tabs.update` (APIs documentadas)
     e dispara o `onclick` original guardado pelo hook.
2. **native-host**: um executável mínimo iniciado pelo navegador. Ele só faz a
   ponte entre o stdio do Native Messaging (mensagens de até 1 MB com prefixo de
   tamanho) e o *named pipe* do app. Se o app não estiver rodando, ele o inicia.
   Fica registrado em `HKCU\Software\Google\Chrome\NativeMessagingHosts\…` e
   `HKCU\Software\Microsoft\Edge\NativeMessagingHosts\…`.
3. **App Windows (Electron + React + TypeScript + Tailwind)**: Notification
   Manager, sons, bandeja, autostart e configurações. **Nunca carrega o
   `chat.google.com`.** Por isso a janela é 100% local, com `sandbox`,
   `contextIsolation`, sem `nodeIntegration` e com CSP restrita.

### 4.2 Fluxo de uma mensagem

1. O Chat chama `new Notification(título, { body, tag, … })`.
2. O hook captura os dados e, conforme a configuração "notificação do navegador",
   **suprime** o pop-up original (para não duplicar) ou o deixa passar.
3. A mensagem chega ao app pelo caminho extensão → native host → pipe.
4. O Notification Manager aplica, nesta ordem: deduplicação, silêncio por conversa,
   horário de silêncio, regras de prioridade e de som, e privacidade (ocultar o
   conteúdo).
5. Ele mostra o toast nativo **silencioso** e toca o som escolhido no Sound Engine.
6. No clique, envia o comando "focar" de volta. A extensão foca a janela ou aba e
   chama o `onclick` original, que é o que faz o Chat abrir a conversa.

## 5. Matriz de funcionalidades

Legenda: ✅ documentado/estável · ⚠️ depende de comportamento não documentado · ❌ inviável

| Funcionalidade | Status | Observação / alternativa |
|---|---|---|
| Login normal, 2FA, sessão persistente | ✅ | Feitos pelo próprio navegador |
| Múltiplas contas | ✅ | Perfis do navegador e seletor de contas do Chat; a extensão informa o perfil de origem |
| Não armazenar senhas | ✅ | O app nunca vê credenciais |
| Detectar nova mensagem | ⚠️ | Depende de o Chat emitir uma Web Notification. **Validar com a sonda.** |
| Remetente, conteúdo e horário | ⚠️ | Vêm do título e do corpo da notificação; o horário é o do recebimento |
| Abrir a conversa ao clicar | ⚠️ | Reutiliza o `onclick` original; o fallback é só focar a aba do Chat |
| Deduplicação | ✅ | Feita por nós: `tag` + hash (título, corpo) em uma janela de tempo; guardamos só o hash |
| Não notificar as próprias mensagens | ✅ | O próprio Chat não notifica mensagens enviadas pelo usuário |
| Sons por contato, grupo ou espaço | ⚠️ | A chave é o nome exibido no título; sem ID oficial, renomear o espaço quebra a regra |
| Som de menção | ⚠️ | Detectado por heurística (`@nome` no corpo); configurável |
| Silenciar conversa e horário de silêncio | ✅ | Regras locais do app |
| Ocultar conteúdo | ✅ | O toast mostra "Nova mensagem de …" ou só "Nova mensagem" |
| Importar MP3/WAV/OGG, volume, prévia | ✅ | Validação por *magic bytes* + limite de tamanho + cópia para o `userData` |
| Bandeja, autostart, iniciar minimizado | ✅ | APIs do Electron (`Tray`, `app.setLoginItemSettings`) |
| Contador de não lidas | ⚠️ | Lido do título da aba (`chrome.tabs`); o formato não é documentado. O fallback é contar as notificações não abertas |
| Notificar com o app **e** o navegador fechados | ❌ | Sem o navegador aberto não há sessão. Alternativa: o app pode **abrir o PWA minimizado ao iniciar o Windows** |
| Notificar com o navegador fechado (Workspace) | ✅ futuro | "Modo corporativo" via Workspace Events API (seção 2.3) |

## 6. Validação pendente: sonda de notificações

Antes da Fase 4 precisamos **observar** (e não supor) como o Chat dispara as
notificações. A extensão `spikes/notification-probe` registra no console **apenas
metadados**: qual API foi chamada, quais campos vieram preenchidos e o tamanho de
cada um. Nunca o conteúdo.

Perguntas que a sonda responde:

1. O Chat usa `new Notification()` na página, `registration.showNotification()`
   ou push direto no service worker (caso em que nenhum hook dispara, mas o pop-up
   aparece)?
2. A `tag` vem preenchida e é estável por conversa?
3. O título traz o remetente ou o nome do espaço?
4. A notificação parte do frame principal ou de um iframe?

Se a resposta da pergunta 1 for "push no service worker", o plano B é ler o
contador do título da aba e disparar um toast genérico ("Nova mensagem no Google
Chat"), com som. As regras por conversa perdem a precisão nesse caso, e isso
será comunicado ao usuário.

## 7. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| O Google muda o formato das notificações | Hook isolado em um único arquivo, testes com fixtures e modo genérico de fallback |
| Políticas corporativas bloqueiam extensões ou native hosts do usuário (`NativeMessagingUserLevelHosts`) | Instalador com opção "por máquina" (HKLM) e documentação para TI |
| Script no world MAIN pode ser lido ou alterado pela página | O hook não carrega segredos nem permissões; toda validação acontece no lado isolado |
| CSP da página afeta o script no world MAIN | Código autocontido, sem `eval` e sem carregar recursos externos |
| Publicação na Chrome Web Store / Edge Add-ons | Política de privacidade explícita e permissões mínimas (`nativeMessaging`, `tabs` e host `chat.google.com`) |

## 8. Fontes

- [Google — Guidance to developers affected by our effort to block less secure browsers and applications (2020)](https://developers.googleblog.com/2020/08/guidance-for-our-effort-to-block-less-secure-browser-and-apps.html)
- [Google — Upcoming security changes to Google's OAuth 2.0 authorization endpoint in embedded webviews (2021)](https://developers.googleblog.com/2021/06/upcoming-security-changes-to-googles-oauth-2.0-authorization-endpoint.html)
- [ToDesktop — Google OAuth Screen](https://www.todesktop.com/docs/application/google-oauth-screen)
- [Google Chat Help — Install the Google Chat standalone app](https://support.google.com/chat/answer/9455386)
- [Google Workspace — Subscribe to Google Chat events](https://developers.google.com/workspace/events/guides/events-chat)
- [Google Workspace — Choose Workspace Events API scopes](https://developers.google.com/workspace/events/guides/auth)
- [Chrome — Native messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [Microsoft Edge — Native messaging](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/native-messaging)
- [Microsoft Edge — Policy NativeMessagingUserLevelHosts](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/nativemessaginguserlevelhosts)
- [Chrome — Manifest content scripts (`world`)](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)
