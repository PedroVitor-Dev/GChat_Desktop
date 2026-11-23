// GChat Desktop+ · landing page
// Sem dependências, sem rastreamento. Só animações e o link de download.

/** Versão atual e nome do instalador gerado pelo workflow de release. */
const VERSION = '0.0.4';
const REPO = 'PedroVitor-Dev/GChat_Desktop';
const INSTALLER = `GChat-Desktop-Plus-Setup-${VERSION}-x64.exe`;
const DOWNLOAD_URL = `https://github.com/${REPO}/releases/download/v${VERSION}/${INSTALLER}`;

document.documentElement.classList.remove('no-js');

// Todos os botões "Baixar" apontam para o instalador da versão atual.
for (const el of document.querySelectorAll('.js-download')) {
  el.href = DOWNLOAD_URL;
  el.setAttribute('download', '');
}
for (const el of document.querySelectorAll('.js-version')) el.textContent = VERSION;

// Fora do Windows, avisa que o app é para Windows (o download continua possível).
const isWindows = /Windows/i.test(navigator.userAgent);
if (!isWindows) {
  for (const el of document.querySelectorAll('.js-size')) el.textContent = 'para Windows 10/11';
}

// Elementos aparecem suavemente ao entrar na tela.
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12 },
);
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 70}ms`;
  io.observe(el);
});

// Brilho que segue o mouse nos cartões.
for (const card of document.querySelectorAll('.card')) {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}

// Prévia dos sons que acompanham o app.
const cache = new Map();
for (const btn of document.querySelectorAll('.sound')) {
  btn.setAttribute('aria-label', `Ouvir o som ${btn.textContent.trim()}`);
  btn.addEventListener('click', () => {
    const name = btn.dataset.sound;
    let audio = cache.get(name);
    if (!audio) {
      audio = new Audio(`assets/sounds/${name}.wav`);
      audio.volume = 0.7;
      cache.set(name, audio);
    }
    audio.currentTime = 0;
    void audio.play();
    btn.classList.remove('playing');
    void btn.offsetWidth; // reinicia a animação
    btn.classList.add('playing');
  });
}
