# Instalador

```bash
npm run dist -w @gchat/desktop
```

Gera `apps/desktop/release/<versão>/GChat-Desktop-Plus-Setup-<versão>-x64.exe`
(NSIS, x64). A pasta `win-unpacked` ao lado tem o app sem instalar, para testes
rápidos.

## O que o instalador faz

- Assistente em **português**, com as imagens do app (barra lateral e cabeçalho
  geradas por `npm run installer-art -w @gchat/desktop`) e a licença GPL-3.0.
- Instalação **por usuário** (sem pedir administrador), com a pasta de destino
  escolhida pelo usuário.
- Atalhos na **área de trabalho** e no **menu Iniciar** com o ícone do app (o
  logo embutido no executável). Ao final, oferece abrir o app.
- O desinstalador remove o programa, mas **mantém** `%APPDATA%\GChat Desktop+`
  (configurações, sons importados e o login das contas), para que reinstalar ou
  atualizar não perca nada.

## Regenerar a arte

| Arquivo                                                            | Origem                                          |
| ------------------------------------------------------------------ | ----------------------------------------------- |
| `resources/icon.ico`, `resources/icon.png`                         | `npm run icons` (a partir de `assets/logo.png`) |
| `resources/installer/sidebar.bmp` (164×314), `header.bmp` (150×57) | `npm run installer-art`                         |
| `resources/sounds/*.wav`                                           | `npm run sounds`                                |

## Observações

- **Sem assinatura digital:** o Windows SmartScreen pode mostrar "O Windows
  protegeu o computador" na primeira execução. Clique em "Mais informações" →
  "Executar assim mesmo". Para distribuir publicamente, convém um certificado de
  assinatura de código.
- A versão do Electron precisa estar fixa no `package.json` (o electron-builder
  baixa os binários daquela versão exata).
