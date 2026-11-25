// Gera o pacote da Microsoft Store (MSIX/AppX) com o makeappx do Windows SDK
// instalado. O makeappx antigo que o electron-builder baixa (2019) costuma ser
// bloqueado pelo Windows ("spawn UNKNOWN"); por isso apontamos para o SDK.
//
// Uso: npm run dist:store -w @gchat/desktop
import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const KITS = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin';

function findKit() {
  if (process.env.ELECTRON_BUILDER_WINDOWS_KITS_PATH) {
    return process.env.ELECTRON_BUILDER_WINDOWS_KITS_PATH;
  }
  if (!existsSync(KITS)) return null;
  const versions = readdirSync(KITS)
    .filter((v) => /^10\.\d+\.\d+\.\d+$/.test(v))
    .sort((a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < 4; i++) if (pa[i] !== pb[i]) return pb[i] - pa[i];
      return 0;
    });
  for (const v of versions) {
    const dir = join(KITS, v, 'x64');
    if (existsSync(join(dir, 'makeappx.exe')) && existsSync(join(dir, 'makepri.exe'))) return dir;
  }
  return null;
}

const kit = findKit();
if (!kit) {
  console.error(
    'Windows SDK não encontrado. Instale o "Windows SDK" (Visual Studio Installer ou developer.microsoft.com/windows/downloads/windows-sdk).',
  );
  process.exit(1);
}
console.log(`Usando o makeappx de: ${kit}`);
execSync('electron-vite build', { stdio: 'inherit' });
execSync('electron-builder --win appx --x64 --publish never', {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_BUILDER_WINDOWS_KITS_PATH: kit },
});
