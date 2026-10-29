# Manual de Operação e Resiliência (Runbook V2)

Este guia reúne os procedimentos operacionais para deploy, monitoramento, contingência, recuperação de desastres e rotação de credenciais do **Music Class V2**.

---

## 1. Topologia da Arquitetura

```
 [Usuário / Professor]
           │
           ▼
    [Vercel Edge]
     ├── SPA Frontend (React + Vite)
     └── Serverless API (AdonisJS 7)
           │
           ├───▶ [Supabase PostgreSQL via Supavisor Pooler (Porta 6543)]
           │
           ├───▶ [Sentry Cloud] (Rastreamento de erros Front & Back)
           │
           └───▶ [Cloudflare R2 / AWS S3] (Backups diários compactados)

 [GitHub Actions Cron]
     ├── 03:00 UTC ──▶ pg_dump ──▶ S3/R2 (Retenção de 14 dias)
     ├── 04:30 UTC ──▶ Restauração de teste em banco efêmero
     └── 12:00 UTC ──▶ GET /health (Keep-alive Supabase Free Tier)

 [UptimeRobot / Better Stack]
     └── A cada 5 min ──▶ GET /health (Alerta em caso de indisponibilidade)
```

---

## 2. Procedimento de Deploy em Produção

O deploy em produção é executado em etapas sequenciais para garantir zero quebras de contrato:

### 2.1 Passo a Passo

1. **Backup Preventivo:**
   Antes de aplicar qualquer migração estrutural, garanta que um backup recente foi concluído ou execute manualmente:

   ```bash
   ./scripts/backup_postgres.sh
   ```

2. **Execução de Migrações de Banco:**
   Execute as migrações utilizando a conexão **direta** (porta 5432) do Supabase:

   ```bash
   DATABASE_URL="$DATABASE_DIRECT_URL" npm run db:migrate:prod
   ```

3. **Deploy de Aplicação:**
   - Se Vercel: faça o push na branch `main` ou trigger via Vercel CLI (`vercel --prod`).
   - Se Docker/Render (fallback Fase 4-alt): acione o webhook de build ou `git push render main`.

4. **Smoke Test Pós-Deploy:**
   Execute a validação automatizada de rotas e integridade do banco:
   ```bash
   TEST_API_URL="https://api.musicclass.com.br" npm run smoke:test
   ```

---

## 3. Procedimento de Rollback

### 3.1 Rollback de Código (Frontend / API)

- **Vercel:** Acesse o dashboard do projeto -> **Deployments** -> localize o deploy anterior funcional -> selecione os três pontos (...) -> **Instant Rollback**. O tráfego será redirecionado em segundos.
- **Render/Docker:** Selecione a imagem anterior ou reverta o commit na branch de deploy.

### 3.2 Rollback de Migrações de Banco

Caso a migração precise ser revertida:

```bash
DATABASE_URL="$DATABASE_DIRECT_URL" node ace migration:rollback --batch=N
```

> [!CAUTION]
> Reverta migrações apenas se não houver perda de dados críticos de usuários cadastrados após o deploy. Se houver divergência estrutural, opte pelo restore em banco isolado.

---

## 4. Procedimento de Restauração de Banco de Dados (`pg_restore`)

Em caso de corrupção acidental ou desastre, restaure a partir dos backups criptografados salvos no bucket S3/R2.

### 4.1 Localização dos Backups

Os backups são versionados com a convenção:
`s3://${S3_BUCKET_NAME}/backups/postgres/music-class-postgres-YYYY-MM-DD-HHMMSS.sql.gz`

### 4.2 Restauração Automatizada

Utilize o utilitário `scripts/restore_postgres.sh`:

