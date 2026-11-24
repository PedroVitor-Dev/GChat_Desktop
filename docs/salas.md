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

## Tela da chamada: lista, modo foco e tela cheia

Durante uma chamada, na tela das Salas, a barra de título ganha três botões (ao lado do
selo da chamada):

- **Esconder/mostrar a lista de salas** (também pelo botão no topo da lista): o vídeo
  ocupa o espaço dela.
- **Modo foco:** só o vídeo, sem trilho nem lista; sai com **Esc** ou pelo mesmo botão.
- **Tela cheia** do Windows, sempre com o modo foco; sai com **Esc**.

Ao sair da chamada, o trilho volta e a tela cheia é desfeita.

## Miniplayer

Saindo da tela da chamada (indo para o Chat, minimizando ou mandando para a bandeja),
a chamada vai para uma **janelinha flutuante, sempre por cima**, no canto inferior
direito do monitor: nome da sala, tempo de chamada e os botões **Voltar para a
chamada**, **Sair da chamada** e **Fechar o miniplayer** (a chamada continua; volta pelo
selo da barra de título; reabre sozinho na próxima chamada). Dá para arrastar pela faixa
de cima e redimensionar; posição e tamanho valem até fechar o app.

**A chamada não cai nem recarrega:** é a mesma view do Meet que muda de janela
(`main/shell/miniplayer.ts`) e volta. No mini o Meet é mostrado com zoom 0,67 (layout de
tela maior, encolhido) e volta ao normal ao sair. A faixa de cima é o renderer do app
na rota `#mini`.

Cuidados: ao entrar numa sala, a tela das Salas é definida antes de mostrar a janela; e
durante a transição de tela cheia o app ignora os eventos de "janela oculta" (senão a
chamada iria para o mini e voltaria).

Verificado em 24/11/2026: esconder a lista, modo foco (Esc sai), tela cheia (Esc sai);
mini ao ir para o Chat (mesma página do Meet, sem recarregar) e ao minimizar; Voltar,
Fechar o mini e Sair da chamada.

## Supressor de ruído (opcional)

Tira ventilador, teclado, latido e barulho de rua do **seu microfone** nas salas.
Desligado por padrão; liga no botão de onda sonora do cartão "Em chamada" ou em
Configurações → Sons → Chamadas.

- **Modelo:** GTCRN (rede neural leve de realce de fala, MIT) do pacote
  `@sapphi-red/web-noise-suppressor` **0.4.1** (versão fixada, publicada há meses; a 0.4.2
  saiu dias antes e foi evitada por cautela). WASM de ~196 KB, a 48 kHz, num AudioWorklet.
- **Como entra:** o Meet agora tem um preload (`preload/meet.ts`) que envolve só
  `navigator.mediaDevices.getUserMedia`. Ligado, o áudio pedido pelo Meet passa pelo
  filtro e o Meet recebe a faixa limpa, que se apresenta como o mesmo microfone (nome e
  ajustes). O cancelamento de eco do navegador continua antes do filtro. Desligado na
  hora de pegar o microfone, o Meet recebe o microfone puro (custo zero).
- **Ao vivo:** desligar no meio da chamada vale na hora (o áudio passa direto); ligar
  vale para o microfone que o Meet pegar depois (ao entrar na sala ou trocar o microfone).
  O estado chega à página por eventos próprios (`gchat-noise-on/off`), porque o Meet tem
  ouvintes de `postMessage` que param a propagação.
- **Arquivos:** servidos do disco do app pelo esquema `gchat-audio://` (privilegiado,
  `bypassCSP`, só os dois arquivos do filtro), porque a CSP do Meet bloqueia scripts de
  fora. Nada é baixado da internet e nenhum áudio sai do computador por causa do filtro.
- **Conta Google:** o filtro só muda o som do próprio microfone, no computador, como
  Krisp, NVIDIA Broadcast ou extensões de supressão para o Meet. Não toca em login,
  cookies nem na API do Google, e não automatiza nada no Meet.
- **Falha:** qualquer erro no filtro devolve o microfone puro; a chamada segue.

Verificado em 24/11/2026: ligado, o microfone entregue ao Meet é o filtrado (com o nome
do headset); desligado, o puro; ligar/desligar pelo app chega à página na hora. **A
medição de qualidade (ruído com e sem filtro) ficou pendente:** o headset estava
mandando silêncio total (desligado ou mudo).
