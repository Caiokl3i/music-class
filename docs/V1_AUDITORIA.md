# Music Class — Auditoria da V1

Data: 2026-10-26 · Escopo: revisão estática da estrutura, configuração, deploy, schema, rotas, testes e pontos críticos.

> [!NOTE]
> **Limites desta auditoria:** foi feita por leitura de código. Não consegui executar comandos (testes, `npm audit`, git log), então **não há dados de cobertura, vulnerabilidades de dependências ou histórico git**. Esses itens estão marcados como **[Verificar]** na seção 9. Nem todos os arquivos foram lidos linha a linha (ex.: controllers de alunos/aulas, validators, frontend `pages/`); itens marcados _[Verificar]_ precisam de confirmação.

---

## 1. Resumo executivo

A V1 tem **base sólida**: arquitetura em camadas clara, isolamento por usuário (multi-tenant), rate limit por operação, validação com VineJS, auth por token com expiração, testes funcionais e unitários, Docker multi-stage com usuário não-root, e domínio bem separado em `services/`.

Os principais riscos são **operacionais** (dados, deploy, observabilidade), não de código:

| #    | Severidade | Tema                                                                                         |
| ---- | ---------- | -------------------------------------------------------------------------------------------- |
| A-01 | 🔴 Alta    | Migrations rodam automaticamente a cada boot em produção, sem backup/gate                    |
| A-02 | 🔴 Alta    | Sem CI/CD: nada impede merge/deploy com testes quebrados                                     |
| A-03 | 🟠 Média   | Backup de produção (Postgres) inexistente/incerto; funcionalidade existente só cobre SQLite  |
| A-04 | 🟠 Média   | Testes rodam só em SQLite, produção usa Postgres                                             |
| A-05 | 🟠 Média   | Rate limit em memória (reseta a cada deploy/sleep; não escala a +1 instância)                |
| A-06 | 🟠 Média   | Token de sessão no frontend (Bearer em storage do navegador) → exposto a XSS                 |
| A-07 | 🟡 Baixa   | Sem observabilidade (erros, métricas, uptime)                                                |
| A-08 | 🟡 Baixa   | Sem staging; health check superficial                                                        |
| A-09 | 🟡 Baixa   | Higiene do repositório / dependências bleeding-edge                                          |
| A-10 | 🔴 Alta    | **(Nova V2)** AdonisJS é servidor persistente; rodar na Vercel (serverless) exige validação  |
| A-11 | 🔴 Alta    | **(Nova V2)** Código assume disco local (SQLite, `tmp/`, `backups/`) e memória compartilhada |
| A-12 | 🟠 Média   | **(Nova V2)** Conexão com Supabase em serverless (pooler, SSL, prepared statements)          |
| A-13 | 🟠 Média   | **(Nova V2)** Segurança do Supabase (RLS, Data API, `service_role`) e limites do plano       |

---

## 2. Visão geral do sistema

- **Backend:** AdonisJS 7 (ESM, TypeScript 6), Lucid ORM, VineJS, `@adonisjs/auth` (access tokens), shield, cors, session.
- **Frontend:** React + Vite + TypeScript (`frontend/`), Axios, servido por nginx (Docker) ou Vercel.
- **Banco:** SQLite (dev/test) / PostgreSQL (produção, Render).
- **Infra:** Render (API, Docker) + Vercel (site). `docker-compose.yml` para rodar local completo.
- **Integrações:** Resend (e-mail de backup), PDFKit (PDF).
- **Domínio:** `User → Student → Plan → Lesson`, `PlanType`, `PlanDiscount`.

Estrutura backend: `app/{controllers,services,models,validators,transformers,middleware,exceptions,cli}`, `database/{migrations,seeders}`, `start/`, `config/`, `tests/{functional,unit}`.

Rotas (`start/routes.ts`): `/api/v1/auth/{signup,login}`, `/api/v1/account/*`, e recursos `students`, `plans`, `plan-types`, `lessons`, `dashboard`, `export`, `packages`, todos atrás de `auth` + `throttle`.

---

## 3. Pontos fortes (preservar na V2)

- ✅ **Isolamento por tenant**: consultas passam por `user.related(...)` (ex.: `findOwnedPlan`, `findOwnedStudent`), evitando acesso a dados de outro professor (IDOR).
- ✅ **Rate limit granular** por operação (login, signup, export, generate, backup...).
- ✅ **Cadastro fechado por convite** (`SIGNUP_INVITE_CODE`).
- ✅ **Lógica de negócio isolada** em `services/` (créditos, validade, cobrança, agenda), com testes unitários.
- ✅ **Regras de integridade** (`assertCanCancelPlan`, `assertCanDeletePlan`...).
- ✅ **Dinheiro em `decimal(8,2)`** no banco (não float). _[Verificar]_ se o JS não faz aritmética com `number` ao somar descontos/valores (risco de arredondamento).
- ✅ Docker multi-stage, usuário **não-root**, `.dockerignore`, healthcheck.
- ✅ `.env` ignorado; `.env.example` documentado; secrets via `sync: false` no `render.yaml`.
- ✅ Log de eventos de segurança (`security_log`), tokens com expiração de 7 dias, revogação de outros tokens ao trocar senha.
- ✅ 12 specs funcionais + 8 unitários.

