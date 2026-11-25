/**
 * Gera os logos e blocos da Microsoft Store (pacote MSIX) a partir de
 * assets/logo.png (raiz do repositório). Roda dentro do Electron para usar o
 * nativeImage, sem dependências extras:
 *
 *   npm run appx-assets -w @gchat/desktop
 *
 * Saída em apps/desktop/resources/appx (o electron-builder lê dali). Com as
 * variantes scale-100/200, o electron-builder gera o índice de recursos (PRI) e
 * o Windows escolhe a imagem certa para cada tela.
 */
const { app, nativeImage } = require('electron');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const SOURCE = join(__dirname, '..', '..', '..', 'assets', 'logo.png');
const OUT = join(__dirname, '..', 'resources', 'appx');

/** Recorta as margens transparentes do logo. */
function trim(image) {
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
  return image.crop({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
}

/**
 * Logo centralizado num quadro W×H transparente, ocupando `fill` do lado menor
 * (o resto é respiro, como pedem as diretrizes de blocos do Windows).
 */
function place(logo, W, H, fill) {
  const { width, height } = logo.getSize();
  const target = Math.round(Math.min(W, H) * fill);
  const scale = target / Math.max(width, height);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const resized = logo.resize({ width: w, height: h, quality: 'best' }).toBitmap();
  const out = Buffer.alloc(W * H * 4); // transparente
  const offX = Math.floor((W - w) / 2);
  const offY = Math.floor((H - h) / 2);
  for (let y = 0; y < h; y++) {
    resized.copy(out, ((offY + y) * W + offX) * 4, y * w * 4, (y + 1) * w * 4);
  }
  return nativeImage.createFromBitmap(out, { width: W, height: H }).toPNG();
}

/** [nome, largura, altura, preenchimento] em 100%; gera também 200%. */
const ASSETS = [
  ['StoreLogo', 50, 50, 0.92],
  ['Square44x44Logo', 44, 44, 0.9],
  ['Square150x150Logo', 150, 150, 0.6],
  ['Wide310x150Logo', 310, 150, 0.62],
];

app.whenReady().then(() => {
  try {
    const logo = trim(nativeImage.createFromPath(SOURCE));
    if (logo.isEmpty()) throw new Error(`logo não encontrado: ${SOURCE}`);
    mkdirSync(OUT, { recursive: true });
    for (const [name, w, h, fill] of ASSETS) {
      for (const scale of [100, 200]) {
        const f = scale / 100;
        writeFileSync(join(OUT, `${name}.scale-${scale}.png`), place(logo, w * f, h * f, fill));
      }
    }
    // Ícone da barra de tarefas/menu Iniciar sem a placa colorida (fica mais nítido).
    for (const size of [16, 24, 32, 44, 48, 256]) {
      writeFileSync(
        join(OUT, `Square44x44Logo.targetsize-${size}_altform-unplated.png`),
        place(logo, size, size, 0.94),
      );
    }
    console.log(`Logos da Store gerados em ${OUT}`);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
