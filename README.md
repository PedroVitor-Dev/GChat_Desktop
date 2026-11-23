# GChat Desktop+

Companheiro para Windows do Google Chat, com notificações nativas e sons
personalizáveis.

## Como funciona

O Google bloqueia login em navegadores incorporados (Electron/CEF). Por isso o
projeto **não** reempacota o Chat. Em vez disso:

- o Chat roda no **app instalável oficial (PWA)** do Chrome ou Edge, com login
  100% oficial;
- uma **extensão** lê as notificações que o Chat já emite;
- o **app Windows** (Electron + React) aplica regras, sons, horários de silêncio e
  bandeja, e mostra os toasts nativos.

Detalhes em [docs/fase-1-viabilidade.md](docs/fase-1-viabilidade.md) e
[docs/estrutura.md](docs/estrutura.md).

## Status

- [x] Fase 1: viabilidade (falta validar com `spikes/notification-probe`)
- [x] Fase 2: estrutura do monorepo ([docs/desenvolvimento.md](docs/desenvolvimento.md))
- [ ] Fase 3: conexão extensão ⇄ app

## Licença

GPL-3.0. Consulte [LICENSE](LICENSE).
