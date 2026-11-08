import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--allow-file-access-from-files'] });
const p = await b.newPage();
await p.setViewport({ width: 540, height: 960 });
await p.goto(new URL('promo.html', import.meta.url).href);
const info = await p.evaluate(async (src) => {
  document.body.innerHTML = `<video id="v" src="${src}" muted style="position:fixed;inset:0;width:540px;height:960px;z-index:9"></video>`;
  const v = document.getElementById('v');
  await new Promise((ok, erro) => { v.onloadeddata = ok; v.onerror = () => erro(String(v.error?.message)); });
  v.currentTime = 9.0; await new Promise((ok) => (v.onseeked = ok));
  return { duracao: v.duration, largura: v.videoWidth, altura: v.videoHeight };
}, new URL('saida/mealheiro-promo.mp4', import.meta.url).href);
await p.screenshot({ path: 'saida/verificacao.jpg', type: 'jpeg', quality: 80 });
console.log(JSON.stringify(info));
await b.close();
