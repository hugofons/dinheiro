// Pré-visualização de frames: node previa.mjs [pagina] t1 t2 ...
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
const [pagina, ...ts] = process.argv.slice(2);
const tempos = ts.map(Number);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars', '--allow-file-access-from-files'] });
const p = await b.newPage();
await p.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 0.4 });
const indice = await readFile(new URL('frames/indice.json', import.meta.url), 'utf8').catch(() => 'null');
await p.evaluateOnNewDocument((j) => { window.INDICE = JSON.parse(j); }, indice);
await p.goto(new URL(pagina, import.meta.url).href, { waitUntil: 'load' });
for (const t of tempos) {
  for (let s = 0; s <= t; s += 0.5) await p.evaluate((x) => render(x), s);
  await p.evaluate((x) => render(x), t);
  await p.screenshot({ path: `saida/previa-${t}.jpg`, type: 'jpeg', quality: 80 });
}
console.log('duração', await p.evaluate(() => window.DURACAO));
await b.close();
