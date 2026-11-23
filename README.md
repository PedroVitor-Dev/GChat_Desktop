<div align="center">

<img src="assets/logo.png" alt="GChat Desktop+" width="120" />

# GChat Desktop+

**O Google Chat no seu Windows, do seu jeito.**

Notificações nativas, um som diferente para cada conversa, horário de silêncio, modo
streamer, várias contas e salas de vídeo do Google Meet, num app escuro e leve que fica
quietinho na bandeja.

[![Versão](https://img.shields.io/github/v/release/PedroVitor-Dev/GChat_Desktop?style=for-the-badge&color=5865f2&label=vers%C3%A3o)](https://github.com/PedroVitor-Dev/GChat_Desktop/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/PedroVitor-Dev/GChat_Desktop/total?style=for-the-badge&color=23a55a&label=downloads)](https://github.com/PedroVitor-Dev/GChat_Desktop/releases)
[![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4?style=for-the-badge&logo=windows11&logoColor=white)](#-instalação)
[![Licença](https://img.shields.io/badge/licen%C3%A7a-GPL--3.0-eb459e?style=for-the-badge)](LICENSE)

[**⬇️ Baixar para Windows**](https://github.com/PedroVitor-Dev/GChat_Desktop/releases/latest)
&nbsp;·&nbsp;
[**🌐 Site**](https://pedrovitor-dev.github.io/GChat_Desktop/)
&nbsp;·&nbsp;
[**📚 Documentação**](#-documentação)

<br />

<img src="docs/images/hero.jpg" alt="GChat Desktop+ — página do projeto" width="900" />

</div>

---

## ✨ Recursos

<table>
<tr>
<td width="50%" valign="top">

### 🔔 Notificações de verdade

Avisos nativos do Windows com remetente e mensagem. O clique abre a conversa, e o
botão **Silenciar conversa** fica direto na notificação. Nada de aviso duplicado.

### 🎵 Sons do seu jeito

Cinco sons originais incluídos, ou **importe MP3, WAV e OGG**. Volume, prévia,
**som por conversa** e **som de menção**. O som do próprio Chat é substituído pelo
seu.

### 🌙 Horário de silêncio

Nada de aviso fora do expediente. **Menções podem furar o silêncio**, se você quiser.

### 📡 Modo streamer

Liga sozinho com **OBS, Streamlabs, XSplit, Twitch Studio, PRISM, vMix e Meld**:
pausa as notificações, esconde o conteúdo e silencia os sons. Selo roxo na barra de
título, como no Discord.

</td>
<td width="50%" valign="top">

### 🎧 Salas de vídeo (Google Meet)

Salas permanentes, como os **canais de voz do Discord**. Crie com um clique, mande o
link aos amigos e fique em chamada **com cronômetro**, mesmo voltando ao Chat.

### 👥 Várias contas

Até **5 contas Google** com sessões isoladas, alternando com `Ctrl + 1…5`. A foto do
seu perfil fica no trilho, com a **bolinha de status e o emoji** do seu status do Chat.
Um clique nela muda o status (Não perturbe, Ausente ou uma frase com emoji e prazo).

### 🧊 Quietinho na bandeja

Fechar a janela mantém o app avisando. Abre com o Windows, inicia minimizado e lembra
a posição, até em outro monitor.

### 🔄 Atualização automática

Novas versões chegam pelo próprio app, conferidas (SHA-512) e instaladas em silêncio,
**sem perder nada**.

</td>
</tr>
</table>

### 🎨 Visual inspirado no Discord

Barra de título própria, trilho de ícones, configurações em tela cheia (`Esc` fecha),
temas **Escuro**, **Claro** e **Sincronizar com o Windows**, e um tema experimental
que recolore o próprio Google Chat.

<div align="center">
<img src="docs/images/notificacoes.jpg" alt="Configurações de notificações" width="32%" />
<img src="docs/images/modo-streamer.jpg" alt="Modo streamer" width="32%" />
<img src="docs/images/aparencia.jpg" alt="Aparência" width="32%" />
</div>

---

## 📥 Instalação

1. Baixe o **[instalador mais recente](https://github.com/PedroVitor-Dev/GChat_Desktop/releases/latest)**
   (`GChat-Desktop-Plus-Setup-x.y.z-x64.exe`, ~116 MB).
2. Abra e siga o assistente em português. Não precisa de administrador.
3. Entre com sua conta Google **na página oficial do Google**. Pronto.

> [!NOTE]
> O instalador ainda não tem assinatura digital paga. Se aparecer **“O Windows protegeu
> o computador”**, clique em **Mais informações → Executar assim mesmo**. O código é
> aberto e o instalador é gerado automaticamente pelo GitHub Actions a partir dele.

> [!TIP]
> A partir da **0.0.2**, as atualizações chegam pelo próprio app (**Configurações →
> Atualizações**). Quem está na 0.0.1 precisa instalar a versão nova uma vez.

**Requisitos:** Windows 10 ou 11, 64 bits.

---

## ⌨️ Atalhos

| Atalho                   | Ação                                                |
| ------------------------ | --------------------------------------------------- |
| `Ctrl` + `,`             | Abrir/fechar as configurações                       |
| `Esc`                    | Fechar as configurações                             |
| `Ctrl` + `1…5`           | Alternar entre contas                               |
| `Ctrl` + `R` / `F5`      | Recarregar o Google Chat                            |
| `Ctrl` + `=` / `-` / `0` | Zoom do Chat                                        |
| `Alt` + `←`              | Voltar no Chat                                      |
| `Ctrl` + `Q`             | Sair do app (fechar a janela só esconde na bandeja) |

---

## 🔒 Privacidade e segurança

- 🔑 **Login só na página oficial do Google.** O app nunca vê nem guarda sua senha;
  verificação em duas etapas, passkeys e SSO corporativo funcionam normalmente.
- 💾 **A sessão fica no seu computador**, criptografada pelo Windows (DPAPI) para o seu
  usuário.
- 🙈 **Nada de mensagens em disco ou em logs.** Para montar o aviso, o app lê apenas o
  título e o texto da notificação que o próprio Chat cria.
- 🖼️ **Do seu perfil, só a foto e o nome** que o Chat mostra, guardados localmente, assim como a frase do seu status. O e-mail não é lido.
- 🌐 **Nada é enviado a outros servidores** além dos do Google (e do GitHub, para
  checar atualizações).
- 🛡️ Electron com `sandbox`, `contextIsolation`, sem Node na página, IPC validado,
  navegação restrita ao Google e permissões em lista branca.
- 🎭 **Não falsifica a identidade do navegador** nem altera o conteúdo das mensagens.

---

## 🧠 Como funciona

O app abre o **Google Chat oficial** em uma janela própria, uma sessão isolada por
conta. Não há extensão, API não oficial ou navegador aberto.

```mermaid
flowchart LR
    subgraph App["GChat Desktop+ (Electron)"]
        Shell["Shell<br/>barra de título · trilho · configurações"]
        Chat["Google Chat<br/>(uma view por conta)"]
        Meet["Google Meet<br/>(salas de vídeo)"]
        NM["Notification Manager<br/>dedup · regras · silêncio · streamer"]
        Sound["Player de sons<br/>(Web Audio)"]
    end
    Chat -- "notificação capturada<br/>(título, texto)" --> NM
    NM --> Toast["🔔 Toast do Windows"]
    NM --> Sound
    Toast -- clique --> Chat
    Updater["🔄 Atualizador"] -- "latest.yml" --> GH["GitHub Releases"]
```

Os detalhes das decisões, inclusive por que o app não usa extensão de navegador, estão
em [docs/decisao-arquitetura.md](docs/decisao-arquitetura.md).

---

## 🛠️ Desenvolvimento

**Stack:** Electron 45 · React 19 · TypeScript · Tailwind CSS 4 · Vite (electron-vite) ·
electron-builder · Vitest

```bash
npm install          # instala as dependências
npm run dev          # roda o app em modo desenvolvimento
npm run check        # typecheck + lint + formatação + testes
npm run build        # build de produção
```

Instalador local (gera em `apps/desktop/release/`):

```bash
npm run dist -w @gchat/desktop
```

<details>
<summary><b>📁 Estrutura do projeto</b></summary>

```
apps/desktop/
├─ src/main/          # processo principal: shell, chat, notificações, sons, salas,
│                     # bandeja, atualizações, perfil, configurações
├─ src/preload/       # pontes mínimas (configurações, Chat, player de áudio)
├─ src/renderer/      # interface React (shell, configurações, salas)
├─ src/shared/        # tipos e validações compartilhados (com testes)
├─ resources/         # ícones, sons e arte do instalador
└─ electron-builder.yml
site/                 # landing page (GitHub Pages)
docs/                 # documentação técnica
```

</details>

<details>
<summary><b>🚀 Publicar uma versão</b></summary>

1. Atualize `version` em `apps/desktop/package.json` (e na raiz) e `VERSION` em
   `site/script.js`.
2. Faça o commit e o push. Depois, crie e envie a tag:

```bash
git tag v0.0.3
git push origin v0.0.3
```

O workflow **Release** roda os testes, gera o instalador e publica no Release o
`.exe`, o `.blockmap` e o `latest.yml`. Os apps instalados recebem a atualização
sozinhos. O site é publicado pelo workflow **Landing page** a cada push em `site/`.

</details>

---

## 📚 Documentação

| Tema                         | Documento                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Arquitetura e decisões       | [decisao-arquitetura.md](docs/decisao-arquitetura.md) · [fase-1-viabilidade.md](docs/fase-1-viabilidade.md) |
| Notificações e modo streamer | [notificacoes.md](docs/notificacoes.md)                                                                     |
| Sons                         | [sons.md](docs/sons.md)                                                                                     |
| Contas e perfil              | [contas.md](docs/contas.md)                                                                                 |
| Salas de vídeo (Meet)        | [salas.md](docs/salas.md)                                                                                   |
| Bandeja e segundo plano      | [segundo-plano.md](docs/segundo-plano.md)                                                                   |
| Visual e atalhos             | [visual.md](docs/visual.md)                                                                                 |
| Atualização automática       | [atualizacoes.md](docs/atualizacoes.md)                                                                     |
| Instalador e publicação      | [instalador.md](docs/instalador.md) · [publicacao.md](docs/publicacao.md)                                   |
| Desenvolvimento              | [desenvolvimento.md](docs/desenvolvimento.md) · [estrutura.md](docs/estrutura.md)                           |

---

## 🗺️ Próximos passos

- [ ] Perfil personalizável estilo Discord (banner com imagem/GIF, bio), público entre
      usuários do app
- [ ] "Não perturbe" com tempo (30 min, 1 h, até amanhã) pela bandeja
- [ ] Pessoas prioritárias que sempre avisam, mesmo no silêncio
- [ ] Miniplayer flutuante da chamada
- [ ] Atalho global para mostrar/esconder o app
- [ ] Assinatura digital do instalador
- [ ] Testes de ponta a ponta automatizados

---

<div align="center">

Criado pelo **[PedroVitor-Dev](https://github.com/PedroVitor-Dev)** 🧙

Licença [GPL-3.0](LICENSE) · Google Chat e Google Meet são marcas do Google LLC.
Este projeto é independente e **não é afiliado ao Google**.

</div>
