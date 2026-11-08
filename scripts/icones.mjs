// Gera os ícones PNG da app (sem dependências): quadrado verde-azulado com três barras brancas.
import { writeFileSync, mkdirSync } from 'node:fs';
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

function png(tam, { arredondado, margem }) {
  const fundo = [15, 118, 110];
  const raw = Buffer.alloc((tam * 4 + 1) * tam);
  const r = tam * 0.22;
  // barras: (x0, altura) em fração da área útil
  const util = tam * (1 - 2 * margem);
  const o = tam * margem;
  const barras = [[0.18, 0.38], [0.42, 0.62], [0.66, 0.86]].map(([x, h]) => ({ x0: o + util * x, x1: o + util * (x + 0.16), y0: o + util * (0.86 - h * 0.85), y1: o + util * 0.86 }));
  for (let y = 0; y < tam; y++) {
    raw[y * (tam * 4 + 1)] = 0;
    for (let x = 0; x < tam; x++) {
      let a = 255;
      if (arredondado) {
        const cx = Math.min(Math.max(x + 0.5, r), tam - r), cy = Math.min(Math.max(y + 0.5, r), tam - r);
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        a = d > r ? 0 : 255;
      }
      const branco = barras.some((b) => x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1);
      const p = y * (tam * 4 + 1) + 1 + x * 4;
      const [cr, cg, cb] = branco ? [255, 255, 255] : fundo;
      raw[p] = cr; raw[p + 1] = cg; raw[p + 2] = cb; raw[p + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tam, 0); ihdr.writeUInt32BE(tam, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', deflateSync(raw)), bloco('IEND', Buffer.alloc(0))]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, { arredondado: true, margem: 0.1 }));
writeFileSync('public/icons/icon-512.png', png(512, { arredondado: true, margem: 0.1 }));
writeFileSync('public/icons/icon-maskable-512.png', png(512, { arredondado: false, margem: 0.22 }));
writeFileSync('public/icons/apple-touch-icon.png', png(180, { arredondado: false, margem: 0.12 }));
console.log('ícones gerados');
