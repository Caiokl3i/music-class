# Music Class

Gestão para professores particulares de música: alunos, pacotes, agenda, créditos e o que tem a receber no mês.

Cada conta é um estúdio isolado (`user_id` + RLS no PostgreSQL). Um professor não vê os dados do outro.

**Interface** React 19 + Vite · **API** AdonisJS 7 (`/api/v1`) · **Banco** SQLite (local) / Supabase PostgreSQL (produção)

---

## O que o professor faz

- Cadastra alunos (instrumento, horário usual, nível, tags, cor na agenda) e arquiva quem parou
- Vende pacotes (avulsa, mensal 4, mensal 8 — ou tipos personalizados) e aplica descontos
- Agenda aulas, marca falta, faz reposição explícita, conclui e gera a semana de uma vez
- Vê no painel o dia de hoje, atrasadas, a receber, créditos acabando e aniversários
- Cobra por WhatsApp ou recibo em PDF e exporta o fechamento mensal em CSV/PDF
- Exporta dossiê de aluno ou anonimiza dados pessoais em conformidade com a LGPD

Aula padrão: **1 hora**. Crédito válido por **60 dias** após o pagamento. Só a aula concluída conta no progresso; cancelar devolve o crédito.

---

## Arquitetura V2

```text
React 19 + Vite (Vercel)  ── Bearer Token ──►  AdonisJS 7 Serverless (Vercel)
                                                       │
                                                       ├──► Supabase PostgreSQL (Supavisor Pooler :6543 + RLS)
                                                       ├──► Rate Limit Compartilhado (Upstash Redis / Postgres)
                                                       ├──► Sentry Lightweight (Erros Front & Back + x-request-id)
                                                       └──► Backups Diários Automatizados (GitHub Actions ──► S3/R2)
```

> Em desenvolvimento local, o sistema roda sem dependências externas usando SQLite (`tmp/db.sqlite3`) ou via `docker compose up --build`.

---

## Rodar localmente

Requer **Node.js >= 24**. Em dois terminais:

```bash
# 1. API (http://localhost:3333)
cp .env.example .env
node ace generate:key          # cole o valor gerado em APP_KEY no .env
# SIGNUP_INVITE_CODE=uma-frase # vazio mantém o cadastro fechado
npm install
node ace migration:run
npm run dev
```

```bash
# 2. Interface (http://localhost:5173)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Conta de demonstração (`npm run db:seed`, apenas em `development`): `demo@musicclass.test` / `password123`.

---

## Scripts principais

| Comando                       | Descrição                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `npm test`                    | Executa a suíte de testes unitários e funcionais (Japa — SQLite ou `TEST_DB=pg`)          |
| `npm run lint` / `typecheck`  | Validação estática ESLint e TypeScript (`tsc --noEmit`)                                   |
| `npm run build`               | Compila o servidor e o handler serverless (`build/bin/serverless.js`)                     |
| `npm run db:migrate:prod`     | Executa migrations de produção explicitamente via `DATABASE_DIRECT_URL` (`:5432`)         |
| `npm run db:verify:parity`    | Compara contagens, `SUM(price)`, constraints e RLS entre dois bancos PostgreSQL           |
| `npm run smoke:test`          | Valida saúde (`/health`), proteção auth, login, CSV e PDF (`-- --cutover-full` para CRUD) |
| `npm run lgpd:export -- <id>` | Exporta dossiê JSON de um aluno (ou anonimiza com `--anonymize`)                          |
| `npm run cutover:execute`     | Orquestrador oficial de migração V1 -> V2 com backup `SHA-256` e validação de paridade    |
| `npm run cutover:archive-v1`  | Gera arquivo histórico final `.dump` + manifesto contábil antes de desligar a infra V1    |

---

## Produção e Operação

- **Frontend:** Vercel (`Root Directory: frontend`, variável `VITE_API_URL` apontando para a API).
- **API:** Vercel Serverless Functions ([`vercel.json`](vercel.json) + [`api/index.js`](api/index.js)) — com [`Dockerfile`](Dockerfile) mantido funcional como contingência em container persistente.
- **Banco de Dados:** Supabase PostgreSQL (`DATABASE_URL` no Supavisor Pooler `:6543?pgbouncer=true` em runtime e `DATABASE_DIRECT_URL` na porta `:5432` exclusivamente para migrations e backups).

### Documentação operacional (`docs/`)

- [Plano de Transição V1 -> V2](docs/V2_PLANO_DE_TRANSICAO.md) & [Roadmap V2](docs/V2_ROADMAP.md)
- [Guia de Setup de Staging](docs/STAGING_SETUP.md) & [Guia de Setup de Produção](docs/PRODUCTION_SETUP.md)
- [Guia Executivo de Cutover (Fase 7)](docs/CUTOVER_EXECUTION_GUIDE.md) & [Relatório dos Ensaios (Fase 6)](docs/MIGRATION_REHEARSAL_REPORT.md)
- [Runbook Operacional (Deploy, Rollback, Restore e Chaves)](docs/RUNBOOK.md)
- [Governança e Privacidade LGPD](docs/LGPD.md)
- [Architecture Decision Records (`docs/adr/`)](docs/adr/)

---

Licença MIT.
