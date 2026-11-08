# App Dinheiro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA Android para registar gastos/receitas, com resumo do mês, evolução de 12 meses e cópia CSV, dados só em IndexedDB.

**Architecture:** Funções puras em `src/dominio/` (testadas com Vitest), camada Dexie em `src/dados/`, ecrãs Preact em `src/ecras/` com `liveQuery`. vite-plugin-pwa para manifesto e service worker; GitHub Actions publica no Pages.

**Tech Stack:** Vite 6, TypeScript, Preact, Dexie 4, Chart.js 4, vite-plugin-pwa, Vitest, fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-11-08-app-dinheiro-design.md`

**Execução escolhida:** Native (o utilizador pediu desenvolvimento autónomo sem perguntas até à revisão no Figma).

## Global Constraints

- Português de Portugal em todo o texto visível; euros formatados com `Intl.NumberFormat('pt-PT', {style:'currency', currency:'EUR'})`.
- Valores guardados como inteiros em cêntimos (`valorCent > 0`), máximo 1 000 000 € (100 000 000 cêntimos), até 2 casas decimais.
- Datas guardadas como `'AAAA-MM-DD'` em hora local (nunca `toISOString()` para obter o dia).
- CSV: UTF-8 com BOM, `;`, `\r\n`, cabeçalho `id;data;tipo;categoria;valor;nota`, data `dd/mm/aaaa`, valor `12,50`.
- Nota até 100 caracteres.
- Layout pensado para 360–430 px de largura; nada de scroll horizontal.

## Review Focus

- Valor "1.234,56" ou "1234.5" ou " 12 " no formulário → aceitar formatos portugueses e com ponto; "12,345" e "0" rejeitados. (teste em Task 1)
- Movimento a 31 de um mês e navegar para fevereiro → navegação de mês não salta nem repete meses. (teste em Task 1)
- Nota com `;`, aspas ou quebra de linha exportada e reimportada → volta igual. (teste em Task 3)
- CSV aberto e regravado no Excel (sem BOM, ou com `\n`) → ainda importa. (teste em Task 3)
- Importar o mesmo ficheiro duas vezes → zero duplicados. (teste em Task 4)

---

### Task 1: Projeto, dinheiro e datas

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/dominio/dinheiro.ts`, `src/dominio/datas.ts`
- Test: `src/dominio/dinheiro.test.ts`, `src/dominio/datas.test.ts`

**Interfaces:**
- Produces: `lerValor(texto: string): number | null` (cêntimos ou null se inválido), `formatarEuros(cent: number): string`, `centParaTexto(cent: number): string` (`"12,50"`); `type Mes = {ano: number; mes: number}` (mes 1–12), `mesDe(data: string): Mes`, `mesAtual(hoje?: Date): Mes`, `somarMeses(m: Mes, n: number): Mes`, `chaveMes(m: Mes): string` (`'2026-11'`), `nomeMes(m: Mes): string` (`'novembro 2026'`), `nomeMesCurto(m: Mes): string` (`'nov'`), `hojeISO(hoje?: Date): string`, `isoParaPt(d: string): string`, `ptParaIso(d: string): string | null`.

- [ ] Scaffold Vite + Preact + TS, instalar dependências, script `test` = `vitest run`.
- [ ] Testes: `lerValor('12,5')===1250`, `lerValor('1.234,56')===123456`, `lerValor('1234.5')===123450`, `lerValor(' 12 ')===1200`, `lerValor('12,345')===null`, `lerValor('0')===null`, `lerValor('-3')===null`, `lerValor('abc')===null`, `lerValor('1000000,01')===null`; `centParaTexto(1250)==='12,50'`; `somarMeses({ano:2026,mes:1},-1)` = `{ano:2025,mes:12}`; `somarMeses({ano:2026,mes:11},14)` = `{ano:2028,mes:1}`; `nomeMes({ano:2026,mes:11})==='novembro 2026'`; `hojeISO(new Date(2026,0,5,23,30))==='2026-01-05'`; `isoParaPt('2026-01-05')==='05/01/2026'`; `ptParaIso('31/02/2026')===null`.
- [ ] Ver falhar, implementar, ver passar, commit.

### Task 2: Resumos

