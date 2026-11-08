// Gera os ícones PNG da app (sem dependências): mealheiro rosa com moeda dourada sobre fundo rubi-escuro.
// Desenho numa grelha de 96×96 (igual ao SVG de referência), rasterizado com supersampling 4×4.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTabela = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTabela[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const bloco = (tipo, dados) => {
  const t = Buffer.from(tipo);
  const len = Buffer.alloc(4); len.writeUInt32BE(dados.length);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, dados])));
  return Buffer.concat([len, t, dados, c]);
};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Formas (coordenadas na grelha 96×96). A ordem é a de pintura.
const dentroRetArr = (x, y, x0, y0, w, h, r) => {
  if (x < x0 || x > x0 + w || y < y0 || y > y0 + h) return false;
  const cx = Math.min(Math.max(x, x0 + r), x0 + w - r);
  const cy = Math.min(Math.max(y, y0 + r), y0 + h - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const FORMAS = [
  { cor: '#e11d48', dentro: (x, y) => dentroRetArr(x, y, 32, 66, 7, 12, 3) || dentroRetArr(x, y, 55, 66, 7, 12, 3) }, // patas
  { cor: '#fb7185', dentro: (x, y) => { const dx = x - 36, dy = y - 40; return dy <= 0 && dy >= -10 && Math.abs(dx) <= (dy + 10) * 0.5; } }, // orelha
  { cor: '#fb7185', dentro: (x, y) => ((x - 48) / 26) ** 2 + ((y - 54) / 19) ** 2 <= 1 }, // corpo
  { cor: '#fda4af', dentro: (x, y) => (x - 70) ** 2 + (y - 52) ** 2 <= 49 }, // focinho
  { cor: '#9f1239', dentro: (x, y) => (x - 68) ** 2 + (y - 52) ** 2 <= 1.6 || (x - 72) ** 2 + (y - 52) ** 2 <= 1.6 }, // narinas
  { cor: '#3b0610', dentro: (x, y) => (x - 59) ** 2 + (y - 46) ** 2 <= 4.4 }, // olho
  { cor: '#9f1239', dentro: (x, y) => dentroRetArr(x, y, 40, 36, 16, 4, 2) }, // ranhura
  { cor: '#f5b14c', dentro: (x, y) => (x - 48) ** 2 + (y - 22) ** 2 <= 64 }, // moeda
  { cor: '#fde68a', dentro: (x, y) => { const d = (x - 48) ** 2 + (y - 22) ** 2; return d <= 30 && d >= 20; } }, // brilho da moeda
];
const FUNDO = '#2a0610';

/** @param escala fração do quadrado ocupada pelo desenho (o maskable precisa de margem extra). */
function png(tam, { arredondado, escala }) {
  const raw = Buffer.alloc((tam * 4 + 1) * tam);
  const S = 4;
  const fundo = hex(FUNDO);
  const cores = FORMAS.map((f) => hex(f.cor));
  const rCanto = tam * (22 / 96);
  for (let py = 0; py < tam; py++) {
    raw[py * (tam * 4 + 1)] = 0;
    for (let px = 0; px < tam; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const X = px + (sx + 0.5) / S;
          const Y = py + (sy + 0.5) / S;
          if (arredondado && !dentroRetArr(X, Y, 0, 0, tam, tam, rCanto)) continue;
          // coordenadas na grelha 96, centradas e escaladas
          const gx = 48 + ((X / tam) * 96 - 48) / escala;
          const gy = 48 + ((Y / tam) * 96 - 48) / escala;
          let c = fundo;
          for (let i = 0; i < FORMAS.length; i++) if (FORMAS[i].dentro(gx, gy)) c = cores[i];
          r += c[0]; g += c[1]; b += c[2]; a += 255;
        }
      }
      const n = S * S;
      const p = py * (tam * 4 + 1) + 1 + px * 4;
      const cobertura = a / 255;
      raw[p] = cobertura ? Math.round(r / cobertura) : 0;
      raw[p + 1] = cobertura ? Math.round(g / cobertura) : 0;
      raw[p + 2] = cobertura ? Math.round(b / cobertura) : 0;
      raw[p + 3] = Math.round(a / n);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tam, 0); ihdr.writeUInt32BE(tam, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', deflateSync(raw)), bloco('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, { arredondado: true, escala: 1 }));
writeFileSync('public/icons/icon-512.png', png(512, { arredondado: true, escala: 1 }));
writeFileSync('public/icons/icon-maskable-512.png', png(512, { arredondado: false, escala: 0.8 }));
writeFileSync('public/icons/apple-touch-icon.png', png(180, { arredondado: false, escala: 0.92 }));
console.log('ícones gerados');
