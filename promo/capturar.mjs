// Capta ecrãs da app real com dados de demonstração (perfil temporário do Chrome; não toca em dados reais).
// Uso: node capturar.mjs   (precisa de ../dist — corre "npm run build" na raiz antes)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import puppeteer from 'puppeteer-core';

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
await page.evaluate(async () => {
  const abrir = () => new Promise((ok, erro) => { const r = indexedDB.open('dinheiro'); r.onsuccess = () => ok(r.result); r.onerror = erro; });
  const d = await abrir();
  const tudo = (loja) => new Promise((ok) => { const r = d.transaction(loja).objectStore(loja).getAll(); r.onsuccess = () => ok(r.result); });
  const cats = await tudo('categorias');
  const [principal] = await tudo('contas');
  const cat = (n) => cats.find((c) => c.nome === n).id;
  const hoje = new Date();
  const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const t = d.transaction(['contas', 'movimentos', 'acertos', 'config'], 'readwrite');
  const contas = t.objectStore('contas');
  contas.put({ ...principal, nome: 'Conta à ordem', cor: '#ff7a8c' });
  contas.put({ id: 'poup', nome: 'Poupança', tipo: 'poupanca', cor: '#6fd6bd', arquivada: false, ordem: 1 });
  contas.put({ id: 'inv', nome: 'Investimentos', tipo: 'investimento', cor: '#f3c56b', arquivada: false, ordem: 2 });
  contas.put({ id: 'cart', nome: 'Cartão', tipo: 'cartao', cor: '#c39bff', arquivada: false, ordem: 3 });
  const mov = t.objectStore('movimentos');
  let k = 0;
  const add = (dt, tipo, v, categoria, nota = '', contaId = principal.id, contaDestinoId) => {
    if (dt > hoje) return;
    mov.put({ id: 'demo' + k++, tipo, valorCent: v, categoriaId: categoria ? cat(categoria) : '', contaId, contaDestinoId, data: iso(dt), nota, criadoEm: dt.getTime() });
  };
  for (let i = 11; i >= 0; i--) {
    const m = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const dia = (n) => new Date(m.getFullYear(), m.getMonth(), n, 12);
    const r = (a, b) => a + ((i * 37 + b * 13) % (b - a + 1));
    add(dia(1), 'receita', 168000, 'Salário');
    add(dia(2), 'despesa', 72000, 'Casa', 'Renda');
    add(dia(3), 'transferencia', 25000, null, 'Poupar', principal.id, 'poup');
    add(dia(4), 'transferencia', 10000, null, 'Investir', principal.id, 'inv');
    add(dia(5), 'despesa', r(9000, 12500), 'Supermercado', 'Compras da semana');
    add(dia(12), 'despesa', r(7000, 11000), 'Supermercado');
    add(dia(6), 'despesa', r(4500, 6500), 'Transportes', 'Combustível');
    add(dia(7), 'despesa', r(2400, 4800), 'Restaurantes', 'Jantar fora', 'cart');
    add(dia(8), 'despesa', 2500, 'Saúde', 'Farmácia');
    add(dia(9), 'despesa', r(1500, 3900), 'Lazer', 'Cinema', 'cart');
    add(dia(10), 'despesa', 1250, 'Restaurantes', 'Almoço');
    if (i % 3 === 0) add(dia(15), 'receita', 15000, 'Outras receitas', 'Venda online');
  }
  const ac = t.objectStore('acertos');
  const hojeIso = iso(hoje);
  ac.put({ id: 'a1', contaId: principal.id, data: hojeIso, saldoCent: 184250, criadoEm: Date.now() });
  ac.put({ id: 'a2', contaId: 'poup', data: hojeIso, saldoCent: 912000, criadoEm: Date.now() });
  ac.put({ id: 'a3', contaId: 'inv', data: hojeIso, saldoCent: 431575, criadoEm: Date.now() });
  ac.put({ id: 'a4', contaId: 'cart', data: hojeIso, saldoCent: -21840, criadoEm: Date.now() });
  t.objectStore('config').put({ chave: 'ultimaExportacao', valor: Date.now() });
  await new Promise((ok) => (t.oncomplete = ok));
  d.close();
});

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
