import { join } from 'node:path';
import { app, nativeImage, type NativeImage } from 'electron';

let cached: NativeImage | null = null;

/** Ícone do app (gerado de assets/logo.png por `npm run icons`). */
export function appIcon(): NativeImage {
  if (cached) return cached;
  const path = app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(app.getAppPath(), 'resources', 'icon.png');
  cached = nativeImage.createFromPath(path);
  return cached;
}
