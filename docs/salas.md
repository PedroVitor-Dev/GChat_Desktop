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

## Espiar outra sala durante uma chamada

Clicar em outra sala já em chamada **não sai da chamada atual**: a sala nova abre para
espiar, na tela de espera do Meet ("Pronto para participar?"), que mostra quem já está
lá. Uma faixa em cima diz "Espiando Sala B · você continua em Sala A", com:

- **Trocar para esta sala:** sai da Sala A e a Sala B vira a chamada (depois é só clicar
  em "Participar agora" no Meet);
- **Voltar para Sala A:** fecha a sala espiada e volta para a chamada.

Na lista, a sala espiada aparece com um olho. O Meet não informa quem está numa sala
sem abri-la (só pela API do Workspace), por isso a espiada abre a tela de espera dele,
que não entra na chamada. Implementação: `startPreview`, `switchToPreview` e
`closePreview` em `app-shell.ts`, com uma segunda view do Meet abaixo da faixa
(`SHELL_LAYOUT.previewBarHeight`).

Verificado em 24/11/2026: em Bate-papo, clicar em "Teste com Luana" manteve a chamada e
abriu a espiada; Voltar, espiar de novo, Trocar e Sair funcionaram, sem páginas do
Meet sobrando.
