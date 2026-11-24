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

## Notificações perdidas (Caixa de entrada)

Botão de caixa de entrada à direita da barra de título, com contador, como no Discord.
Lista o que **você não viu**:

- o que chegou com a janela **escondida, minimizada ou sem foco** ("Enquanto você
  estava fora"; o aviso foi mostrado, mas você pode ter perdido);
- o que foi **barrado** pelo Não perturbe, pelas notificações pausadas, pelo horário de
  silêncio ou pelo modo streamer.

Conversas silenciadas à mão ficam de fora. Abas "Tudo" e "Menções e prioritárias";
abrir a lista zera o contador; clicar num item abre a conversa (primeiro pela conversa
fixada com o mesmo nome; senão, devolvendo o clique à notificação na página do Chat,
como no toast) e tira o item da lista; dá para remover um item ou limpar tudo.

**Privacidade:** fica **só na memória** do processo principal (`NotificationHistory`,
no máximo 200 itens) e **some ao fechar o app**. Nada vai para disco ou logs. A lista
respeita "Mostrar remetente" e "Mostrar texto" e esconde tudo ao transmitir com
"Esconder conteúdo" ligado.

Para o clique funcionar mais tarde, o preload do Chat não esquece a notificação quando
o Chat a fecha (registro dos últimos 100 avisos, também só em memória).

Verificado em 23/11/2026: 2 avisos no Não perturbe (um com menção) e 1 com a janela
minimizada entraram com o motivo certo; a lista abriu com o contador zerando; abrir
pela conversa fixada e pelo clique do Chat (com a notificação já fechada) funcionou.

## Pessoas prioritárias (VIP)

Conversas que **sempre avisam**, mesmo no **Não perturbe** (com prazo ou "até eu
reativar"), no **horário de silêncio** e no **modo streamer**, com um **som próprio**.

- **Onde:** Configurações → Notificações → Pessoas prioritárias (marcar quem escreveu
  recentemente, inclusive durante uma pausa, ou digitar o nome como aparece no Chat);
  o som fica em Sons → "Som das pessoas prioritárias" (padrão: Dois toques).
- **Como:** a conversa é identificada pelo nome exibido no título da notificação, a
  mesma chave das conversas silenciadas (`notifications.vipConversations`). O aviso
  chega com ⭐ no título. Ordem do som: VIP > menção > som da conversa > padrão.
- **O que ainda vale para VIP:** "Esconder conteúdo" do modo streamer (a tela continua
  sem nome/texto ao transmitir) e "Sons" desligado. O som da VIP toca mesmo com o
  modo streamer silenciando os demais e com o Chat em Não perturbe.
- **Prioritária vence silenciada:** a mesma conversa não fica nas duas listas; silenciar
  pelo botão da notificação tira a conversa das prioritárias.
- **Limite:** se o próprio Google Chat estiver em "Não perturbe" (menu de status), ele
  não cria notificações, e o app não tem o que mostrar.

Verificado em 23/11/2026 com o app em Não perturbe: a conversa VIP apareceu (som
"Dois toques") e a outra foi barrada (`paused`).

## Não perturbe (com tempo)

Como no Discord: pausa avisos **e sons** por **30 min, 1 h, 8 h, até amanhã (8:00)** ou
**até eu reativar**, e volta sozinho.

- **Onde:** sino no trilho (acima da foto; abre um menu nativo), submenu "Não perturbe"
  na bandeja, cartão em Configurações → Notificações. Pausado, aparece o selo vermelho
  "Não perturbe até 14:30" na barra de título (clique abre o mesmo menu), o sino fica
  cortado e o ícone da bandeja ganha a bolinha vermelha com traço branco.
- **Como:** o fim da pausa fica em `notifications.pausedUntil` (epoch ms), então
  sobrevive a reiniciar o app. "Até eu reativar" é o antigo "Pausar notificações"
  (`notifications.enabled = false`). `DndService` (`main/system/dnd.ts`) agenda a volta
  e reconfere ao acordar da suspensão ou desbloquear a tela; um prazo vencido com o app
  fechado é limpo na abertura. O Notification Manager descarta com o motivo `paused`.
- "Até amanhã" vai até as 8:00 da próxima manhã; de madrugada (antes das 5:00), é a
  manhã do mesmo dia. Regras puras e testadas em `shared/dnd.ts`.
- É independente do "Não perturbe" do próprio Google Chat (menu de status da foto), que
  silencia só os sons do app para aquela conta.

## Modo streamer

Como no Discord: protege a tela enquanto você transmite ou grava.

- **Liga sozinho** enquanto um programa de transmissão estiver aberto: OBS Studio,
  Streamlabs, XSplit, Twitch Studio, PRISM Live Studio, vMix e Meld Studio. A
  detecção lê só os nomes dos processos (`tasklist`) a cada ~8 s, e só roda com
  "Ligar automaticamente" ativo. Gravadores que ficam sempre abertos (GeForce
  Experience, Xbox Game Bar, Medal) ficam de fora de propósito.
- **Também liga à mão:** página "Modo streamer" nas configurações, ou menu da
  bandeja.
- **Desligar durante uma transmissão detectada** vale até o programa fechar
  (não religa sozinho no meio da live).
- **Enquanto ativo** (cada item é configurável): pausa as notificações (padrão);
  ou, se continuarem, esconde o remetente e o texto e silencia os sons.
- **Indicadores:** selo roxo "MODO STREAMER" na barra de título (clique desliga) e
  aviso no tooltip da bandeja.
