# Conversas fixadas

Painel **Fixados** ao lado do Chat, como a lista de canais do Discord: grupos com as
conversas e os espaços do dia a dia, sempre à mão, sem a bagunça da lista do Chat.

## Para o usuário

- **Abrir e fechar:** alfinete no trilho ou o botão "Esconder o painel" no topo do
  painel. Com o painel fechado, o alfinete mostra o total de mensagens novas.
- **Fixar:** abra uma conversa no Chat; o painel oferece **Fixar conversa** no topo. Na
  primeira vez, cria o grupo "Fixados". No menu de um grupo (passar o mouse no título),
  o alfinete fixa direto nele.
- **Organizar:** **Novo grupo**; arraste conversas entre grupos e arraste grupos para
  mudar a ordem; clique no título para recolher; clique duplo (ou ✏️) para renomear;
  clique no ícone para escolher um emoji; "Desafixar" tira da lista. Excluir um grupo
  move as conversas dele para o primeiro outro grupo.
- **Abrir:** um clique, ou **Alt + 1…9** para as primeiras da conta ativa (Ctrl+Alt fica
  livre para o AltGr dos teclados em português).
- **Mensagens novas:** contador vermelho em cada conversa (e no grupo recolhido), com
  marcador à esquerda e nome em negrito; ⭐ nas pessoas prioritárias.
- Cada conta Google tem a sua lista.

## Como funciona (sem mexer no Google Chat)

- **Fixar:** o app lê só o **endereço** da conversa aberta (`chatPathFromUrl`:
  `/app/chat/<id>`) e o **título da página** ("Luana kamila - Chat" → "Luana kamila"),
  pelos eventos de navegação do Electron (`did-navigate-in-page`, `page-title-updated`).
  Nada do conteúdo da página é lido.
- **Abrir:** o Chat é um app de página única; o app troca a conversa pelo endereço
  (`history.pushState` + `popstate`), como um clique num link dele: abre em ~12 ms, sem
  recarregar. Se o Chat ainda não estiver pronto (login, carregando), carrega o endereço.
- **Contador:** vem das notificações que o app já recebe: soma 1 na conversa fixada com o
  mesmo nome (sem diferenciar maiúsculas/acentos), se você não estiver olhando para ela.
  Zera ao abrir pelo painel, ao abrir a conversa no próprio Chat ou ao voltar para a
  janela olhando para ela. Fica só em memória. **Limite:** não sabe de mensagens lidas
  em outro lugar (celular), porque o app não tem acesso ao "não lido" real do Chat.
- **Dados:** `settings.pins` (`shared/pins.ts`): grupos por conta, cada conversa com
  nome, nome original no Chat, endereço e emoji. Só o main grava; o renderer manda a
  lista reorganizada (`pins:save`) e o main mantém endereço e nome original do que ele
  mesmo gravou, então o painel não consegue inventar um endereço. Grupos de uma conta
  removida somem com ela. Limites: 20 grupos e 100 conversas por conta.

Verificado em 23/11/2026: fixar, contador com 2 notificações, abrir pelo painel
(~12 ms, contador zerado), emoji, novo grupo, arrastar entre grupos, Alt+1 e esconder
o painel (o Chat ocupa a largura toda).
