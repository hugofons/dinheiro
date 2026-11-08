// Grava promo.html frame a frame e codifica em MP4 (H.264) dentro do Chrome, com WebCodecs + mp4-muxer.
// Uso: node gravar.mjs [pagina=promo-app.html] [fps=30] [saida=mealheiro-promo.mp4]
//   A página define window.DURACAO; promo-app.html usa frames/indice.json (gerado por gravar-app.mjs).
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const PAGINA = process.argv[2] ?? 'promo-app.html';
const FPS = Number(process.argv[3] ?? 30);
const NOME = process.argv[4] ?? 'mealheiro-promo.mp4';
const L = 1080, A = 1920;
const aqui = new URL('./', import.meta.url);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--allow-file-access-from-files'] });
const promo = await browser.newPage();
await promo.setViewport({ width: L, height: A, deviceScaleFactor: 1 });
const indice = await readFile(new URL('frames/indice.json', aqui), 'utf8').catch(() => 'null');
await promo.evaluateOnNewDocument((j) => { window.INDICE = JSON.parse(j); }, indice);
await promo.goto(new URL(PAGINA, aqui).href, { waitUntil: 'load' });
const DURACAO = await promo.evaluate(() => window.DURACAO ?? 25);
console.log('duração', DURACAO.toFixed(2), 's');
await promo.evaluate(() => Promise.all([...document.images].filter((i) => i.src).map((i) => i.decode().catch(() => {}))));

// O codificador corre na mesma página: separadores em segundo plano não são desenhados.
const cod = promo;
await cod.addScriptTag({ path: new URL('node_modules/mp4-muxer/build/mp4-muxer.js', aqui).pathname.replace(/^\/([A-Z]:)/, '$1') });
const codec = await cod.evaluate(async ({ L, A, FPS }) => {
  const opcoes = ['avc1.640033', 'avc1.4d0033', 'avc1.42003e'];
  let escolhido = null;
  for (const c of opcoes) {
    const r = await VideoEncoder.isConfigSupported({ codec: c, width: L, height: A, bitrate: 10_000_000, framerate: FPS });
    if (r.supported) { escolhido = c; break; }
  }
  if (!escolhido) return null;
  window.muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: L, height: A, frameRate: FPS }, fastStart: 'in-memory' });
  window.erro = null;
  window.enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (window.erro = String(e)) });
  enc.configure({ codec: escolhido, width: L, height: A, bitrate: 10_000_000, framerate: FPS, avc: { format: 'avc' } });
  window.addFrame = async (b64, i) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    let bmp;
    try { bmp = await createImageBitmap(new Blob([bin], { type: 'image/jpeg' })); } catch { return 'repetir'; }
    const f = new VideoFrame(bmp, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    enc.encode(f, { keyFrame: i % (FPS * 2) === 0 });
    f.close(); bmp.close();
    while (enc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 5));
    return window.erro;
  };
  return escolhido;
}, { L, A, FPS });
if (!codec) throw new Error('Este Chrome não codifica H.264');
console.log('codec', codec);

const total = Math.round(DURACAO * FPS);
for (let i = 0; i < total; i++) {
  await promo.evaluate((t) => window.render(t), i / FPS);
  let erro = 'repetir';
  for (let tentativa = 0; erro === 'repetir' && tentativa < 5; tentativa++) {
    const b64 = await promo.screenshot({ type: 'jpeg', quality: 92, encoding: 'base64' });
    erro = await cod.evaluate((b, i) => window.addFrame(b, i), b64, i);
    if (erro === 'repetir') console.log('frame', i, 'screenshot inválido, a repetir');
  }
  if (erro) throw new Error('frame ' + i + ': ' + erro);
  if (i % 75 === 0) console.log(`frame ${i}/${total}`);
}

const partes = await cod.evaluate(async () => {
  await enc.flush();
  muxer.finalize();
  const buf = new Uint8Array(muxer.target.buffer);
  window.saida = buf;
  return Math.ceil(buf.length / 2_000_000);
});
const pedacos = [];
for (let p = 0; p < partes; p++) {
  const b64 = await cod.evaluate((p) => {
    const s = window.saida.subarray(p * 2_000_000, (p + 1) * 2_000_000);
    let bin = ''; for (let i = 0; i < s.length; i += 0x8000) bin += String.fromCharCode(...s.subarray(i, i + 0x8000));
    return btoa(bin);
  }, p);
  pedacos.push(Buffer.from(b64, 'base64'));
}
const destino = new URL('saida/' + NOME, aqui);
await writeFile(destino, Buffer.concat(pedacos));
console.log('gravado', destino.pathname, Buffer.concat(pedacos).length, 'bytes');
await browser.close();