```bash
# 1. Definir variáveis de ambiente
export RESTORE_DATABASE_URL="postgres://user:pass@host:5432/target_db?sslmode=require"
export S3_BUCKET_NAME="music-class-backups"
export S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
export AWS_ACCESS_KEY_ID="sua_chave"
export AWS_SECRET_ACCESS_KEY="seu_segredo"

# 2. Executar restauração do backup mais recente
./scripts/restore_postgres.sh

# 3. Ou especificar um arquivo de backup específico
RESTORE_FILE="music-class-postgres-2026-10-28-030000.sql.gz" ./scripts/restore_postgres.sh
```

O script baixa o arquivo compactado, executa `psql` para aplicar o dump e valida que as tabelas essenciais (`users`, `students`, `plans`, `lessons`) foram restauradas com sucesso.

---

## 5. Rotação de Chaves e Credenciais

### 5.1 APP_KEY (Adonis Core)

A `APP_KEY` é usada para assinar cookies e criptografar dados sensíveis em repouso.

1. Gere uma nova chave criptográfica de 32 bytes:
   ```bash
   node ace generate:key --show
   ```
2. Atualize a variável `APP_KEY` nas configurações da Vercel / Render.
3. Sessões ativas de usuários serão invalidadas (eles precisarão fazer login novamente).

### 5.2 Senha do Banco de Dados (Supabase)

1. Acesse o Supabase Dashboard -> **Project Settings** -> **Database** -> **Reset Database Password**.
2. Copie a nova senha gerada.
3. Atualize tanto `DATABASE_URL` (pooler porta 6543) quanto `DATABASE_DIRECT_URL` (porta 5432) nas variáveis de ambiente da Vercel, Render e GitHub Secrets (`PROD_DATABASE_URL`, `DB_RESTORE_TARGET_URL`).

### 5.3 Tokens do Cloudflare R2 / AWS S3

1. Crie uma nova Access Key no painel Cloudflare R2 / AWS IAM.
2. Atualize os segredos do GitHub Actions: `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`.
3. Revogue a Access Key antiga após o próximo ciclo de backup ser concluído com sucesso.

---

## 6. Procedimento de Despausa do Supabase (Free Tier Inactivity)

Na camada gratuita do Supabase, projetos sem requisições por 7 dias entram em estado de **PAUSED**.

### 6.1 Prevenção Proativa

O workflow `.github/workflows/keep_alive.yml` executa diariamente às 12:00 UTC chamando a rota `/health`, que executa `SELECT 1` no banco de dados e reseta o contador de inatividade.

### 6.2 Reativação Manual (Se pausado)

Se o endpoint `/health` passar a retornar timeout ou erro de conexão de banco:

1. Acesse https://supabase.com/dashboard.
2. Localize o projeto do Music Class com a tag amarela `PAUSED`.
3. Clique em **Restore Project** (ou **Resume Project**).
4. Aguarde de 1 a 3 minutos até que o status passe para `ACTIVE`.
5. Execute o teste de saúde para confirmar a conexão:
   ```bash
   curl -i https://api.musicclass.com.br/health
   ```

---

## 7. Monitoramento de Uptime e Alertas (UptimeRobot / Better Stack)

Recomenda-se a configuração de um monitor externo gratuito para detectar quedas imediatamente:

### 7.1 Configuração no UptimeRobot

1. Crie uma conta gratuita em [uptimerobot.com](https://uptimerobot.com).
2. Adicione um novo monitor:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Music Class API Health`
   - **URL (or IP):** `https://api.musicclass.com.br/health` (ou domínio Vercel correspondente)
   - **Monitoring Interval:** `5 minutes`
3. Em **Alert Contacts**, adicione o e-mail do mantenedor ou webhook para Discord/Slack.
4. Em **HTTP Method**, selecione `GET`. A resposta esperada é HTTP 200 contendo `{"status":"ok","database":"connected"}`.

### 7.2 Alertas do Sentry

1. Acesse [sentry.io](https://sentry.io) -> **Alerts**.
2. Garanta que a regra padrão "Send a notification when an issue is created" esteja vinculada ao canal de e-mail dos administradores.
3. Limite de alerta: Qualquer erro não tratado (HTTP 500) ou falha de conectividade com o banco notificará a equipe em tempo real.
