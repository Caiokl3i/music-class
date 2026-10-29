# Music Class V2 — Checklist do Que Ficou Pendente Manualmente

Todo o código, automação, testes, scripts de migração, _guard-rails_ e infraestrutura da **Fase 0 até a Fase 8** já estão implementados e validados no repositório.

Este documento reúne **exclusivamente as ações manuais fora do código** (painéis do GitHub, Supabase, Vercel, Render, Cloudflare R2/S3, Sentry e UptimeRobot) que dependem das suas contas e credenciais.

---

## Resumo Rápido: Já posso começar a programar alterações da V2 hoje?

**Sim, imediatamente!**

- Para programar e testar localmente na sua máquina, você só precisa executar o **Bloco A** abaixo (**leva 2 minutos**).
- **Cuidado importante se você ainda não fez o Cutover da Fase 7 na nuvem:** enquanto a virada oficial (`develop -> master`) não tiver acontecido no domingo programado, crie suas alterações novas em branches `feat/nome-da-ideia` e **aguarde concluir o Cutover antes de mergeá-las na `develop`/`master`**. Assim a virada da infraestrutura para o Supabase + Vercel entra limpa, sem misturar migração de banco com funcionalidade nova (Regra de Ouro da transição). Assim que o Cutover terminar, o fluxo `feat/* -> develop -> master` fica 100% livre!

---

## Bloco A — Para Começar a Programar Localmente Hoje (2 minutos)

1. **Configurar o `.env` da API na raiz do projeto:**
   ```bash
   cp .env.example .env
   node ace generate:key
   ```
   Copie a chave exibida e cole em `APP_KEY=` dentro do arquivo `.env`. (Opcional: defina `SIGNUP_INVITE_CODE=convite-local` se quiser testar tela de cadastro).
2. **Configurar o `.env` do Frontend:**
   ```bash
   cp frontend/.env.example frontend/.env
   ```
3. **Criar sua branch de trabalho da V2:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/minha-primeira-alteracao
   ```
   Pronto! Siga o [GUIA_DESENVOLVIMENTO_LOCAL_V2.md](./GUIA_DESENVOLVIMENTO_LOCAL_V2.md) para ligar tudo local e testar.

---

## Bloco B — Configurações Únicas nos Painéis em Nuvem (Antes do Cutover)

### B.1 GitHub (Repositório `Caiokl3i/music-class`)

- [ ] **1. Proteger as branches `master` e `release/v1`:**
  - Acesse `Settings -> Branches -> Add branch ruleset` (detalhes em [STAGING_SETUP.md](./STAGING_SETUP.md)).
  - Alvo: `master` e `release/v1`.
  - Marque **Require a pull request before merging**, **Block force pushes**, **Block deletions** e **Require status checks to pass** selecionando os 4 jobs do CI:
    1. `Backend (SQLite: Lint, Typecheck & Tests)`
    2. `Backend (PostgreSQL: Tests & Migrations)`
    3. `Frontend (Lint & Build)`
    4. `Docker Build Validation`
- [ ] **2. Cadastrar os Repository Secrets das automações da Fase 5:**
  - Acesse `Settings -> Secrets and variables -> Actions -> New repository secret` e cadastre:

  | Nome do Secret                | Valor                                                                         | Usado por        |
  | ----------------------------- | ----------------------------------------------------------------------------- | ---------------- |
  | `DATABASE_DIRECT_URL`         | Connection string **Direta (`:5432`)** do projeto Supabase `music-class-prod` | `db_backup.yml`  |
  | `BACKUP_S3_BUCKET`            | Nome do seu bucket privado no Cloudflare R2 ou Backblaze B2                   | `db_backup.yml`  |
  | `BACKUP_S3_ENDPOINT`          | Endpoint S3 do R2/B2 (ex.: `https://<account>.r2.cloudflarestorage.com`)      | `db_backup.yml`  |
  | `BACKUP_S3_ACCESS_KEY_ID`     | Access Key ID com permissão de leitura/escrita no bucket                      | `db_backup.yml`  |
  | `BACKUP_S3_SECRET_ACCESS_KEY` | Secret Access Key correspondente                                              | `db_backup.yml`  |
  | `BACKUP_S3_REGION`            | `auto` (para Cloudflare R2) ou a região do bucket                             | `db_backup.yml`  |
  | `API_URL`                     | URL pública da sua API V2 na Vercel (ex.: `https://...vercel.app`)            | `keep_alive.yml` |

- [ ] **3. Abrir o Pull Request da transição `develop -> master` (SEM aprovar o merge ainda):**
  - Clique em `https://github.com/Caiokl3i/music-class/compare/master...develop?expand=1` (ou rode `gh auth login` + `gh pr create --base master --head develop`).

### B.2 Supabase (2 Projetos Separados: Staging e Produção)

