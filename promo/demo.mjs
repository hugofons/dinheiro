// Dados de demonstração (4 contas, 12 meses, saldos acertados hoje). Corre dentro da página da app.
export const semear = (page) => page.evaluate(async () => {
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
