import puppeteer from 'puppeteer-core';
const tempos = process.argv.slice(2).map(Number);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--hide-scrollbars'] });
const p = await b.newPage();
await p.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 0.4 });
await p.goto(new URL('promo.html', import.meta.url).href, { waitUntil: 'load' });
await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
for (const t of tempos) {
  for (let s = 0; s <= t; s += 0.5) await p.evaluate((x) => render(x), s); // passa pelas cenas anteriores (estado das legendas)
  await p.evaluate((x) => render(x), t);
  await p.screenshot({ path: `saida/previa-${t}.jpg`, type: 'jpeg', quality: 80 });
}
await b.close();