- [ ] **1. Criar projeto `music-class-staging` (`South America - sa-east-1`):**
  - Em `Project Settings -> API -> Data API Settings`, desmarque o schema `public` (ou desative a Data API).
  - Copie as duas URLs em `Project Settings -> Database`: **Transaction Pooler (`:6543?pgbouncer=true`)** e **Direct (`:5432`)**.
- [ ] **2. Criar projeto `music-class-prod` (`South America - sa-east-1`):**
  - Senha forte exclusiva (diferente da de Staging!).
  - Em `Project Settings -> API -> Data API Settings`, desmarque o schema `public` (ou desative a Data API).
  - Copie as duas URLs (**Pooler `:6543`** e **Direct `:5432`**).

### B.3 Vercel (API Serverless + Frontend)

- [ ] **1. Projeto da API na Vercel (raiz do repositório):**
  - Confirmar `Production Branch: master`.
  - Em `Settings -> Environment Variables`, cadastrar variáveis separadas para **`Preview`** (apontando para `music-class-staging`, `ALLOW_VERCEL_PREVIEW=true`, `APP_KEY` exclusiva de staging) e para **`Production`** (apontando para `music-class-prod`, `DB_CONNECTION=pg`, `DB_POOL_MAX=2`, `ALLOW_VERCEL_PREVIEW=false` e **exatamente a mesma `APP_KEY` e `SIGNUP_INVITE_CODE` da V1 do Render!**). Confira a tabela completa em [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md).
- [ ] **2. Projeto do Frontend na Vercel (`Root Directory: frontend`):**
  - Em `Preview`: `VITE_API_URL` apontando para a URL Preview da API V2.
  - Em `Production`: manter `VITE_API_URL` atual até o minuto exato da virada no Bloco C!

### B.4 Monitoramento Externo Gratuito (10 minutos)

- [ ] **UptimeRobot / Better Stack:** criar monitor HTTP(s) a cada 5 minutos apontando para `https://<sua-api-v2>.vercel.app/health` com alerta no seu e-mail.
- [ ] **Sentry (Opcional, recomendado):** criar projeto e preencher `SENTRY_DSN` na Vercel (`Preview` e `Production`).

---

## Bloco C — Executar o Cutover Oficial (`Domingo, 02:00–02:30 BRT`)

Siga na íntegra o playbook [CUTOVER_EXECUTION_GUIDE.md](./CUTOVER_EXECUTION_GUIDE.md):

- [ ] **1. TRAVA OBRIGATÓRIA NO RENDER (V1):** No painel do Render, **desative o Auto-Deploy** ou mude a branch monitorada de `master` para `release/v1`. Isso garante que o servidor antigo nunca seja sobrescrito quando você fizer merge na `master`.
- [ ] **2. Congelar escritas na V1:** ativar `APP_READ_ONLY=true` no serviço atual (ou iniciar janela curta sem uso).
- [ ] **3. Migrar banco e validar 100% de paridade + RLS:**
  ```bash
  SOURCE_DATABASE_URL="<URL_DO_NEON_V1>" \
  SUPABASE_DIRECT_URL="<URL_DIRETA_5432_SUPABASE_PROD>" \
  SUPABASE_POOLER_URL="<URL_POOLER_6543_SUPABASE_PROD>" \
  CONFIRM_PRODUCTION_CUTOVER=YES \
  npm run cutover:execute
  ```
- [ ] **4. Virar a chave na Vercel:** aprovar o **Merge** do PR `develop -> master` no GitHub, aguardar deploy da API V2, atualizar `VITE_API_URL` do Frontend em `Production` para a nova API V2 e fazer _Redeploy_ do Frontend.
- [ ] **5. Rodar Smoke Test completo em produção (`16/16` checks com limpeza automática):**
  ```bash
  API_URL="https://<sua-api-v2>.vercel.app" \
  SMOKE_TEST_EMAIL="<seu-email>" \
  SMOKE_TEST_PASSWORD="<sua-senha>" \
  npm run smoke:test -- --cutover-full
  ```

---

## Bloco D — Pós-Cutover (Em Segundo Plano)

- [ ] **Após 7 dias estáveis na V2** (backups `db_backup.yml` verdes, `keep_alive.yml` verde e zero erros críticos no Sentry): carimbar a release final:
  ```bash
  git checkout master && git pull origin master
  git tag -a v2.0.0 -m "Music Class v2.0.0 — Produção V2 Estabilizada"
  git push origin v2.0.0
  ```
- [ ] **Após 14 a 28 dias estáveis na V2:** gerar o arquivo histórico definitivo da V1 (`SOURCE_DATABASE_URL="<URL_NEON_V1>" npm run cutover:archive-v1`), guardar o `.dump` + `.manifest.txt` em local seguro e encerrar o serviço antigo no Render e no Neon.
