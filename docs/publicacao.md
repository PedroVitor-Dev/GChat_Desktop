# Publicação: landing page e instalador

## Landing page (GitHub Pages)

- Código em `site/` (HTML, CSS e JS puros, sem build). Fontes: **Unbounded**
  (títulos) e **Manrope** (texto), do Google Fonts.
- O workflow `.github/workflows/pages.yml` publica a pasta `site/` a cada push na
  `main` que altere `site/**`.
- **Configuração única no GitHub:** Settings → Pages → Build and deployment →
  Source = **GitHub Actions** (em vez de "Deploy from a branch").
- Endereço: `https://pedrovitor-dev.github.io/GChat_Desktop/`

Para ver localmente:

```bash
python -m http.server 4173 --directory site
```

## Instalador (GitHub Releases)

O instalador (~116 MB) passa do limite de 100 MB por arquivo do repositório, por
isso vai para um **Release**. O workflow `.github/workflows/release.yml` roda no
Windows quando uma tag `v*` é enviada. Ele:

1. confere se a tag bate com a versão de `apps/desktop/package.json`;
2. roda `npm run check`;
3. gera o instalador;
4. anexa o `.exe` ao Release.

```bash
git tag v0.0.1
git push origin v0.0.1
```

O botão "Baixar" da página aponta para
`/releases/download/v<versão>/GChat-Desktop-Plus-Setup-<versão>-x64.exe`. A
versão fica em `site/script.js` (`VERSION`).

## Nova versão

1. Atualize `version` em `apps/desktop/package.json` (e na raiz).
2. Atualize `VERSION` em `site/script.js`.
3. Faça o commit e o push; depois, a tag `v<versão>` e o push da tag.
