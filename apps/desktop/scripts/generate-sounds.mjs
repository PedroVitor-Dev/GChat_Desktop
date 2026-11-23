/**
 * Sintetiza os sons predefinidos (originais, sem licença de terceiros) como WAV
 * PCM 16 bits mono 44,1 kHz em resources/sounds.
 *
 *   node scripts/generate-sounds.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 44_100;
const OUT = new URL('../resources/sounds/', import.meta.url);

const tone = (seconds, fn) => {
  const n = Math.round(seconds * RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / RATE, i / n);
  return out;
};
const concat = (...parts) => {
  const out = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const sine = (f, t) => Math.sin(2 * Math.PI * f * t);
const attack = (t, a = 0.005) => Math.min(1, t / a); // evita estalos no início

const sounds = {
  // Gota: queda de frequência rápida.
  gota: tone(0.22, (t, p) => attack(t) * Math.exp(-p * 5) * sine(1400 - 800 * p, t) * 0.8),
  // Sino: harmônicos com decaimento longo.
  sino: tone(
    1.1,
    (t) =>
      attack(t) *
      Math.exp(-t * 4) *
      (sine(880, t) + 0.5 * sine(1760, t) + 0.25 * sine(2640, t)) *
      0.45,
  ),
  // Pop: curto e grave.
  pop: tone(0.09, (t, p) => attack(t, 0.002) * Math.exp(-p * 6) * sine(420 - 120 * p, t) * 0.9),
  // Dois toques: intervalo ascendente.
  'dois-toques': concat(
    tone(0.13, (t, p) => attack(t) * (1 - p) * sine(660, t) * 0.6),
    tone(0.03, () => 0),
    tone(0.2, (t, p) => attack(t) * (1 - p) ** 2 * sine(990, t) * 0.6),
  ),
  // Suave: acorde com entrada e saída lentas.
  suave: tone(
    0.7,
    (t, p) => Math.sin(Math.PI * p) * (sine(523.25, t) + sine(659.25, t) + sine(783.99, t)) * 0.22,
  ),
};

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) =>
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2),
  );
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

mkdirSync(OUT, { recursive: true });
for (const [name, samples] of Object.entries(sounds)) {
  writeFileSync(new URL(`${name}.wav`, OUT), wav(samples));
}
console.log(`sons gerados: ${Object.keys(sounds).join(', ')}`);
