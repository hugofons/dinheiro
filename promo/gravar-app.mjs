// Grava a app real a ser usada (dedo visível, valores escritos, gráficos a animar) com o screencast do Chrome.
// Saída: frames/NNNNN.jpg + frames/indice.json { frames: [{ f, t }], marcas: { nome: t } } (t em segundos desde o início)
// Uso: node gravar-app.mjs   (precisa de ../dist — corre "npm run build" na raiz antes)
import { createServer } from 'node:http';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { semear } from './demo.mjs';

const caminho = (rel) => new URL(rel, import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const DIST = caminho('../dist/');
const FRAMES = caminho('./frames/');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const servidor = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const corpo = await readFile(join(DIST, p === '/' ? 'index.html' : p));
    res.writeHead(200, { 'Content-Type': TIPOS[extname(p)] ?? 'text/html' });
    res.end(corpo);
  } catch { res.writeHead(404); res.end(); }
}).listen(4791);

await rm(FRAMES, { recursive: true, force: true });
await mkdir(FRAMES, { recursive: true });

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars'] });
const contexto = await browser.createBrowserContext();
const page = await contexto.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto('http://localhost:4791/', { waitUntil: 'networkidle0' });
await page.waitForSelector('.barra');
await semear(page);
await page.goto('http://localhost:4791/', { waitUntil: 'networkidle0' });
await page.waitForSelector('.barra');

// "Dedo" visível que se move e carrega nos sítios onde o script toca.
await page.evaluate(() => {
  const d = document.createElement('div');
  d.id = 'dedo';
  d.style.cssText = 'position:fixed;left:195px;top:900px;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;z-index:99999;pointer-events:none;' +
    'background:radial-gradient(circle at 40% 35%, rgb(255 255 255 / .75), rgb(255 255 255 / .35) 60%, rgb(255 255 255 / .15));border:2px solid rgb(255 255 255 / .85);' +
    'box-shadow:0 6px 18px rgb(0 0 0 / .4);transition:left .45s cubic-bezier(.3,.9,.3,1), top .45s cubic-bezier(.3,.9,.3,1), transform .15s, opacity .3s;opacity:0';
  document.body.appendChild(d);
  const s = document.createElement('style');
  s.textContent = '#dedo.carrega{transform:scale(.72)} .onda{position:fixed;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;border:3px solid #fff;pointer-events:none;z-index:99998;animation:onda .6s ease-out forwards}@keyframes onda{to{transform:scale(2.6);opacity:0}}';
  document.head.appendChild(s);
});

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = [];
const marcas = {};
let inicio = null;
const cdp = await page.createCDPSession();
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  if (inicio === null) inicio = metadata.timestamp;
  const f = String(frames.length).padStart(5, '0') + '.jpg';
  frames.push({ f, t: +(metadata.timestamp - inicio).toFixed(4) });
  await writeFile(FRAMES + f, Buffer.from(data, 'base64'));
});
const marca = (nome) => { marcas[nome] = inicio === null ? 0 : +(Date.now() / 1000 - inicio).toFixed(3); console.log('marca', nome, marcas[nome]); };

async function caixa(seletorOuFn) {
  const h = typeof seletorOuFn === 'string' ? await page.$(seletorOuFn) : await page.evaluateHandle(seletorOuFn);
  const el = h.asElement();
  if (!el) throw new Error('não encontrei ' + seletorOuFn);
  await el.evaluate((e) => e.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
  return { el, b: await el.boundingBox() };
}
async function tocar(alvo, { esperaDepois = 380 } = {}) {
  const { b } = await caixa(alvo);
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.evaluate((x, y) => { const d = document.getElementById('dedo'); d.style.opacity = '1'; d.style.left = x + 'px'; d.style.top = y + 'px'; }, x, y);
  await espera(520);
  await page.evaluate((x, y) => {
    const d = document.getElementById('dedo'); d.classList.add('carrega');
    const o = document.createElement('div'); o.className = 'onda'; o.style.left = x + 'px'; o.style.top = y + 'px';
    document.body.appendChild(o); setTimeout(() => o.remove(), 700);
  }, x, y);
  await page.mouse.click(x, y, { delay: 90 });
  await page.evaluate(() => document.getElementById('dedo').classList.remove('carrega'));
  await espera(esperaDepois);
}
const porTexto = (seletor, texto) => new Function(`return [...document.querySelectorAll(${JSON.stringify(seletor)})].find((e) => e.textContent.includes(${JSON.stringify(texto)}))`);

await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
await espera(300);
marca('inicio');
await espera(1400);

// 1. Registar um gasto
marca('registar');
await tocar('.fab', { esperaDepois: 750 });
await page.type('.valor-entrada input', '12,50', { delay: 170 });
await espera(350);
await tocar(porTexto('.folha .chip', 'Restaurantes'));
await tocar('.folha input[placeholder^="Ex."]', { esperaDepois: 200 });
await page.type('.folha input[placeholder^="Ex."]', 'Almoço com a equipa', { delay: 65 });
await page.evaluate(() => document.activeElement.blur());
await espera(350);
await tocar('.folha button[type=submit]', { esperaDepois: 1500 });

// 2. Contas e atualizar saldos
marca('contas');
await tocar(porTexto('.barra button', 'Contas'), { esperaDepois: 1500 });
await tocar(porTexto('button', 'Atualizar saldos'), { esperaDepois: 800 });
await tocar('.campo-saldo input', { esperaDepois: 200 });
await page.evaluate(() => document.activeElement.select());
await page.type('.campo-saldo input', '1.900,00', { delay: 140 });
await page.evaluate(() => document.activeElement.blur());
await espera(300);
await tocar('.folha button[type=submit]', { esperaDepois: 2000 });

// 3. Evolução: gráficos a crescer, deslizar, filtrar por categoria
marca('evolucao');
await tocar(porTexto('.barra button', 'Evolução'), { esperaDepois: 2300 });
await page.evaluate(() => window.scrollTo({ top: 560, behavior: 'smooth' }));
await espera(1500);
await tocar('select', { esperaDepois: 250 });
await page.evaluate(() => {
  const s = document.querySelector('select');
  s.value = [...s.options].find((o) => o.text === 'Supermercado').value;
  s.dispatchEvent(new Event('change', { bubbles: true }));
});
await espera(2200);
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
await espera(1000);
marca('fim');

await cdp.send('Page.stopScreencast');
await espera(300);
await writeFile(FRAMES + 'indice.json', JSON.stringify({ frames, marcas }));
console.log('frames', frames.length, 'duração', frames.at(-1)?.t);
await browser.close();
servidor.close();
