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

## Temas

Escuro (padrão), Claro ou "Sincronizar com o Windows". O tema também é repassado
ao Chat: com o tema do Chat em "Padrão do sistema", ele acompanha.

**Tema do Chat (experimental, desligado por padrão):** sobrescreve os tokens de
cor do Material 3 (`--gm3-sys-color-*`) com a paleta do app (`src/main/chat/chat-theme.css`).
Só muda cores. Se os tokens não existirem, nada acontece. Com `GCHAT_DIAG=1`, o
log informa se os tokens estão presentes na página.

**Não verificado:** o efeito do tema dentro do Chat logado. Na página de login,
os tokens não existem, o que é esperado.
