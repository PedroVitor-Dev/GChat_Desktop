# Atualização automática

O app usa o **electron-updater** com os **Releases do GitHub** como fonte.

## Para o usuário (Configurações → Atualizações)

- **Buscar atualizações:** verifica na hora.
- **Atualizar automaticamente** (ligado por padrão): verifica 15 s depois de abrir
  e a cada 6 h e baixa em segundo plano. Desligado, você baixa pelo botão.
- **Versão pronta:** aparecem o botão "Reiniciar e atualizar", o selo verde
  "Reiniciar para atualizar" na barra de título, um aviso do Windows e um item no
  menu da bandeja. Se você só sair do app, a atualização é instalada ao fechar.
- **Instalação silenciosa:** mantém a pasta, as configurações, os sons e os logins
  (`%APPDATA%\GChat Desktop+`).
- **Segurança:** o instalador baixado tem o SHA-512 conferido com o `latest.yml`
  do Release antes de ser usado.

## Novidades de cada versão

Fonte única: `apps/desktop/src/shared/changelog.json` (versão, data e destaques, da mais
nova para a mais antiga).

- **No app (Configurações → Atualizações):** "Novidades da versão X" (a instalada) e
  "Versões anteriores". Com uma atualização encontrada/baixada, aparece antes "O que vem
  na versão Y", lido das notas do Release no GitHub (`highlightsFromReleaseNotes`: só os
  itens da primeira lista, sem HTML, com limite de tamanho).
- **No GitHub:** o workflow Release gera o corpo do Release com
  `apps/desktop/scripts/release-notes.mjs <tag>` (Novidades + Instalação). Se faltar a
  versão no changelog, o passo falha antes de publicar.
- **Teste:** `changelog.test.ts` exige novidades para a versão do `package.json` e as
  versões em ordem, sem repetir.

## Para publicar uma versão

1. Atualize `version` em `apps/desktop/package.json` (e na raiz) e `VERSION` em
   `site/script.js`.
2. Faça o commit e o push. Depois:

```bash
git tag v0.0.2
```

```bash
git push origin v0.0.2
```

O workflow `release.yml` gera o instalador e publica no Release o `.exe`, o
`.blockmap` (download diferencial) e o **`latest.yml`**, que é o que o app
consulta. O build local nunca publica (`--publish never`).

## Importante: quem tem a 0.0.1

A 0.0.1 não tem o atualizador, então precisa instalar a próxima versão
**manualmente uma vez**. A partir dela, as atualizações chegam pelo app.

## Testes (23/11/2026)

Com o app empacotado (`electron-builder --dir`, sem gerar instalador):

1. **Contra o GitHub real:** "Ainda não há uma versão publicada com atualização
   automática" (o Release v0.0.1 é anterior ao atualizador e não tem
   `latest.yml`).
2. **Contra um servidor local** (`GCHAT_UPDATE_FEED=http://127.0.0.1:…`, só para
   testes) anunciando uma 0.0.2: encontrou, baixou, conferiu o SHA-512 e mostrou
   "Versão 0.0.2 pronta para instalar", com o selo na barra de título. A
   instalação não foi executada, de propósito.

### Teste real de ponta a ponta (23/11/2026)

Com o app 0.0.1 (já com o atualizador) instalado no Windows e o **Release v0.0.2
publicado pelo workflow**, o app encontrou a 0.0.2, baixou e conferiu o SHA-512.
Em "Reiniciar e atualizar", ele instalou em silêncio e reabriu como **0.0.2**,
mantendo o login, as contas, as salas, o som de menção e os sons importados.

## Configurações entre versões (downgrade e versões antigas)

Cada versão normaliza o `settings.json` e só conhece os campos da época dela. Antes da
0.0.6, abrir o perfil numa versão mais antiga **apagava** o que veio depois (salas, modo
streamer, temas, fixados…). Agora (`shared/settings-compat.ts`,
`main/store/settings-store.ts`):

- **Campos desconhecidos são preservados** ao gravar, em qualquer nível, inclusive
  dentro de listas com `id` (salas, contas, grupos). Voltar de uma versão futura para
  esta não perde nada.
- **Marca e cópia completa:** cada gravação leva `_writer` (`app`, `version`, `savedAt`)
  e também vai para `settings.full.json`.
- **Recuperação:** se o `settings.json` aparecer **sem a marca**, quem gravou foi uma
  versão antiga (0.0.1–0.0.5). O app devolve da cópia **só os campos que sumiram**; o
  que a versão antiga mudou (ex.: ligar "abrir com o Windows") fica valendo. Itens que
  saíram de uma lista conhecida não voltam.
- **Arquivo corrompido** usa a cópia completa (o original vai para `settings.json.bak`).
  **Arquivo apagado** recomeça do padrão (é o jeito de "resetar" o app).
- **Regra do projeto:** nenhum campo das configurações é opcional ("vazio" é `null`, `[]`
  ou `{}`), para "ausente" sempre significar "a versão que gravou não conhece". Um teste
  garante isso.

Verificado em 24/11/2026 no perfil real (com backup): a versão nova gravou a marca e a
cópia; uma 0.0.1 simulada regravou o arquivo sem salas, modo streamer, fixados e tema;
ao reabrir, tudo voltou e a mudança feita na versão antiga continuou valendo.
