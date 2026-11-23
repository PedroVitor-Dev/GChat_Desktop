# Sons

## Escolha do som de cada notificação

1. Sons desligados (`Tocar sons`): nenhum som; o toast aparece em silêncio.
2. **Menção** com som de menção definido → som de menção.
3. **Som da conversa**, se configurado.
4. **Som padrão**.

`Som padrão do Windows` deixa o próprio toast tocar o som do sistema. Os demais
são tocados pelo app, e o toast fica silencioso para não somar dois sons.

## Menções

O Google Chat não marca menções na notificação. O usuário informa as palavras que
o identificam (ex.: `@Pedro`), procuradas no texto sem diferenciar maiúsculas nem
acentos. Opcionalmente, menções furam o horário de silêncio.

## Sons predefinidos

Gota, Sino, Pop, Dois toques e Suave: sintetizados por
`apps/desktop/scripts/generate-sounds.mjs` (originais, sem licença de terceiros).

## Importação

- Escolha do arquivo no diálogo nativo do sistema. O renderer nunca envia caminhos.
- Validações: extensão MP3/WAV/OGG, até 5 MB, **conteúdo** conferido pelos
  primeiros bytes (a extensão precisa bater), decodificação real e até 15 s de
  duração.
- O arquivo é copiado para `%APPDATA%\GChat Desktop+\sounds\<uuid>.<ext>`. O nome
  original serve só para exibição.
- Ao remover um som, as conversas que o usavam voltam ao som padrão.

## Reprodução

Uma janela oculta e isolada toca os sons com Web Audio. Ela guarda em cache os
sons já decodificados e aplica o volume em curva quadrática. Entre dois sons há um
intervalo mínimo de 1,2 s, e nenhum toque passa de 10 s. Se um som não puder ser
lido, toca "Gota".

## Verificação (23/11/2026)

- Prévia e notificações capturadas tocaram de fato: o painel WebAudio do DevTools
  registrou o contexto `running` e a criação de `AudioBufferSource` + `Gain` a
  cada toque.
- A prévia com id inválido é recusada pelo IPC.
- **Não testado:** o fluxo de importação pelo diálogo de arquivo, que depende de
  interação manual.
