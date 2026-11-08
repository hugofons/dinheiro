# App Dinheiro — especificação

Data: 2026-11-08

## Objetivo

App pessoal, num telemóvel Android, para **registar gastos e receitas à mão** e perceber para onde vai o dinheiro: totais do mês, gastos por categoria e evolução ao longo dos meses. Um único utilizador, em português de Portugal, em euros. Os dados ficam só no telemóvel.

**Sucesso:** registar um gasto em menos de 5 segundos; abrir a app e ver logo quanto se gastou este mês e em quê; ver se os gastos estão a subir ou a descer.

**Fora de âmbito (v1):** ligação ao banco, orçamentos, objetivos de poupança, várias contas, sincronização, várias moedas, movimentos recorrentes.

## Ecrãs

Navegação por uma barra inferior com três separadores — **Mês**, **Evolução**, **Definições** — e um botão **+** flutuante (visível em Mês e Evolução) que abre o formulário de movimento.

### Mês (ecrã inicial)
- Cabeçalho com o mês (ex.: "novembro 2026") e setas ‹ › para mudar de mês. Não deixa avançar para lá do mês atual.
- Três totais: **Gastos**, **Receitas**, **Saldo** (receitas − gastos; verde se ≥ 0, vermelho se < 0).
- **Por categoria:** lista das categorias de despesa com gastos nesse mês, ordenadas do maior para o menor valor, cada uma com barra proporcional à maior, valor e percentagem do total de gastos.
- **Movimentos:** lista do mês, agrupada por dia (mais recente primeiro). Cada linha: cor/nome da categoria, nota (se houver), valor (despesas com "−", receitas com "+"). Tocar abre o formulário em modo edição.
- Mês sem movimentos: mensagem "Ainda não há movimentos neste mês" e indicação do botão +.

### Formulário de movimento (folha/ecrã sobreposto)
- Alternador **Despesa / Receita** (por defeito Despesa).
- **Valor**: campo com teclado numérico (`inputmode="decimal"`), aceita vírgula ou ponto, obrigatório, > 0, até 2 casas decimais, máximo 1 000 000 €.
- **Categoria**: grelha de botões com as categorias visíveis do tipo escolhido; por defeito a última usada nesse tipo.
- **Data**: por defeito hoje; seletor de data nativo.
- **Nota**: texto opcional, até 100 caracteres.
- Botão **Guardar**. Em modo edição: também **Apagar** (com confirmação).
- Ao guardar volta ao ecrã anterior, mostrando o mês do movimento.

### Evolução
- Gráfico de barras dos **últimos 12 meses** (até ao mês atual): barras de gastos e de receitas lado a lado por mês, e uma linha com o saldo mensal.
- Seletor "Todas as categorias" / uma categoria de despesa: com uma categoria escolhida, mostra só as barras de gastos dessa categoria (sem receitas nem saldo).
- Abaixo do gráfico: média mensal de gastos nos 12 meses e comparação do mês atual com o anterior (ex.: "+12 % que outubro").

### Definições
- **Categorias**: lista por tipo; criar (nome + cor de uma paleta fixa), mudar nome/cor, esconder/mostrar. Não se apagam categorias (esconder basta; os movimentos antigos mantêm-se).
- **Cópia de segurança**: Exportar CSV, Importar CSV, data da última exportação.
- Versão da app.

## Dados

Guardados em IndexedDB (via Dexie), base `dinheiro`.

```ts
type Tipo = 'despesa' | 'receita';

interface Categoria {
  id: string;        // uuid
  nome: string;
  tipo: Tipo;
  cor: string;       // hex da paleta
  escondida: boolean;
  ordem: number;
}

interface Movimento {
  id: string;        // uuid
  tipo: Tipo;
  valorCent: number; // inteiro > 0, em cêntimos
  categoriaId: string;
  data: string;      // 'AAAA-MM-DD' (data local)
  nota: string;
  criadoEm: number;  // epoch ms
}
```

Índices: `movimentos` por `data` e `categoriaId`. Definições simples (última exportação, última categoria por tipo) numa tabela `config` chave/valor.

**Categorias iniciais** (criadas na primeira abertura): despesa — Supermercado, Casa, Transportes, Restaurantes, Saúde, Lazer, Outros; receita — Salário, Outras receitas.

**Persistência:** na primeira abertura chama `navigator.storage.persist()`. Se a última exportação tiver mais de 30 dias (ou nunca tiver sido feita e houver movimentos com mais de 30 dias), o ecrã Mês mostra um aviso discreto "Faz uma cópia de segurança" com ligação às Definições.

## CSV

- Codificação UTF-8 com BOM, separador `;`, fim de linha `\r\n`, campos com `;`, `"` ou quebra de linha entre aspas.
- Cabeçalho: `id;data;tipo;categoria;valor;nota`
- `data` em `dd/mm/aaaa`; `tipo` `despesa`/`receita`; `valor` com vírgula decimal e sempre positivo (ex.: `12,50`).
- Nome do ficheiro: `dinheiro-AAAA-MM-DD.csv`.
- **Importar:** junta os movimentos cujo `id` ainda não existe e ignora os restantes. Linhas sem `id` recebem um novo. Categoria inexistente (por nome + tipo) é criada. Linhas inválidas são ignoradas e contadas. No fim mostra "X importados, Y já existiam, Z inválidos".

## Arquitetura

Vite + TypeScript + Preact, Chart.js, Dexie, vite-plugin-pwa. Código em `src/`:

- `src/dominio/` — funções puras, sem IndexedDB nem DOM:
  - `dinheiro.ts` — converter texto ↔ cêntimos e formatar euros (`pt-PT`).
  - `datas.ts` — mês atual, navegar meses, intervalos, nomes de meses.
  - `resumos.ts` — totais do mês, gastos por categoria, série dos 12 meses, médias e comparação.
  - `csv.ts` — gerar e interpretar CSV.
- `src/dados/` — Dexie: esquema, categorias iniciais, operações CRUD, importar.
- `src/ecras/` — componentes Preact: `Mes`, `FormMovimento`, `Evolucao`, `Definicoes`, mais componentes pequenos em `src/componentes/`.
- `src/app.tsx` — navegação entre separadores (estado simples, sem router) e carregamento dos dados com `liveQuery` do Dexie.

**PWA:** manifesto (nome "Dinheiro", `display: standalone`, ícones 192/512 e maskable, cor de tema), service worker que guarda os ficheiros da app para funcionar sem internet e atualiza automaticamente.

**Publicação:** GitHub Actions que faz build e publica no GitHub Pages (`base` configurável). O repositório remoto é criado pelo utilizador.

## Erros

- Validação do formulário mostra a mensagem junto ao campo e não deixa guardar.
- Falha a escrever no IndexedDB: mensagem "Não foi possível guardar. Tenta outra vez." e o formulário mantém os dados.
- IndexedDB indisponível (ex.: modo anónimo): ecrã a explicar que a app precisa de armazenamento.
- CSV com cabeçalho errado: "Este ficheiro não parece ser uma exportação da app." e nada é importado.

## Testes

- Vitest para `src/dominio/` (todos os cálculos e o CSV, incluindo ida e volta exportar → importar) e para a importação em `src/dados/` com `fake-indexeddb`.
- Verificação manual no browser a 375 px de largura: registar, editar, apagar, mudar de mês, evolução, exportar e importar, funcionar sem rede depois de instalada.
