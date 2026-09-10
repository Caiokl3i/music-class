# Music Class

Sistema de gestão para professores particulares de música: alunos, pacotes de aulas, agenda, créditos, cobrança e relatórios mensais.

Cada conta é um professor (estúdio). Os dados de um professor nunca aparecem para outro. A API é JSON (`/api/v1`); a interface é uma SPA React.

---

## Índice

- [O que o sistema faz](#o-que-o-sistema-faz)
- [Arquitetura](#arquitetura)
- [Requisitos](#requisitos)
- [Começando](#começando)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Modelo de domínio](#modelo-de-domínio)
- [API](#api)
- [Autenticação e autorização](#autenticação-e-autorização)
- [Segurança](#segurança)
- [Banco de dados](#banco-de-dados)
- [Frontend](#frontend)
- [Testes e qualidade](#testes-e-qualidade)
- [Docker](#docker)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Convenções](#convenções)

---

## O que o sistema faz

O professor cadastra alunos, vende pacotes (créditos de aula), agenda horários e acompanha o estúdio no painel.

| Área | Capacidade |
|------|------------|
| Conta | Cadastro com convite, login, perfil, troca de senha, logout |
| Alunos | CRUD, arquivo (soft-archive), nível, cor, horário preferido, tags |
| Tipos de pacote | Catálogo por professor (slug, aulas, preço). Defaults: avulsa, mensal 4, mensal 8 |
| Pacotes | CRUD, status (pendente / pago / cancelado), validade de 60 dias após o pagamento, descontos |
| Aulas | CRUD, reposicionamento de falta (`no_show`), geração semanal a partir de uma data |
| Agenda | Conflito de horário (janelas half-open: aulas encostadas não conflitam) |
| Painel | Totais, receita, pendências, créditos baixos, validade, aniversários, overdue / hoje / amanhã |
| Cobrança | Resumo JSON (texto para WhatsApp) e PDF por pacote |
| Exportação | CSV e PDF do mês do estúdio |

Regras fixas de negócio (hoje):

- Duração padrão da aula: **60 minutos**
- Validade do crédito após pagamento: **60 dias**
- Alerta de crédito baixo: **1** crédito restante
- Alerta de validade: **7** dias
- Token de acesso: **7 dias**

---

## Arquitetura

```text
React SPA (Vite)                    AdonisJS 7 API
localhost:5173  ── Bearer token ──►  localhost:3333/api/v1
                                         │
                    Controllers → Services → Lucid models
                                         │
                                    SQLite (tmp/db.sqlite3)
```

- **Backend:** AdonisJS 7, Lucid ORM, VineJS, autenticação por access token, Shield, CORS.
- **Frontend:** React 19, Vite, Tailwind, React Router, Axios. Token em `sessionStorage`.
- **Banco:** SQLite via `better-sqlite3`. Arquivo em `tmp/db.sqlite3`. Testes usam `:memory:`.
- **Deploy previsto:** um processo Node + um arquivo SQLite. Rate limit é in-memory (adequado a esse modelo).

Não há filas, Redis, e-mail, upload de arquivos nem papéis (admin/assistente). Isolation é sempre `userId` via `user.related(...)`.

---

## Requisitos

| Item | Versão |
|------|--------|
| Node.js | **>= 24** (API e Docker). Frontend local aceita 20+, mas o monorepo assume 24. |
| npm | lockfile do projeto (`package-lock.json`) |
| Sistema | Linux, macOS ou WSL2. `better-sqlite3` precisa de toolchain nativa se o binário pré-compilado falhar. |

---

## Começando

### 1. API

Na raiz do repositório:

```bash
cp .env.example .env
node ace generate:key
```

Preencha `APP_KEY` com a chave gerada. Para abrir o cadastro, defina um convite:

```bash
SIGNUP_INVITE_CODE=uma-frase-secreta
```

Se `SIGNUP_INVITE_CODE` estiver vazio, o signup responde **403** (`E_SIGNUP_CLOSED`).

```bash
npm install
node ace migration:run
npm run dev
```

A API sobe em `http://localhost:3333`. `GET /` responde `{ "ok": true }`.

Conta de demonstração (somente `NODE_ENV=development`):

```bash
npm run db:seed
```

| Campo | Valor |
|-------|--------|
| E-mail | `demo@musicclass.test` |
| Senha | `password123` |

O seeder é idempotente: apaga só os dados dessa conta e recria um estúdio com os estados do painel (aula de hoje, atrasada, pendência, crédito baixo, etc.).

### 2. Frontend

Em outro terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Abra `http://localhost:5173`. O cliente chama `${VITE_API_URL}/api/v1` (`VITE_API_URL` padrão: `http://localhost:3333`).

### Scripts da API

| Comando | Função |
|---------|--------|
| `npm run dev` | Servidor com HMR (`node ace serve --hmr`) |
| `npm start` | Produção (`node bin/server.js`) após `npm run build` |
| `npm run build` | Compila para `build/` |
| `npm test` | Suite Japa (unit + functional) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run db:seed` | Seeder demo (development) |
| `npm run db:backup` | Cópia consistente do SQLite (`VACUUM INTO`) |
| `npm run rebuild:native` | Recompila `better-sqlite3` (útil no WSL após troca de Node) |

Comandos Ace frequentes:

```bash
node ace migration:run
node ace migration:rollback
node ace migration:status
node ace generate:key
node ace list
```

---

## Variáveis de ambiente

Definidas e validadas em [`start/env.ts`](start/env.ts). Modelo em [`.env.example`](.env.example).

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `NODE_ENV` | sim | `development` \| `production` \| `test` |
| `HOST` | sim | Host HTTP (`localhost` ou `0.0.0.0`) |
| `PORT` | sim | Porta HTTP (padrão 3333) |
| `APP_KEY` | sim | Segredo da aplicação (criptografia / cookies). Nunca commitar. |
| `APP_URL` | sim | URL pública da API |
| `LOG_LEVEL` | sim | Nível do logger Pino (`info`, `debug`, …) |
| `SESSION_DRIVER` | sim | `cookie` \| `memory` \| `database` (a API autenticada usa Bearer; session existe por causa do Shield) |
| `APP_NAME` | não | Nome no logger (padrão `app`) |
| `CORS_ORIGIN` | produção | Origens permitidas, separadas por vírgula. Em development qualquer origem é aceita. Vazio em production = nenhuma origem cross-origin. |
| `SIGNUP_INVITE_CODE` | não | Frase do convite. Vazio = cadastro fechado. |
| `RATE_LIMIT_ENABLED` | não | `1`/`true` liga, `0`/`false` desliga. Sem valor: ligado, **exceto** em `test`. |
| `BACKUP_DIR` | não | Destino de `npm run db:backup` (padrão `./backups`) |
| `TZ` | recomendado | `UTC` no exemplo e no Docker. Datetimes do Lucid/SQLite são gravados sem fuso. |

Frontend ([`frontend/.env.example`](frontend/.env.example)):

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | Base da API **sem** `/api/v1` |

---

## Modelo de domínio

```text
User (professor)
 ├── Student          (arquivo via archived_at)
 ├── PlanType         (catálogo: slug + aulas + preço)
 ├── Plan             (pacote vendido a um aluno)
 │    ├── PlanDiscount
 │    └── Lesson
 └── Lesson           (também ligada a Student e Plan)
```

**Pacote (`Plan`)**

- `lessonsTotal` e `price` vêm do tipo de pacote no momento da criação/troca.
- Status: `pending` | `paid` | `cancelled`.
- `paidAt` e `expiresAt` (60 dias após o pagamento, se não houver validade anterior).
- Crédito consumido = aulas **não canceladas**. Aula `done` conta no progresso; `cancelled` libera o crédito.

**Aula (`Lesson`)**

- Status: `scheduled` | `done` | `cancelled` | `no_show`.
- `endsAt` preenchido no save se vier vazio (duração padrão).
- Reposicionar: só `no_show` → cancela a original e cria outra `scheduled` (mesmo crédito líquido).
- Geração semanal: cria até o crédito restante ou até `expiresAt`.

**Isolamento**

Toda leitura/escrita de recurso passa por `user.related(...)` ou `where('userId', user.id)`. Acesso cruzado devolve **404**, não 403 (não confirma que o id existe em outra conta).

---

## API

Prefixo: `/api/v1`. Respostas JSON da aplicação usam `{ "data": ... }` via serializer, exceto logout/senha (`{ "message": ... }`) e downloads (CSV/PDF).

### Público

| Método | Caminho | Limite | Notas |
|--------|---------|--------|-------|
| `GET` | `/` | — | Health `{ ok: true }` |
| `POST` | `/api/v1/auth/signup` | 5 / 15 min | Exige `inviteCode` |
| `POST` | `/api/v1/auth/login` | 10 / 15 min (IP) + 15 / 15 min (e-mail) | Retorna `user` + `token` |

### Autenticado (`Authorization: Bearer <token>`)

Grupo geral: **240 req / 15 min** por IP e por usuário.

| Método | Caminho | Extra |
|--------|---------|-------|
| `GET` `PATCH` | `/account/profile` | |
| `PUT` | `/account/password` | 5 / 15 min; revoga os outros tokens |
| `POST` | `/account/logout` | Apaga o token atual |
| `GET` | `/dashboard` | Query `timezone` |
| `GET` | `/export` | CSV; 15 / 15 min; query `month`, `timezone` |
| `GET` | `/export.pdf` | PDF; 15 / 15 min |
| `GET` | `/packages` | Catálogo efetivo do professor |
| | `/students` | resource apiOnly + arquivo via `?archived=` |
| `GET` `POST` | `/students/:studentId/lessons` | Nested |
| | `/plan-types` | resource apiOnly |
| | `/plans` | resource apiOnly; `?studentId=` |
| `POST` | `/plans/:id/lessons/generate` | 10 / 15 min |
| `GET` | `/plans/:id/billing` | Query `month`, `timezone` |
| `GET` | `/plans/:id/billing.pdf` | 15 / 15 min |
| `POST` `PATCH` `DELETE` | `/plans/:planId/discounts[/:id]` | |
| | `/lessons` | resource apiOnly; `?studentId=` `?planId=` |
| `POST` | `/lessons/:id/reposition` | |

Validação de body e query: VineJS em [`app/validators/`](app/validators/). Datas ISO viram Luxon `DateTime` ([`start/validator.ts`](start/validator.ts)).

Códigos de erro de domínio (exemplos): `E_INVALID_INVITE`, `E_SIGNUP_CLOSED`, `E_TOO_MANY_REQUESTS`, `E_PLAN_NO_CREDITS`, `E_PLAN_EXPIRED`, `E_LESSON_SCHEDULE_CONFLICT`, `E_LESSON_STUDENT_MISMATCH`.

---

## Autenticação e autorização

- Guard padrão: **access tokens** (`config/auth.ts`). Guard `web` (session) existe, mas a SPA não o usa.
- Login: `User.verifyCredentials` (scrypt) → token com abilities `['*']` e expiração de 7 dias.
- Troca de senha e criação de conta + catálogo padrão rodam em `db.transaction`.
- Não há Bouncer/Policies: não existem papéis. A autorização é ownership.

O frontend guarda o token em **`sessionStorage`** (some ao fechar a aba). Em **401** a sessão local é limpa.

---

## Segurança

| Camada | Comportamento |
|--------|----------------|
| Auth | Bearer token; senha com `serializeAs: null`; transformers com `pick` (sem senha) |
| Convite | Comparação timing-safe do código; signup fechado se o env estiver vazio |
| Rate limit | Janela fixa in-memory; headers `X-RateLimit-*` e `Retry-After` no 429 |
| CORS | Livre em development; allowlist `CORS_ORIGIN` em production |
| CSRF | Desligado (API Bearer). Adequado a este cliente. |
| Headers | Shield (X-Frame DENY, HSTS, nosniff) + Referrer-Policy / Permissions-Policy |
| Upload | Não há rotas de arquivo; body JSON limitado a 1 MB |
| SQL | Query builder Lucid. Raw só em backup (`VACUUM INTO` com path escapado) e aniversário (`strftime`) |
| Logs | Eventos de segurança estruturados (`event`, `userId`). Sem senha, token ou convite. |

O limiter **não** é compartilhado entre processos. Vários workers Node invalidam o desenho atual (SQLite single-writer + buckets em memória).

---

## Banco de dados

- Arquivo: `tmp/db.sqlite3` (criado nas migrations).
- Schema gerado: [`database/schema.ts`](database/schema.ts) — não editar à mão.
- Migrations em [`database/migrations/`](database/migrations/).

```bash
node ace migration:run
node ace migration:rollback
```

Backup consistente (processo separado, não pela API):

```bash
npm run db:backup          # guarda em ./backups, mantém 14 cópias
npm run db:backup -- 30    # mantém 30
```

Usa `VACUUM INTO` (snapshot consistente). `BACKUP_DIR` altera o destino.

---

## Frontend

Documentação específica: [`frontend/README.md`](frontend/README.md).

Telas: login, signup, dashboard, alunos, ficha do aluno, pacotes, aulas (lista + calendário), perfil.

```bash
cd frontend
npm run dev       # http://localhost:5173
npm run build     # typecheck + Vite
npm run preview
```

Em production, configure `CORS_ORIGIN` na API para a origem do frontend e `VITE_API_URL` no **build** do Vite (é embutido no bundle).

---

## Testes e qualidade

A suite Japa cobre autenticação, IDOR (404 entre professores), validação, créditos, agenda, dashboard, export, rate limit e backup.

```bash
npm test
npm run typecheck
```

- Functional: sobe HTTP + migrate + truncate por teste.
- Unit: regras puras (créditos, CSV, convite, limiter).
- Rate limit desligado por padrão em `NODE_ENV=test`.

---

## Docker

[`docker-compose.yml`](docker-compose.yml) sobe API + frontend (nginx).

```bash
export APP_KEY='chave-com-pelo-menos-32-caracteres'
# opcional: export SIGNUP_INVITE_CODE='seu-convite'
docker compose up --build
```

| Serviço | URL |
|---------|-----|
| App | http://localhost:8080 |
| API | http://localhost:3333 |

- Volume `api_data` → `/app/tmp` (SQLite).
- Volume `api_backups` → `/app/backups`.
- Entrypoint da API roda `migration:run --force` e depois o servidor.
- Healthcheck: `GET /`.
- Bind das portas em `127.0.0.1` (não expõe na LAN por padrão).

`APP_KEY` é obrigatória no compose. Sem ela o container não sobe.

---

## Estrutura do repositório

```text
.
├── app/
│   ├── controllers/     # HTTP: validam, chamam services, serializam
│   ├── services/        # Regras de negócio (créditos, agenda, PDF, limiter)
│   ├── models/          # Lucid (relacionamentos)
│   ├── validators/      # VineJS
│   ├── transformers/    # Shape da API
│   ├── middleware/      # auth, throttle, JSON, headers
│   └── exceptions/      # Handler HTTP
├── config/              # auth, cors, database, shield, logger, …
├── database/
│   ├── migrations/
│   ├── seeders/         # demo (development)
│   └── schema.ts        # gerado
├── start/               # routes, kernel, env, validator
├── providers/           # serializer { data }
├── tests/               # unit + functional
├── frontend/            # SPA
├── docker/              # entrypoint da API
├── bin/                 # server, ace, backup, testes
├── Dockerfile
└── docker-compose.yml
```

Código gerado (não editar): `.adonisjs/`, `database/schema.ts`.

---

## Convenções

- Controllers finos; regra de negócio em services; queries via Lucid (`related`, `preload`, `withCount`, `firstOrFail`).
- Sem repository layer e sem Policies — o tamanho do domínio não pede.
- Listas da API **não** são paginadas: o calendário e as telas da SPA esperam o conjunto do professor.
- Export, overlap e dashboard filtram datas no banco (janela) e fecham o critério de fuso em memória — o SQLite do Lucid grava datetime sem offset.
- Não commitar `.env`, `tmp/db.sqlite3`, `backups/` nem `APP_KEY`.
- Preferir `ctx.logger` / `logSecurityEvent` a `console.*` na API.

Licença: MIT (veja `package.json`).
