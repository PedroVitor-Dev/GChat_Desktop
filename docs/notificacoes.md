# Notificações

## Fluxo

1. O Google Chat chama `new Notification(título, { body, tag })` na página.
2. O preload (`src/preload/chat.ts`) troca `Notification` por uma versão que lê
   **apenas** título, corpo e tag e os envia ao processo principal. O pop-up padrão
   não é exibido, para não duplicar.
3. O main (`src/main/notifications/`) valida o payload e o frame de origem
   (`https://chat.google.com`) e aplica, nesta ordem:
   1. notificações desligadas;
   2. deduplicação (tag + título + corpo em 10 s; guarda só o hash);
   3. conversa silenciada;
   4. horário de silêncio (aceita faixas que passam da meia-noite);
   5. privacidade (ocultar remetente ou texto).
4. O toast nativo do Windows é exibido com o botão **Silenciar conversa**.
5. Ao clicar no toast, o app foca a janela e devolve o clique à página. O Chat
   então abre a conversa, como faria com a notificação original.

## Garantias

- Se o hook falhar (ponte indisponível), a notificação original do Chat é usada:
  o usuário nunca fica sem aviso.
- O código do Chat continua vendo um `Notification` compatível: `instanceof`,
  `permission`, `requestPermission`, eventos `show`/`click`/`close` e `onclick`.
- Nenhum conteúdo de mensagem vai para log ou disco. A lista de "conversas
  recentes" (só nomes) fica em memória.

## Limitações conhecidas

- **A conversa é identificada pelo nome exibido.** O Chat não expõe um ID estável
  na notificação, então renomear um espaço desfaz o silenciamento.
- **Notificações via service worker** (`registration.showNotification`) são
  capturadas, mas o clique só foca a janela, sem abrir a conversa.
- **Próprias mensagens:** o próprio Chat não notifica o que você envia, então nada
  precisa ser filtrado aqui.
- **Toasts no modo de desenvolvimento** aparecem com o nome "electron.app…". O nome
  correto vem do atalho criado pelo instalador (Fase 10).

## Teste ponta a ponta

Sem precisar de login: um cliente do DevTools Protocol intercepta
`https://chat.google.com/__e2e`, serve uma página de teste e cria notificações.
Validado em 23/11/2026: captura, `instanceof`, evento `show`, deduplicação e
duas conversas distintas, todas exibidas.