---

## 4. Achados detalhados

### A-01 🔴 Migrations automáticas a cada boot

- **Onde:** [docker/api-entrypoint.sh](../docker/api-entrypoint.sh) → `node ace migration:run --force`.
- **Risco:** qualquer migration com bug ou destrutiva (ex.: `replace_plans_package_column`, `convert_student_colors_to_hex` já mostram padrão de transformação de dados) executa em produção no primeiro deploy, sem backup nem aprovação. Se falhar, a API **não sobe** (downtime).
- **Recomendação:** backup antes de deploy com migration; testar em staging com dump; padrão _expand/contract_; considerar separar migration do boot (ex.: _pre-deploy command_ do Render) para falhar sem derrubar a versão antiga.
- **Impacto Vercel/Supabase:** na Vercel não há boot de servidor, então esse mecanismo **precisa ser substituído** por um passo explícito (CI/manual, conexão direta ao Supabase) _antes_ do deploy. O risco some se isso for feito direito; vira risco novo se for esquecido (código novo rodando com schema antigo).

### A-02 🔴 Sem CI/CD

- Não há `.github/workflows` (nem outro pipeline). Lint, typecheck e testes dependem de lembrar de rodar.
- **Recomendação:** GitHub Actions: `lint`, `typecheck`, `test`, build do frontend, `docker build`. Exigir verde para merge.

### A-03 🟠 Backup de produção

- README: o backup por e-mail é para **SQLite**; em Postgres (produção) _[Verificar]_ o que o botão faz.
- O diretório `backups/` está vazio e ignorado (correto para o repo).
- **Recomendação:** habilitar backups automáticos do Postgres (plano pago do Render ou `pg_dump` agendado para storage externo), testar restauração, documentar em `RUNBOOK.md`. Verificar se o plano do banco gratuito do Render **expira** (bancos free do Render são removidos após período limitado).
- **Impacto Supabase:** os backups passam a depender do plano do Supabase (conferir backups diários/PITR no plano atual; projetos gratuitos podem ser pausados por inatividade). O botão de backup por e-mail (SQLite) fica sem função em produção.

### A-04 🟠 Divergência SQLite × Postgres

- `database/connection.ts`: em teste **sempre SQLite**; produção Postgres.
- Riscos: tipos `enum`/`decimal`, comparação de datas/timezones, `LIKE` case-sensitive, `GROUP BY`, funções de data, booleanos.
- **Recomendação:** rodar a suíte também contra Postgres (service container no CI) e, idealmente, usar Postgres no dev (docker compose).

### A-05 🟠 Rate limit em memória

- [app/services/rate_limit.ts](../app/services/rate_limit.ts): `Map` em memória. Reseta em cada deploy/restart e não é compartilhado entre instâncias; atrás de proxy (Render) o IP depende de `trustProxy` _[Verificar em `config/app.ts`]_ — se mal configurado, todos usuários compartilham o mesmo IP (limite global) ou o IP é forjável.
- Aceitável hoje (1 processo). Revisitar se escalar para >1 instância (Redis/DB).
- **Impacto Vercel:** em serverless cada instância tem seu próprio `Map` e elas morrem a todo momento. **O rate limit atual deixa de proteger** login/signup (força bruta). Na V2 é **obrigatório** mover para store compartilhado (Upstash Redis/Vercel KV ou tabela no Supabase).

### A-06 🟠 Token no navegador

- Frontend usa `Authorization: Bearer` com `getStoredToken()` ([frontend/src/services/api.ts](../frontend/src/services/api.ts), `utils/token`). _[Verificar]_ se está em `localStorage` (vulnerável a XSS) ou memória/cookie.
- **Recomendação V2:** cookie `HttpOnly + Secure + SameSite` (a API já tem session/shield) ou manter Bearer com CSP estrita e sanitização. Revisar CSP em `config/shield.ts` e `nginx.conf`.

### A-07 🟡 Observabilidade

- Só logs Pino. Sem rastreio de erros (ex.: Sentry), sem uptime monitor, sem alertas.
- **Recomendação:** Sentry (free tier) front + back; UptimeRobot/Better Stack no `/`; logs com request-id.

### A-08 🟡 Health check e staging

