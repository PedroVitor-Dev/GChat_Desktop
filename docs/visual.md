# Visual e experiência (inspirados no Discord)

O app adota a linguagem visual e a ergonomia do Discord **sem** usar nada da marca
dele (nome, logotipo, fontes proprietárias ou arte). As cores e os componentes são
próprios.

## Janela principal (`src/main/shell/app-shell.ts` + `src/renderer/src/shell/`)

- **Barra de título própria** (32 px), com o logo e o título da conversa atual. Os
  botões minimizar/maximizar/fechar são os nativos do Windows (`titleBarOverlay`),
  então o _snap layout_ do Windows 11 continua funcionando.
- **Trilho à esquerda** (72 px), com ícones redondos que viram quadrados
  arredondados no hover, um indicador lateral (ponto no hover, barra quando ativo),
  tooltips escuros e um selo vermelho de não lidas. Hoje há a conta do Chat, o "+"
  (várias contas, Fase 7) e as configurações.
- **Google Chat numa `WebContentsView`** isolada, com canto arredondado. Durante o
  primeiro carregamento aparece uma tela de espera com o logo e uma dica (sem
  flash branco).
- **Não lidas:** selo no trilho, bolinha vermelha no ícone da barra de tarefas e a
  janela piscando, enquanto você não está olhando o Chat.

## Configurações em tela cheia

Como as configurações de usuário do Discord: a navegação fica à esquerda, alinhada
à direita, com o título "CONFIGURAÇÕES DO APP"; o conteúdo, de até 740 px, fica à
direita; o botão ✕ com "ESC" fecha. Há animação de entrada, interruptores verdes
com ícone e campos escuros sem borda.

## Atalhos

| Atalho                               | Ação                       |
| ------------------------------------ | -------------------------- |
| `Ctrl + ,`                           | Abrir/fechar configurações |
| `Esc`                                | Fechar configurações       |
| `Ctrl + R` / `F5`                    | Recarregar o Google Chat   |
| `Ctrl + =` / `Ctrl + -` / `Ctrl + 0` | Zoom do Chat               |
| `Alt + ←`                            | Voltar no Chat             |

## Temas (Configurações → Aparência)

Tudo é calculado em `src/shared/theme.ts` (funções puras, com testes): o main usa
para a janela e o Chat, e manda o resultado pronto (`ResolvedTheme`) no estado do
shell; o renderer só aplica as variáveis `--color-*` (`renderer/src/theme-vars.ts`).

- **Prévia ao vivo:** miniatura do app com o tema atual no topo da tela.
- **Tema base:** Escuro (padrão), Claro ou "Sincronizar com o Windows".
- **Iron Ball** (antes "Cibus"): uma esfera de metal laranja. Destaque laranja
  (`#f26522`) também nos interruptores e botões, fundo escuro quente em degradê para o
  laranja queimado e miniatura com a esfera (brilho, reflexo na borda e sombra, em CSS:
  `IRON_BALL`). **Animação:** bolinhas metálicas sobem pelo trilho e atravessam a barra
  de título (`ThemeParticles`, só CSS com transform/opacity). Pode ser desligada em
  Aparência ("Animação do tema") e some com "Efeitos de animação" desligado no Windows.
  Quem tinha o Cibus escolhido continua com o tema (`RENAMED_PRESETS`).
- **Temas coloridos:** Meia-noite, Aurora, Oceano, Crepúsculo, Ametista, Floresta,
  Brasa, Grafite (escuros) e Algodão-doce, Menta, Areia (claros). Cada um tem base,
  cor de destaque, tinta e, opcionalmente, degradê.
- **Personalizado:** base escura/clara, cor de destaque (8 sugestões ou qualquer cor),
  cor do fundo com intensidade e degradê com segunda cor. A paleta é gerada
  tingindo as camadas cinza do app (mais tinta no trilho, menos no conteúdo); os
  textos não são tingidos. Um teste garante contraste ≥ 4,5 em todos os temas prontos.
- **Janela:** Sólido, **Mica** ou **Acrílico** (`BrowserWindow.setBackgroundMaterial`,
  Windows 11) e **Transparência** (0–80%). Com material ou degradê, o trilho e a barra
  de título mostram o fundo e os painéis ficam translúcidos por cima; a barra de
  título nativa fica transparente. No Windows 10 a janela continua sólida.
- O tema é repassado ao Chat (`nativeTheme.themeSource`): com o tema do Chat em
  "Padrão do sistema", ele acompanha o escuro/claro do tema do app.

**Tema do Chat (experimental, desligado por padrão):** sobrescreve os tokens de
cor do Material 3 (`--gm3-sys-color-*`) com a **paleta do tema escolhido**
(`chatThemeCss` em `shared/theme.ts`), e é reaplicado quando o tema muda. Só muda
cores. Se os tokens não existirem, nada acontece. Com `GCHAT_DIAG=1`, o log informa
se os tokens estão presentes na página.

Verificado em 23/11/2026: temas prontos, personalizado e Acrílico no Windows 11 (o
papel de parede aparece desfocado atrás do trilho e da barra de título).
