# Bandeja e segundo plano

## Comportamento

- **Fechar (✕) esconde na bandeja** (padrão). O Chat continua carregado e as
  notificações e os sons funcionam. Na primeira vez, um aviso explica onde o app
  ficou. Desligável em Configurações → Geral.
- **Sair de vez:** "Sair do GChat Desktop+" no menu da bandeja, ou `Ctrl + Q`.
- **Abrir de novo:** clique no ícone da bandeja, no atalho ou na notificação. A
  janela volta e o contador de não lidas é zerado.
- **Abrir com o Windows** (só no app instalado): registra a inicialização com
  `--hidden`. Com "Iniciar minimizado na bandeja" ligado, nenhuma janela aparece e
  o Chat carrega em segundo plano. Se o Windows bloquear a inicialização pelo
  Gerenciador de Tarefas, a tela Geral avisa.
- **Jump List** (botão direito no ícone da barra de tarefas): "Configurações".
- **Janela:** posição, tamanho e estado maximizado são lembrados, inclusive em
  outro monitor. Se o monitor sumir, a janela volta centralizada na principal.
- A view do Chat roda sem _background throttling_, para que mensagens e
  notificações não atrasem com a janela oculta.

## Menu da bandeja

Abrir Google Chat · Configurações · Pausar notificações · Tocar sons · Sair.
O ícone ganha uma bolinha vermelha quando há mensagens novas, e o tooltip mostra
quantas.

## Limitações

- Com o app **totalmente encerrado** não há notificações: o Google Chat precisa
  estar aberto (mesmo que só na bandeja).
- No Windows 11, ícones novos ficam na área oculta da bandeja (^). Para deixá-lo
  sempre visível: Configurações do Windows → Personalização → Barra de tarefas →
  Outros ícones da bandeja.

## Verificação (23/11/2026)

- O ✕ escondeu a janela, o processo continuou ativo, o aviso foi marcado como
  exibido e a posição da janela foi salva.
- Três notificações com a janela oculta viraram contador 3. Abrir de novo
  (segunda instância) mostrou a janela e zerou o contador.
- `--hidden` iniciou sem janela visível, com o Chat carregado.
- **Não verificado:** o ícone e o menu da bandeja (a área da bandeja não é
  acessível à automação usada), a Jump List e a inicialização com o Windows (só
  funcionam no app instalado; serão testadas na Fase 10).
