# Sonda de notificações (Fase 1)

Extensão de diagnóstico **descartável**. Ela responde como o Google Chat dispara as
notificações (ver `docs/fase-1-viabilidade.md`, seção 6). Registra apenas
metadados, nunca o texto das mensagens.

## Como usar (Chrome ou Edge)

1. Abra `chrome://extensions` (ou `edge://extensions`) e ative o **Modo do desenvolvedor**.
2. Clique em **Carregar sem compactação** e selecione esta pasta (`spikes/notification-probe`).
3. Abra o Google Chat (aba normal ou o app instalado) e recarregue a página.
4. Abra o DevTools (`Ctrl+Shift+I`) → **Console** e filtre por `GChat Probe`.
   - No campo de contexto do console (o padrão é "top"), verifique também os iframes.
5. Peça para alguém enviar uma mensagem (ou mande de outra conta) **com o Chat em
   segundo plano**: outra aba em foco ou a janela minimizada.
6. Repita com uma mensagem **com menção** (`@você`) e uma em **espaço/grupo**.

## O que anotar

- Apareceu o pop-up nativo? Apareceu alguma linha `api: ...` no console?
  - **Pop-up sem nenhuma linha** = o push vem direto do service worker (plano B).
- Qual `api` e qual `frame` (top/iframe)?
- Quais campos aparecem em `options` (por exemplo `body`, `tag`, `icon`, `data`)?
- A `tag` tem o mesmo tamanho em mensagens da mesma conversa?
- A saída de `serviceWorker.getRegistrations`.

Cole o resultado do console. Ele não contém o conteúdo das mensagens.
