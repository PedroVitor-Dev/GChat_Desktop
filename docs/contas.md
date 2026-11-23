# Várias contas

- Até **5 contas**. Cada uma tem uma partição própria do Chromium
  (`persist:account-N`): cookies, login e armazenamento ficam isolados.
- O usuário dá **nome** à conta (o app não lê e-mail nem dados da conta Google). No
  trilho, com uma conta aparece o logo; com várias, as iniciais sobre a cor da conta.
- **Todas as contas ficam carregadas** em segundo plano para receber notificações.
  Só a ativa aparece. Cada conta usa memória extra (uma página do Chat).
- **Notificações** sabem de qual conta vieram. Com mais de uma conta, o toast diz
  "Remetente · Conta"; o clique abre a conta certa, e o selo de não lidas é por
  conta.
- **Atalhos:** `Ctrl + 1…5` alterna entre as contas.
- **Sair da conta:** apaga cookies, armazenamento e cache da partição e volta ao
  login, mantendo a entrada no trilho.
- **Remover:** tira do trilho e apaga os dados da sessão (com confirmação). A
  última conta não pode ser removida; use "Sair da conta".
- A lista de contas fica nas configurações, mas só o processo principal pode
  alterá-la (pelos canais `accounts:*`). Um patch vindo da interface é ignorado.

## Verificação (23/11/2026)

Pela interface: o modal "Adicionar conta" criou "Trabalho" (partição
`account-2`); o trilho mostrou PR/TR com a nova ativa e o título "… · Trabalho".
A tela Contas listou as duas, e remover com confirmação voltou a uma conta, com o
botão de remover desativado.

**Não verificado:** a atribuição de notificações entre duas contas logadas (a
lógica foi revisada, mas o teste de ponta a ponta usou uma conta só).

## Foto e nome do Google

O preload do Chat lê, no botão da conta (canto superior do Chat), **só** a foto e
o nome exibidos. O e-mail, que também está no rótulo do botão, é descartado ali
mesmo. A foto é baixada em 128 px pela sessão da própria conta e salva como data
URL em `%APPDATA%\GChat Desktop+\profiles\<conta>.json`. Aparece embaixo do trilho (perfil da conta ativa, acima da engrenagem; o clique abre Configurações → Contas) e na tela Contas, e é apagada ao sair da conta ou remover a conta.

O modelo (`shared/profile.ts`) já tem os campos do futuro perfil estilo Discord
(banner com imagem/GIF, cor, bio e status), ainda sem uso. Um perfil **público**
exigirá servidor e login com Google.

**Status com frase:** use o recurso nativo do Google Chat ("Ativo ▾" → "Adicionar
um status"), que todos os contatos veem, inclusive no navegador e no celular.
