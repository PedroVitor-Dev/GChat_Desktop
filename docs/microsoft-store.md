# Microsoft Store (MSIX)

O mesmo app, empacotado em MSIX/AppX para a Microsoft Store. O código detecta que está
rodando como pacote da Store (`process.windowsStore`, `main/system/store.ts`) e ajusta:

| Recurso                        | Instalador do site                   | Versão da Store                                                                   |
| ------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------- |
| Atualizações                   | Atualizador do app (GitHub Releases) | A própria Store instala; a aba Atualizações diz "Atualizado pela Microsoft Store" |
| Abrir com o Windows            | Registro do Windows                  | Indisponível por enquanto (a API comum não vale no MSIX)                          |
| Jump List (Configurações)      | Sim                                  | Não (o executável fica numa pasta protegida)                                      |
| Dados (configurações, sessões) | `%APPDATA%\GChat Desktop+`           | Pasta própria do pacote (perfis separados)                                        |

## Gerar o pacote

```bash
npm run dist:store -w @gchat/desktop
```

Sai em `apps/desktop/release/<versão>/GChat-Desktop-Plus-<versão>-x64-store.appx`. O script
(`scripts/dist-store.mjs`) usa o **makeappx do Windows SDK instalado**: o que o
electron-builder baixa (2019) é bloqueado pelo Windows (`spawn UNKNOWN`). Precisa do
Windows SDK (ex.: 10.0.26100). Logos e blocos: `resources/appx`, gerados por
`npm run appx-assets` a partir de `assets/logo.png` (scale-100/200 e ícones sem placa).

A Store assina o pacote no envio; não é preciso certificado.

## Envio

- **Identidade** (Partner Center → Identidade do produto), já no `electron-builder.yml`:
  `Pedro-Dev.GChatDesktop` / `CN=E8C5DDC8-B67C-49AA-8DFB-62ADC39FBAB2` / `Pedro-Dev`. Store ID
  `9NNF2SXFFHL6`. O `displayName` do pacote é **"GChat Desktop +"** (com espaço), igual ao
  nome reservado; a Store confere.
- **Versão:** na Store o primeiro número não pode ser 0 e o quarto é reservado (o pacote
  sai com `.0`). Por isso o app estreou na Store como **1.0.0**.
- **Política de privacidade:** https://pedrovitor-dev.github.io/GChat_Desktop/privacidade.html
  (também linkada em Configurações → Privacidade).
- **Ficha da loja:** textos prontos em [store-listing.md](store-listing.md) (descrição,
  recursos, palavras-chave, notas para a certificação). Faltam as capturas de tela, com
  uma conta de teste.
- **Pacote:** envie o `.appx` de `apps/desktop/release/<versão>/` em Envio → Pacotes.

## Riscos de aprovação

- **Marca:** "Google Chat"/"Gmail" são marcas do Google. Nome e descrição devem deixar
  claro que o app é independente e não afiliado (o README e o site já dizem isso).
  "GChat" no nome pode ser questionado pela certificação.
- **"App que só abre um site"** (política 10.1): destacar na descrição o que o app faz
  além do Chat (notificações e sons por conversa, Não perturbe, prioritárias, fixados,
  salas com miniplayer e supressor de ruído, temas, várias contas).

Verificado em 25/11/2026: pacote gerado localmente (164 MB) com o manifesto certo
(identidade provisória, versão `0.0.7.0`, logos, `runFullTrust`, cor de fundo).
