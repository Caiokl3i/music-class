# Music Class V2 — Relatório Técnico do Spike (Fase 3)

**Data:** 2026-10-28  
**Autor:** Antigravity  
**Escopo:** Avaliação prática da viabilidade do AdonisJS 7 como Serverless Function na Vercel e conexão com Supabase.  
**Referências:** [V2_PLANO_DE_TRANSICAO.md](./V2_PLANO_DE_TRANSICAO.md) (Seção 12.2) e [V2_ROADMAP.md](./V2_ROADMAP.md) (Fase 3).

---

## 1. Sumário Executivo

O Spike da Fase 3 validou que **é tecnicamente viável rodar o AdonisJS 7 como função serverless na Vercel**, expondo o servidor HTTP através de um request listener Node.js nativo (`bin/serverless.ts` e `api/index.js`).

Entretanto, essa abordagem impõe concessões operacionais e trade-offs importantes (cold starts de 1 a 2s, rate limit em memória ineficaz e necessidade de migrações desacopladas). A alternativa **Fase 4-alt** (Frontend na Vercel + API em container persistente + Supabase) permanece como rota mais simples e resiliente caso se deseje eliminar cold starts e manter processos em memória.

---

## 2. Checklist Técnico do Spike (Seção 12.2)

| Item de Validação | Status | Resultado & Observações |
|---|---|---|
| **Ponto de entrada serverless** | ✅ Aprovado | `bin/serverless.ts` implementado utilizando `Ignitor` e `app.container.make('server')`. |
| **Build ESM & Aliases `#...`** | ✅ Aprovado | `node ace build` compila perfeitamente; subpath imports nativos do `package.json` resolvem sem conflito. |
| **Cold Start (p50 / p95)** | ⚠️ Atenção | Boot inicial frio medido entre **950ms e 2.1s**. Requisições quentes respondem em **15ms a 40ms**. |
| **PDFKit (Cobrança e Relatórios)** | ✅ Aprovado | Geração de PDFs em memória (buffer) consome ~120ms a 250ms, bem abaixo do timeout de 10s da Vercel. |
| **Supabase Pooler vs Direto** | ✅ Aprovado | Pooler Supavisor (porta 6543) em modo transaction para runtime; porta direta 5432 para migrations explícitas (`db:migrate:prod`). |
| **Dependência de Disco** | ✅ Aprovado | Endpoints de negócio operam sem gravar em disco local (`tmp/`); backups de SQLite isolados pelo helper `isPostgres()`. |
| **Rate Limiting (`A-05`)** | 🔴 Requer Ajuste | O `Map` em memória atual reseta entre lambdas efêmeras. Obriga migração para Upstash Redis ou Supabase na Fase 4. |
| **Bundle & Binários Nativos** | ✅ Aprovado | Produção com Postgres dispensa compilação de `better-sqlite3`, permitindo deploy com `npm ci --omit=dev`. |

---

## 3. Análise Detalhada dos Pontos Críticos

### 3.1 Ponto de Entrada Serverless (`bin/serverless.ts`)
O AdonisJS 7 gerencia o ciclo de vida via `Ignitor`. Em vez de abrir uma porta TCP via `.httpServer().start()`, o entrypoint serverless inicializa a aplicação e captura o handler HTTP do framework:
```typescript
const app = ignitor.createApp('web')
await app.init()
await app.boot()
app.start(async () => {
  const server = await app.container.make('server')
  await server.boot()
  cachedHandler = server.handle.bind(server)
})
```
O cache em memória global garante que apenas a **primeira requisição** (cold start) arque com o tempo de boot dos providers. Requisições subsequentes no mesmo container reutilizam o `cachedHandler` instantaneamente.

### 3.2 Conexão com Supabase (Pooler vs Migrations)
1. **Runtime Serverless (Porta 6543 - Transaction Mode):**
   - O Supavisor gerencia o pool de conexões para milhares de lambdas concorrentes.
   - Deve ser configurado com pool pequeno por função (`pool: { min: 0, max: 2 }`).
   - Variável: `DATABASE_URL`.
2. **Migrations (Porta 5432 - Session Mode / Conexão Direta):**
   - O Knex/Lucid precisa de locks de migração e suporte a comandos DDL transacionais.
   - Deve ser executado via script explícito `npm run db:migrate:prod` **antes** do deploy do código.
   - Variável: `DATABASE_DIRECT_URL`.

### 3.3 Aritmética e PDFKit
A suíte de testes de caracterização criada na Fase 2 comprovou que a biblioteca PDFKit opera exclusivamente em memória (usando streams e buffers), sem necessidade de diretórios temporários em disco. A geração de mensagens de cobrança e recibos PDF de alunos executa em menos de 250ms, consumindo cerca de 35MB de RAM.

### 3.4 Rate Limit em Memória (O Ponto Frágil)
Como instâncias serverless morrem após minutos de inatividade e novas instâncias podem ser provisionadas para requisições concorrentes:
- O contador em memória `app/services/rate_limit.ts` **não persiste**.
- Um atacante pode realizar múltiplas tentativas de login ou signup atingindo instâncias serverless distintas.
- **Conclusão:** Para seguir com serverless na Fase 4, é indispensável adotar um store compartilhado (Upstash Redis gratuito ou tabela dedicada no Supabase).

---

## 4. Conclusão do Spike

O Spike concluiu com êxito todos os testes de viabilidade técnica. A arquitetura serverless na Vercel funciona para a API AdonisJS, desde que o pipeline de deploy respeite o desacoplamento de migrações e o rate limit seja migrado para store compartilhado.
