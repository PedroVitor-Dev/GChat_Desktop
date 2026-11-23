# Salas de vídeo (Google Meet)

Salas permanentes no estilo dos canais de voz do Discord, usando o **Google Meet
oficial** dentro do app, na sessão da conta (já logada). Não usa API nem pede
credenciais extras.

## Uso

- **Ícone de fone no trilho:** abre o painel "Salas", ao lado do Chat.
- **Criar sala (+):** o app abre `meet.new` numa página oculta da conta ativa,
  captura o código da reunião criada (ex.: `abc-defg-hij`) e salva com o nome
  escolhido. O link é copiado para a área de transferência e você entra na sala.
- **"Já tenho um link":** salva a sala de outra pessoa a partir do link.
- **Clique na sala:** entra. O Meet abre na área principal, na tela de entrada
  ("Pronto para participar?").
- **Card "Em chamada"** (embaixo do painel): cronômetro, microfone (`Ctrl+D`),
  câmera (`Ctrl+E`), alternar entre a chamada e o Chat (a chamada continua) e
  sair.
- **Barra de título:** selo verde com a sala e o tempo. O clique volta para a
  chamada.
- **Na sala:** passe o mouse para copiar o link, renomear ou excluir.
- **Compartilhar tela** no Meet: compartilha a tela principal, com o áudio do
  sistema.

## Como funciona

- Os links do Meet são permanentes. A sala é só o código salvo nas configurações
  (`rooms`), que apenas o processo principal altera.
- A chamada roda numa `WebContentsView` própria, sem preload (o app não mexe na
  página do Meet). Microfone e câmera são alternados pelos atalhos oficiais do
  Meet. Sair pela interface do Meet ("voltar à tela inicial") encerra a chamada no
  app.
- Permissões: câmera e microfone para o Chat e o Meet; compartilhar a tela só para
  `meet.google.com`.

## Limites

- **Não dá para ver quem está numa sala antes de entrar** (como no Discord). Isso
  exigiria a API do Meet com OAuth e um projeto no Google Cloud. Dentro da
  chamada, o Meet mostra os participantes.
- O cronômetro conta desde que você abriu a sala (inclui a tela de entrada).
- Os botões de microfone e câmera não mostram o estado atual. O próprio Meet
  mostra.

## Verificação (23/11/2026)

Sala criada de verdade via `meet.new` (~2,7 s), sem aviso de navegador não
suportado. O Meet abriu na tela de entrada, já logado. O botão de microfone
desligou o microfone do Meet. Voltar ao Chat manteve a chamada e o cronômetro.
Sair encerrou a chamada.

**Não verificado:** uma chamada com outra pessoa, compartilhamento de tela e
câmera (não havia câmera no teste).
