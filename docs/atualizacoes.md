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

**Não verificado:** a instalação silenciosa e a reabertura depois de "Reiniciar e
atualizar". Isso só dá para testar com duas versões publicadas de verdade.
