// Gera as notas do Release no GitHub a partir de src/shared/changelog.json
// (a mesma fonte da aba Atualizações do app). Uso: node scripts/release-notes.mjs v0.0.6
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const version = (process.argv[2] ?? '').replace(/^v/, '');
const changelog = JSON.parse(readFileSync(join(here, '../src/shared/changelog.json'), 'utf8'));
const entry = changelog.find((r) => r.version === version);
if (!entry) {
  console.error(`Sem novidades para a versão ${version} em src/shared/changelog.json.`);
  process.exit(1);
}

const lines = [
  '## Novidades',
  ...entry.highlights.map((h) => `- ${h}`),
  '',
  '## Instalação',
  '1. Baixe **o arquivo GChat-Desktop-Plus-Setup-…-x64.exe** abaixo.',
  '2. Se aparecer “O Windows protegeu o computador”, clique em *Mais informações → Executar assim mesmo* (o instalador ainda não tem assinatura digital).',
  '3. Entre com sua conta Google na página oficial.',
  '',
  'Quem já tem o app recebe esta versão pela atualização automática (Configurações → Atualizações).',
  '',
  'Windows 10/11 · 64 bits · não requer administrador.',
];
process.stdout.write(`${lines.join('\n')}\n`);