- `healthCheckPath: /` retorna `{ok:true}` sem checar o banco. A API pode estar "saudável" com o DB fora.
- **Recomendação:** `/health` que faça `SELECT 1`. Criar ambiente de staging (ver plano de transição).

### A-09 🟡 Higiene e dependências

- `package.json` com `version: "0.0.0"` — adotar SemVer/tag.
- Dependências muito novas (Node ≥24, TypeScript 6, ESLint 10): ótimo, mas verifique compatibilidade/suporte LTS. O Dockerfile instala `python3 make g++` **também na imagem final** (necessário só para `better-sqlite3`; aumenta superfície e tamanho). Em produção com Postgres, avaliar remover `better-sqlite3`/toolchain da imagem final.
- Dockerfile de build escreve um `.env` fictício na imagem de build (ok, não vai para a final, mas manter o cuidado).
- Existem `build/`, `tmp/`, `frontend/dist` locais — ignorados corretamente? `frontend/.gitignore` _[Verificar]_ inclui `dist`.
- `.cursor/rules` existe no repo: decidir se versiona regras de IDE.
- `CORS_ORIGIN` e `APP_URL` são `sync: false` — documentar como obrigatórios no runbook.

---

## 4.1 Achados novos pela mudança para Vercel + Supabase

### A-10 🔴 Adonis em serverless

- A API (`bin/server.js`, `ace`, aliases `#...`, ESM, Node ≥24) foi projetada para processo contínuo com boot de providers/rotas. Em serverless isso vira _cold start_ a cada instância nova.
- A Vercel não oferece suporte oficial de primeira classe ao AdonisJS _[Verificar na documentação atual da Vercel]_. É preciso adaptar o ponto de entrada.
- **Recomendação:** spike em staging (plano de transição, 12.2) **antes** de se comprometer. Alternativa de menor risco: frontend na Vercel, API em host de servidor persistente, banco no Supabase.

### A-11 🔴 Dependências de disco e memória

- `better-sqlite3` (binário nativo) e `tmp/db.sqlite3` não funcionam em disco somente-leitura; `services/sqlite_backup.ts`, `backup_files.ts`, `backup_email.ts` e `bin/db_backup.ts` assumem arquivos locais.
- `database/connection.ts` cai para SQLite se não houver `DATABASE_URL`: em produção isso seria um **erro silencioso** (app "funciona" gravando em disco efêmero). **Recomendação:** em produção, falhar o boot se `DATABASE_URL` não existir.
- PDFKit (`billing_message.ts`, `month_export.ts`, `pdf_layout.ts`): checar tamanho do bundle, fontes e tempo de execução vs. limite da função.
- Dockerfile/`render.yaml`/`docker-compose` deixam de ser o caminho de produção (manter para dev/rollback).

### A-12 🟠 Supabase em serverless

- Usar o **pooler** (Supavisor) para runtime e conexão direta só para migrations. Em modo _transaction_ não há _prepared statements_ de sessão: validar com o driver `pg`/Knex.
- Pool mínimo por função (evitar esgotar conexões), SSL, região próxima da função.
- Testes só em SQLite (A-04) ficam ainda mais arriscados: **testar contra Postgres** é pré-requisito do cutover.
- Revisar migrations que usam `enum`, `decimal` e conversões de dados (`replace_plans_package_column`, `convert_student_colors_to_hex`) contra o Postgres do Supabase com dump real.

### A-13 🟠 Segurança e limites do Supabase

- Todas as tabelas devem ter **RLS ativado** (sem policies públicas) e a Data API desativada/restrita se não usada; caso contrário a chave `anon` pública pode expor dados. O isolamento atual (`user.related(...)`) é feito na aplicação, o que continua valendo.
- `service_role` e connection string só no servidor (variáveis da Vercel por ambiente, nunca `VITE_*`).
- Conferir limites/pausa por inatividade/backups do plano e limites de tempo/memória/banda da Vercel _[Verificar nos planos atuais]_.
- **Migração de dados:** `APP_KEY` precisa ser a mesma para não invalidar tokens; validar a cópia por contagens e somas (`SUM(price)`).

---

## 5. Banco de dados

- 18 migrations, ordem cronológica consistente. Colunas de tenant `user_id` presentes em todas as tabelas de domínio, com `onDelete CASCADE`.
- Pontos a **[Verificar]**: índices (existe `add_lookup_indexes`), constraints `CHECK` (ex.: `lessons_total > 0`, `price >= 0`), unicidade (`plan_types.slug` por usuário), `tags`/`instruments` como string (CSV/JSON em texto — limita consultas).
- `database/schema.ts` é **gerado**; não editar à mão.
- `plans.package` foi migrado de enum para slug (`plan_types`) — verificar que não restam referências legadas.
- Timestamps: `TZ=UTC` e `studio_timezone` — bom; validar conversões de fuso em lembretes/aulas perto da meia-noite.