**Files:** Create `src/dominio/tipos.ts`, `src/dominio/resumos.ts`; Test `src/dominio/resumos.test.ts`

**Interfaces:**
- Produces: `Tipo`, `Categoria`, `Movimento` (como na spec); `totaisMes(movs: Movimento[], m: Mes): {gastos: number; receitas: number; saldo: number}`; `gastosPorCategoria(movs, m): {categoriaId: string; total: number; percent: number}[]` (desc); `serieMeses(movs, ate: Mes, n = 12, categoriaId?: string): {mes: Mes; gastos: number; receitas: number; saldo: number}[]` (do mais antigo ao mais recente); `movimentosDoMes(movs, m): {data: string; movs: Movimento[]}[]` (dias desc, dentro do dia por `criadoEm` desc); `variacao(atual: number, anterior: number): number | null` (null se anterior 0).
- [ ] Testes com dados de 3 meses: totais certos; por categoria ordenado e percentagens a somar ~100; série de 12 meses tem 12 entradas incluindo meses vazios a zero; filtro de categoria só conta despesas dessa categoria; `variacao(112,100)===12`.
- [ ] Implementar, passar, commit.

### Task 3: CSV

**Files:** Create `src/dominio/csv.ts`; Test `src/dominio/csv.test.ts`

**Interfaces:**
- Produces: `gerarCsv(movs: Movimento[], cats: Categoria[]): string`; `type LinhaCsv = {id: string | null; data: string; tipo: Tipo; categoria: string; valorCent: number; nota: string}`; `lerCsv(texto: string): {linhas: LinhaCsv[]; invalidas: number} | {erro: 'cabecalho'}`.
- [ ] Testes: começa por `﻿id;data;tipo;categoria;valor;nota\r\n`; ida e volta com nota `a;b "c"\nd` preserva tudo; sem BOM e com `\n` também lê; linha com valor `abc` conta como inválida; cabeçalho diferente → `{erro:'cabecalho'}`.
- [ ] Implementar (parser de estado simples para aspas), passar, commit.

### Task 4: Base de dados

**Files:** Create `src/dados/db.ts`, `src/dados/importar.ts`; Test `src/dados/importar.test.ts` (com `import 'fake-indexeddb/auto'`)

**Interfaces:**
- Produces: `db` (Dexie com tabelas `categorias`, `movimentos` `'id, data, categoriaId'`, `config` `'chave'`); `garantirCategoriasIniciais(): Promise<void>`; `guardarMovimento(m: Omit<Movimento,'id'|'criadoEm'> & {id?: string}): Promise<string>`; `apagarMovimento(id)`; `guardarCategoria(c: Omit<Categoria,'id'|'ordem'> & {id?: string})`; `lerConfig<T>(chave): Promise<T|undefined>`, `gravarConfig(chave, valor)`; `importarCsv(texto: string): Promise<{importados: number; existentes: number; invalidos: number} | {erro: 'cabecalho'}>`.
- [ ] Testes: categorias iniciais criadas uma só vez (9); importar duas vezes o mesmo CSV → segunda vez `importados 0`; categoria desconhecida é criada.
- [ ] Implementar, passar, commit.

### Task 5: Ecrãs, PWA e publicação

**Files:** Create `src/main.tsx`, `src/app.tsx`, `src/estilo.css`, `src/ecras/{Mes,FormMovimento,Evolucao,Definicoes}.tsx`, `src/componentes/*.tsx`, `public/icons/*`, `.github/workflows/pages.yml`; Modify `vite.config.ts` (VitePWA, `base: process.env.BASE ?? '/'`).

- [ ] Ecrãs conforme a spec (texto e comportamentos exatos da secção Ecrãs e Erros); estado via `useLiveQuery` de `dexie-react-hooks` com alias Preact.
- [ ] Aviso de cópia de segurança (> 30 dias); `navigator.storage.persist()` no arranque.
- [ ] `npm run build` sem erros de tipos; commit.

### Task 6: Verificação no browser

- [ ] `npm run dev`, browser a 375×812: registar, editar, apagar, mudar de mês, evolução com/sem categoria, exportar, importar o ficheiro exportado (0 importados), recarregar sem rede após `npm run preview`.
- [ ] Corrigir o que falhar, commit.
