/**
 * Gera a arte do instalador NSIS (BMP 24 bits, tamanhos exigidos pelo NSIS) a
 * partir de HTML renderizado pelo próprio Electron, no visual do app:
 *
 *   npm run installer-art -w @gchat/desktop
 *
 * Saídas em apps/desktop/resources/installer:
 *   sidebar.bmp  164×314  — boas-vindas e conclusão (instalador e desinstalador)
 *   header.bmp   150×57   — faixa superior das demais páginas
 */
const { app, BrowserWindow } = require('electron');
const { mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const OUT = join(__dirname, '..', 'resources', 'installer');
const LOGO = readFileSync(join(__dirname, '..', 'resources', 'icon.png')).toString('base64');
const version = require('../package.json').version;

const base = `
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; }
  body { font-family: 'Segoe UI Variable Display', 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
`;

const sidebar = `<!doctype html><html><head><style>${base}
  body {
    background:
      radial-gradient(120% 60% at 50% 0%, rgba(88,101,242,.55) 0%, rgba(88,101,242,0) 70%),
      radial-gradient(90% 40% at 50% 100%, rgba(35,165,90,.35) 0%, rgba(35,165,90,0) 70%),
      linear-gradient(180deg, #2b2d31 0%, #1e1f22 100%);
    color: #f2f3f5; display: flex; flex-direction: column; align-items: center;
    padding: 44px 14px 18px; text-align: center;
  }
  .glow { position: relative; width: 92px; height: 92px; border-radius: 28px;
    background: #313338; display: grid; place-items: center;
    box-shadow: 0 0 0 1px rgba(255,255,255,.06), 0 10px 30px rgba(0,0,0,.45), 0 0 40px rgba(88,101,242,.35); }
  .glow img { width: 70px; height: 70px; }
  h1 { margin-top: 22px; font-size: 17px; white-space: nowrap; font-weight: 700; letter-spacing: -.2px; }
  h1 span { color: #8c96ff; }
  p { margin-top: 8px; font-size: 11px; line-height: 1.45; color: #b5bac1; }
  .dots { margin-top: 18px; display: flex; gap: 6px; }
  .dots i { width: 6px; height: 6px; border-radius: 50%; background: #4e5058; }
  .dots i:nth-child(2) { background: #5865f2; width: 18px; border-radius: 3px; }
  .foot { margin-top: auto; font-size: 9px; color: #80848e; white-space: nowrap; }
</style></head><body>
  <div class="glow"><img src="data:image/png;base64,${LOGO}"></div>
  <h1>GChat Desktop<span>+</span></h1>
  <p>O Google Chat no seu Windows, com notificações e sons do seu jeito.</p>
  <div class="dots"><i></i><i></i><i></i></div>
  <div class="foot">v${version} · PedroVitor-Dev 🧙</div>
</body></html>`;

const header = `<!doctype html><html><head><style>${base}
  body { background: linear-gradient(90deg, #1e1f22 0%, #2b2d31 100%);
    display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; gap: 7px; color: #f2f3f5; }
  img { width: 34px; height: 34px; }
  b { font-size: 12.5px; font-weight: 700; }
  b span { color: #8c96ff; }
</style></head><body>
  <b>GChat Desktop<span>+</span></b><img src="data:image/png;base64,${LOGO}">
</body></html>`;

/** BMP 24 bits (bottom-up, linhas alinhadas a 4 bytes), formato aceito pelo NSIS. */
function toBmp(image, width, height) {
  const bgra = image.toBitmap();
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const data = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = (height - 1 - y) * rowSize + x * 3;
      data[dst] = bgra[src]; // B
      data[dst + 1] = bgra[src + 1]; // G
      data[dst + 2] = bgra[src + 2]; // R
    }
  }
  const header = Buffer.alloc(54);
  header.write('BM', 0);
  header.writeUInt32LE(54 + data.length, 2);
  header.writeUInt32LE(54, 10);
  header.writeUInt32LE(40, 14);
  header.writeInt32LE(width, 18);
  header.writeInt32LE(height, 22);
  header.writeUInt16LE(1, 26);
  header.writeUInt16LE(24, 28);
  header.writeUInt32LE(data.length, 34);
  header.writeInt32LE(2835, 38);
  header.writeInt32LE(2835, 42);
  return Buffer.concat([header, data]);
}

/** Renderiza em 2× (mais nítido e evita janelas pequenas demais) e reduz ao tamanho final. */
async function render(html, width, height, scale = 2) {
  const win = new BrowserWindow({
    width: width * scale,
    height: height * scale,
    show: false,
    useContentSize: true,
    frame: false,
    webPreferences: { offscreen: true, sandbox: true, contextIsolation: true },
  });
  // Arquivo temporário: URLs data: grandes falham de forma intermitente.
  const file = join(tmpdir(), `gchat-installer-art-${width}x${height}.html`);
  writeFileSync(file, html, 'utf8');
  await win.loadFile(file);
  rmSync(file, { force: true });
  win.webContents.setZoomFactor(scale);
  await new Promise((r) => setTimeout(r, 400)); // fontes e imagem
  const image = (await win.webContents.capturePage()).resize({
    width,
    height,
    quality: 'best',
  });
  win.destroy();
  return image;
}

app.disableHardwareAcceleration();
// Entre uma renderização e outra não há janelas: sem isto o Electron encerraria o app.
app.on('window-all-closed', () => undefined);
app.whenReady().then(async () => {
  try {
    mkdirSync(OUT, { recursive: true });
    const side = await render(sidebar, 164, 314);
    writeFileSync(join(OUT, 'sidebar.bmp'), toBmp(side, 164, 314));
    writeFileSync(join(OUT, 'sidebar-preview.png'), side.toPNG());
    const head = await render(header, 150, 57);
    writeFileSync(join(OUT, 'header.bmp'), toBmp(head, 150, 57));
    writeFileSync(join(OUT, 'header-preview.png'), head.toPNG());
    console.log(`arte do instalador gerada em ${OUT}`);
    app.exit(0);
  } catch (err) {
    console.error(err);
    app.exit(1);
  }
});