---

## 6. Segurança (checklist)

| Item                                   | Estado                                                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Autenticação                           | ✅ Access tokens com expiração                                                                                                     |
| Hash de senha                          | ✅ via `withAuthFinder(hash)` _[Verificar algoritmo em `config/hash.ts` (scrypt/argon2)]_                                          |
| Autorização / tenant                   | ✅ escopo por usuário                                                                                                              |
| Validação de entrada                   | ✅ VineJS                                                                                                                          |
| Rate limiting                          | ✅ (em memória)                                                                                                                    |
| CORS                                   | ✅ por env em produção                                                                                                             |
| Headers (shield/CSP)                   | _[Verificar]_                                                                                                                      |
| Segredos no repo                       | ✅ `.env` ignorado — **[Verificar no histórico git]** se algum segredo já foi commitado (`git log -p -- .env`) e rotacionar se sim |
| Enumeração de usuários no login/signup | _[Verificar]_ mensagens genéricas                                                                                                  |
| Política de senha                      | _[Verificar]_ `auth_credentials.ts`                                                                                                |
| Logs sem dados sensíveis               | ✅ parcialmente (`security_log`) — conferir PII (telefone, e-mail)                                                                 |
| LGPD                                   | ⚠️ Armazena dados pessoais (alunos, possivelmente menores): definir política de privacidade, exportação e exclusão de dados        |
| Dependências                           | _[Verificar]_ `npm audit`                                                                                                          |

---

## 7. Testes e qualidade

- Backend: 12 specs funcionais (cobrem auth, planos, aulas, alunos, dashboard, export, backup, rate limit...) e 8 unitários (regras de créditos, agenda, cobrança, exportação).
- Pontos a **[Verificar]**: cobertura real; frontend **sem** diretório de testes visível (apenas lint com oxlint) → refatorações de UI serão arriscadas.
- **Recomendação:** adicionar testes de caracterização nas telas críticas (Vitest + Testing Library) e 2–3 testes E2E (Playwright): login, criar aluno→pacote→aula, cobrança.

---

## 8. Frontend (visão limitada)

Estrutura boa: `components, contexts, domain, layouts, pages, routes, services, types, utils`. Há camada `domain/` (positivo). Item a revisar: tamanho dos componentes de `pages/`, duplicação de regras de negócio no cliente vs. servidor (créditos/validade), acessibilidade e responsividade (uso predominante em celular por professores?), estado offline/erros de rede.

---

## 9. Verificações pendentes (rodar antes de começar a V2)

```bash
# Saúde geral
npm ci && npm run lint && npm run typecheck && npm test
cd frontend && npm ci && npm run build && npm run lint

# Dependências
npm audit --omit=dev
cd frontend && npm audit --omit=dev
npm outdated

# Segredos no histórico
git log --all --oneline -- .env .env.production
git log -p --all -S'RESEND_API_KEY=re_' | head

# Estado do git
git status && git log --oneline -n 30 && git branch -a

# Cobertura (se configurar c8)
npx c8 node ace test
```

Também conferir manualmente: `config/app.ts` (`trustProxy`), `config/shield.ts` (CSP/HSTS), `config/hash.ts`, `frontend/src/utils/token.ts`, plano do banco no Render (expiração/backup), e logs de produção dos últimos 30 dias (erros 500 recorrentes).

---

## 10. Backlog priorizado para o início da V2

**Antes de qualquer feature (Fase 0–1)**

1. Tag `v1.0.0` + branch `release/v1` + backup restaurável (A-03)
2. CI no GitHub Actions (A-02)
3. Staging (Vercel preview + projeto Supabase separado) + dump anonimizado (A-08)
4. Migrations fora do boot, como passo explícito (A-01)
5. **Spike Vercel + Supabase** (A-10, A-11, A-12) → decisão via ADR
6. Falhar o boot em produção sem `DATABASE_URL`; remover dependência de disco (A-11)
7. Rate limit em store compartilhado (A-05)
8. RLS no Supabase e segredos por ambiente (A-13)
9. **Cutover** conforme seção 12.6 do plano de transição

**Endurecimento (Fase 2)** 5. Testes também em Postgres (A-04) 6. `/health` com checagem de DB (A-08) 7. Sentry + uptime monitor (A-07) 8. Revisar token/CSP (A-06) e `trustProxy` (A-05) 9. Rodar verificações da seção 9 e tratar achados

**Qualidade (Fase 3)** 10. Testes de frontend + E2E de fluxo crítico 11. Revisar dinheiro (decimal vs `number` em JS), CHECK constraints, índices 12. Limpar Dockerfile final (toolchain/SQLite), SemVer, CHANGELOG, ADRs

**Produto/LGPD** 13. Política de privacidade, exportar/excluir dados de aluno
