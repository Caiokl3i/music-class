# Music Class V2 — Guia de Configuração: Produção Supabase + Vercel (Fase 6.1)

Este documento detalha o provisionamento e a blindagem do ambiente de **Produção V2** no **Supabase** e na **Vercel**, cumprindo a **Tarefa 6.1** do [V2_ROADMAP.md](file:///home/caiokl3i/music-class/docs/V2_ROADMAP.md) e preparando a infraestrutura receptora para o Cutover da Fase 7.

---

## 1. Projeto Supabase de Produção (`music-class-prod`)

> [!IMPORTANT]
> O projeto de Produção do Supabase é **completamente isolado** do projeto de Staging (`music-class-staging`). Nunca reutilize senhas de banco ou strings de conexão entre os dois ambientes.

### 1.1 Provisionamento e Região

1. Acesse o painel do [Supabase](https://supabase.com/dashboard) e clique em **New Project**.
2. Preencha os parâmetros obrigatórios:
   - **Name:** `music-class-prod`
   - **Database Password:** Gere uma senha aleatória de alta entropia (>= 32 caracteres alfanuméricos, sem caracteres especiais que precisem de URL-encoding complexo como `@`, `#`, `?` ou `/`) e salve imediatamente no gerenciador de senhas.
   - **Region:** **`South America (São Paulo) — sa-east-1`** _(mesma região da função serverless `gru1` na Vercel e da origem V1 no Neon, minimizando a latência por query em modo serverless)_.
   - **Pricing Plan:** Conforme [ADR 0002](file:///home/caiokl3i/music-class/docs/adr/0002-decisao-plano-hospedagem.md) (Free Tier com salvaguardas ativas da Fase 5: backup diário externo para S3/R2 + keep-alive diário em `/health`, ou Pro quando houver escala comercial).

### 1.2 Obtenção das Strings de Conexão

Em **Project Settings -> Database -> Connection string**, copie as duas URLs distintas:

1. **Runtime Serverless — Supavisor Transaction Mode (Porta `6543`):**
   Utilizada pela API na Vercel (`DATABASE_URL`) com pool enxuto (`DB_POOL_MAX=2`):
   ```env
   DATABASE_URL="postgres://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```
2. **Migrations, `pg_restore` e Backups — Session / Direct Mode (Porta `5432`):**
   Utilizada **exclusivamente** por `npm run db:migrate:prod`, `scripts/rehearse_cutover.sh` e pelos workflows de backup (`DATABASE_DIRECT_URL`):
   ```env
   DATABASE_DIRECT_URL="postgres://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
   ```

### 1.3 Blindagem de Segurança: RLS e Data API (`PostgREST`)

Como o Music Class V2 utiliza o Supabase **exclusivamente como banco PostgreSQL** via conexão autenticada de servidor (Lucid/`pg`), nenhuma tabela deve ficar exposta via API pública do Supabase:

1. **Row Level Security (RLS) Obrigatório:**
   A migration `1786578000000_enable_rls_all_tables.ts` ativa `ENABLE ROW LEVEL SECURITY` sem políticas públicas nas **8 tabelas** do sistema:
   - `users`
   - `auth_access_tokens`
   - `students`
   - `plans`
   - `lessons`
   - `plan_types`
   - `plan_discounts`
   - `rate_limit_buckets`
2. **Desativar / Restringir a Data API:**
   - No painel do Supabase, acesse **Project Settings -> API -> Data API Settings**.
   - Desmarque o schema `public` em **Exposed schemas** (ou desative **Enable Data API**).
   - **Nunca** exponha `SUPABASE_SERVICE_ROLE_KEY` em variáveis do frontend (`VITE_*`) nem no repositório. A aplicação não utiliza chaves da API REST do Supabase.
3. **Verificação Automática Pós-Migração:**
   Sempre rode `npm run db:verify:parity -- --post-migrate` após restaurar o dump e aplicar as migrations; o verificador consulta `pg_class.relrowsecurity` diretamente no catálogo do PostgreSQL e falha caso qualquer uma das 8 tabelas esteja sem RLS.

---

## 2. Variáveis de Ambiente na Vercel (Escopo `Production`)

No painel da Vercel (**Settings -> Environment Variables**), cadastre as variáveis abaixo marcando **exclusivamente** o ambiente **`Production`**:

| Variável                    | Valor / Origem em Produção                                 | Regra Crítica                                                                                  |
| --------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `NODE_ENV`                  | `production`                                               | Obrigatório para build otimizado e trava anti-SQLite (`A-11`).                                 |
| `DB_CONNECTION`             | `pg`                                                       | Força driver PostgreSQL.                                                                       |
| `DATABASE_URL`              | URL do **Supavisor Pooler (`:6543?pgbouncer=true`)**       | Runtime das funções serverless.                                                                |
| `DATABASE_DIRECT_URL`       | URL **Direta / Session (`:5432`)**                         | Usada apenas por comandos explícitos de migração.                                              |
| `DB_POOL_MAX`               | `2`                                                        | Evita exaustão de conexões sob concorrência serverless.                                        |
| `APP_KEY`                   | **Cópia exata da `APP_KEY` da V1 (Render)**                | **Não gerar nova!** Preserva cookies assinados, criptografia e continuidade da migração.       |
| `APP_URL`                   | Domínio oficial de produção (ex.: `https://...vercel.app`) | Usado em cabeçalhos e links internos.                                                          |
| `CORS_ORIGIN`               | Domínio oficial do frontend em produção                    | Lista separada por vírgula se houver domínio customizado + `.vercel.app`.                      |
| `ALLOW_VERCEL_PREVIEW`      | `false`                                                    | Manter `true` apenas no escopo `Preview` (Staging).                                            |
| `APP_READ_ONLY`             | `false`                                                    | Mudar para `true` apenas durante janelas programadas de manutenção/cutover.                    |
| `RATE_LIMIT_ENABLED`        | `1`                                                        | Usa Upstash Redis (se configurado) ou tabela `rate_limit_buckets` no Supabase automaticamente. |
| `UPSTASH_REDIS_REST_URL`    | _(Opcional)_ Endpoint Upstash Redis                        | Se omitido, o fallback compartilhado usa `rate_limit_buckets`.                                 |
| `UPSTASH_REDIS_REST_TOKEN`  | _(Opcional)_ Token Upstash Redis                           | Par da URL acima.                                                                              |
| `SIGNUP_INVITE_CODE`        | Código de convite de produção (preservado da V1)           | Mantém cadastro fechado a professores convidados.                                              |
| `SENTRY_DSN`                | DSN do projeto Sentry                                      | Rastreamento de exceções 500 no backend.                                                       |
| `SENTRY_ENVIRONMENT`        | `production`                                               | Separa eventos de produção dos de staging.                                                     |
| `VITE_API_URL` _(Frontend)_ | URL base da API V2 em produção (sem `/api/v1`)             | Atualizada no momento exato da virada de chave (Passo 6 do Cutover).                           |

---

## 3. Segredos Operacionais no GitHub Actions (`Repository Secrets`)

Para que as rotinas de resiliência da Fase 5 passem a proteger o banco `music-class-prod` imediatamente após o cutover, confira em **GitHub -> Settings -> Secrets and variables -> Actions**:

| Secret                        | Finalidade                                                       | Workflow consumidor                |
| ----------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| `DATABASE_DIRECT_URL`         | URL direta (`:5432`) do `music-class-prod` para `pg_dump` diário | `.github/workflows/db_backup.yml`  |
| `BACKUP_S3_BUCKET`            | Nome do bucket S3 / Cloudflare R2 (retenção de 14 dias)          | `.github/workflows/db_backup.yml`  |
| `BACKUP_S3_ENDPOINT`          | Endpoint S3 compatível (ex.: R2)                                 | `.github/workflows/db_backup.yml`  |
| `BACKUP_S3_ACCESS_KEY_ID`     | Credencial de escrita/leitura no bucket de backups               | `db_backup.yml`                    |
| `BACKUP_S3_SECRET_ACCESS_KEY` | Segredo correspondente à Access Key                              | `db_backup.yml`                    |
| `BACKUP_S3_REGION`            | Região do bucket (`auto` no Cloudflare R2)                       | `db_backup.yml`                    |
| `API_URL`                     | URL base pública da API V2 (`https://<api-producao>.vercel.app`) | `.github/workflows/keep_alive.yml` |

---

## 4. Checklist de Prontidão Pré-Cutover (Saída da Tarefa 6.1)

- [ ] Projeto `music-class-prod` criado em `sa-east-1` e com status `ACTIVE`.
- [ ] Strings `DATABASE_URL` (`:6543`) e `DATABASE_DIRECT_URL` (`:5432`) testadas via `psql "$DATABASE_DIRECT_URL" -c "SELECT version();"`.
- [ ] Schema `public` removido da Data API (`PostgREST`) ou Data API desativada.
- [ ] Variáveis de `Production` cadastradas na Vercel com `APP_KEY` idêntica à da V1.
- [ ] Secrets do GitHub Actions prontos para apontar para o novo banco imediatamente após o cutover.
