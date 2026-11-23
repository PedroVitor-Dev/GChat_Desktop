/**
 * Gera os ícones do app a partir de assets/logo.png (raiz do repositório).
 * Roda dentro do Electron para usar o nativeImage, sem dependências extras:
 *
 *   npm run icons -w @gchat/desktop
 *
 * Saídas em apps/desktop/resources:
 *   icon.ico  — executável, instalador e atalhos (16…256 px, PNG embutido)
 *   icon.png  — 256 px, ícone de janela e de notificação em tempo de execução
 */
const { app, nativeImage } = require('electron');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

const SOURCE = join(__dirname, '..', '..', '..', 'assets', 'logo.png');
const OUT = join(__dirname, '..', 'resources');
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const PADDING = 0.04; // respiro em volta do desenho

/** Recorta as margens transparentes e centraliza num quadrado. */
function squareTrim(image) {
  const { width, height } = image.getSize();
  const bitmap = image.toBitmap(); // BGRA
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (bitmap[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('logo totalmente transparente');

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const side = Math.ceil(Math.max(w, h) * (1 + PADDING * 2));
  const out = Buffer.alloc(side * side * 4); // transparente
  const offX = Math.floor((side - w) / 2);
  const offY = Math.floor((side - h) / 2);
  for (let y = 0; y < h; y++) {
    const src = ((minY + y) * width + minX) * 4;
    bitmap.copy(out, ((offY + y) * side + offX) * 4, src, src + w * 4);
  }
  return nativeImage.createFromBitmap(out, { width: side, height: side });
}

/** ICO com imagens PNG embutidas (suportado desde o Windows Vista). */
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // tipo: ícone
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); // planos
    e.writeUInt16LE(32, 6); // bits por pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

app.whenReady().then(() => {
  try {
    const source = nativeImage.createFromPath(SOURCE);
    if (source.isEmpty()) throw new Error(`não foi possível ler ${SOURCE}`);
    const square = squareTrim(source);
    const at = (size) => square.resize({ width: size, height: size, quality: 'best' }).toPNG();

    writeFileSync(join(OUT, 'icon.png'), at(256));
    writeFileSync(
      join(OUT, 'icon.ico'),
      buildIco(ICO_SIZES.map((size) => ({ size, data: at(size) }))),
    );
    console.log(
      `ícones gerados em ${OUT} (${square.getSize().width}px recortado → ${ICO_SIZES.join(', ')})`,
    );
    app.exit(0);
  } catch (err) {
    console.error(err);
    app.exit(1);
  }
});
