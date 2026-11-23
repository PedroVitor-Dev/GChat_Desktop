# Salas de vídeo (Google Meet)

Salas permanentes no estilo dos canais de voz do Discord, usando o **Google Meet
oficial** dentro do app, na sessão da conta (já logada). Não usa API nem pede
credenciais extras.

## Uso

O trilho tem destinos, e só um fica ativo por vez (como servidores no Discord):

- **Ícone da conta:** o Google Chat em tela inteira.
- **Ícone de fone:** a área **Salas**, com a lista à esquerda (como os canais de
  voz) e, à direita, a chamada ou, sem chamada, o saguão com os cartões das salas
  ("Entrar" e copiar o link).
- **Em chamada e no Chat:** a chamada continua. O selo verde com o tempo na
  barra de título e a bolinha verde no fone mostram isso, e o clique no selo volta
  para a chamada.
- **Criar sala (+):** o app abre `meet.new` numa página oculta da conta ativa,
  captura o código da reunião e salva com o nome escolhido. O link é copiado e
  você entra na sala. Em "Já tenho um link", salva a sala de outra pessoa.
- **Card "Em chamada"** (embaixo da lista): cronômetro, "Convidar: copiar link" e
  sair. Microfone, câmera e tela ficam nos controles do próprio Meet.
- **Na lista:** passe o mouse para copiar o link, renomear ou excluir.

## Como funciona

- Os links do Meet são permanentes. A sala é só o código salvo nas configurações
  (`rooms`), que apenas o processo principal altera.
- A chamada roda numa `WebContentsView` própria, sem preload (o app não mexe na
  página do Meet). Sair pela interface do Meet ("voltar à tela inicial") encerra a chamada no
  app.
- Permissões: câmera e microfone para o Chat e o Meet; compartilhar a tela só para
  `meet.google.com`.

## Limites

- **Não dá para ver quem está numa sala antes de entrar** (como no Discord). Isso
  exigiria a API do Meet com OAuth e um projeto no Google Cloud. Dentro da
  chamada, o Meet mostra os participantes.
- O cronômetro conta desde que você abriu a sala (inclui a tela de entrada).

## Verificação (23/11/2026)

Sala criada de verdade via `meet.new` (~2,7 s), sem aviso de navegador não
suportado. O Meet abriu na tela de entrada, já logado. Voltar ao Chat manteve a chamada e o cronômetro.
Sair encerrou a chamada.

**Não verificado:** uma chamada com outra pessoa, compartilhamento de tela e
câmera (não havia câmera no teste).
