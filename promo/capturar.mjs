// Capta ecrãs da app real com dados de demonstração (perfil temporário do Chrome; não toca em dados reais).
// Uso: node capturar.mjs   (precisa de ../dist — corre "npm run build" na raiz antes)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { semear } from './demo.mjs';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const SAIDA = new URL('./saida/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };

const servidor = createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const ficheiro = join(DIST, caminho === '/' ? 'index.html' : caminho);
  try {
    const corpo = await readFile(ficheiro);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(ficheiro)] ?? 'application/octet-stream' });
    res.end(corpo);
  } catch {
    res.writeHead(404); res.end();
  }
}).listen(4790);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars'] });
const contexto = await browser.createBrowserContext();
const page = await contexto.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.goto('http://localhost:4790/', { waitUntil: 'networkidle0' });
await page.waitForSelector('.barra');

// Dados de demonstração: 4 contas, 12 meses de movimentos, saldos acertados hoje.
await semear(page);

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function captar(nome, url, depois) {
  await page.goto(`http://localhost:4790/${url}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.barra');
  await espera(600);
  if (depois) await depois();
  await espera(400);
  await page.screenshot({ path: `${SAIDA}${nome}.png` });
  console.log('captado', nome);
}

await captar('mes', '');
await captar('contas', '?ecra=contas');
await captar('evolucao', '?ecra=evolucao', () => espera(800));
await captar('novo', '?ecra=novo', async () => {
  await page.type('.valor-entrada input', '12,50');
  await page.evaluate(() => [...document.querySelectorAll('.chip')].find((b) => b.textContent.includes('Restaurantes')).click());
  await page.type('input[placeholder^="Ex."]', 'Almoço com a equipa');
  await page.evaluate(() => document.activeElement.blur());
});

await browser.close();
servidor.close();
