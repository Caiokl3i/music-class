# Guia Executivo de Cutover para Produção V2 (Fase 7)

Este playbook operacional consolida a sequência exata de comandos e verificações para a virada de chave (**Cutover**) da **V1 (Render + Neon PostgreSQL)** para a **V2 (Vercel + Supabase PostgreSQL)**, seguindo rigorosamente a Seção 12.6 do [V2_PLANO_DE_TRANSICAO.md](./V2_PLANO_DE_TRANSICAO.md) e as métricas comprovadas no [MIGRATION_REHEARSAL_REPORT.md](./MIGRATION_REHEARSAL_REPORT.md).

---

## 1. Pré-Voo Obrigatório (T-48h até T-15min antes da janela)

> [!CAUTION]
> **REGRA Nº 1 — Proteger a V1 no Render ANTES do Merge em `master`:**
> No painel do **Render** (serviço da API V1), acesse **Settings -> Build & Deploy** e:
>
> 1. Altere **Branch** de `master` para **`release/v1`** (ou defina **Auto-Deploy: No**).
> 2. Confirme que o último deploy ativo no Render corresponde à tag `v1.0.0`.
>
> _Por quê?_ Quando o Pull Request `develop -> master` for aprovado para publicar a V2 na Vercel, o Render **não pode** compilar a V2 em cima do banco antigo da V1. Manter o Render congelado em `release/v1` preserva o seu botão de rollback instantâneo pelas próximas 2 a 4 semanas.

### Checklist Pré-Janela

- [ ] Projeto `music-class-prod` criado e `ACTIVE` no Supabase (`sa-east-1`), conforme [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md).
- [ ] Variáveis de ambiente `Production` cadastradas no projeto da **API V2 na Vercel**, com **`APP_KEY` copiada exatamente da V1** (`DATABASE_URL` na porta `6543?pgbouncer=true` e `DATABASE_DIRECT_URL` na porta `5432`).
- [ ] Caso utilize domínio customizado (DNS), `TTL` reduzido para `60` ou `300` segundos com 48h de antecedência.
- [ ] Comunicado prévio enviado aos professores (template na Seção 4.2 do [MIGRATION_REHEARSAL_REPORT.md](./MIGRATION_REHEARSAL_REPORT.md)).
- [ ] Janela iniciada no horário planejado: **Domingo, `02:00` às `02:30 BRT` (`05:00–05:30 UTC`)**.

---

## 2. Roteiro Cronometrado do Dia do Cutover (`02:00 BRT`)

### Passo 1 — Congelar escritas na V1 (`02:00 BRT`)

Impeça novas gravações na V1 durante os poucos minutos da cópia:

- Se a API em execução já possuir suporte a `APP_READ_ONLY`: defina `APP_READ_ONLY=true`.
- Para o serviço V1 congelado (`v1.0.0` no Render): no painel do Render clique em **Suspend Service** (ou altere temporariamente `VITE_API_URL` / manutenção) durante os ~5 minutos da migração, garantindo zero novas escritas no Neon enquanto o dump final é extraído.

### Passo 2 & 3 — Backup Final da V1 + Migração para Supabase Produção + Validação de Paridade e RLS (`02:02 BRT`)

No terminal local (na branch `develop` / `v2.0.0-rc.1`), exporte as credenciais em variáveis de sessão e execute o orquestrador oficial:

```bash
export SOURCE_DATABASE_URL="postgres://<usuario>:<senha>@<host-neon-v1>/neondb?sslmode=require"
export SUPABASE_DIRECT_URL="postgres://postgres.<ref>:<senha>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
export SUPABASE_POOLER_URL="postgres://postgres.<ref>:<senha>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
export APP_KEY="<mesma-app-key-da-v1>"

CONFIRM_PRODUCTION_CUTOVER=YES npm run cutover:execute
```

O comando executa automaticamente e grava log auditável em `backups/cutover_execution_<timestamp>.log`:

1. Salva `backups/v1_pre_cutover_final_<timestamp>.dump` + `.sha256`;
2. Restaura os dados no Supabase (`:5432`) e valida `100%` de paridade das 7 tabelas + `SUM(price)`;
3. Aplica as migrations pendentes da V2 (`18 -> 21`, criando `rate_limit_buckets`, constraints financeiras e **RLS nas 8 tabelas**);
4. Valida a paridade pós-migração tanto na conexão direta (`:5432`) quanto no **Supavisor Pooler (`:6543`)**.

> [!IMPORTANT]
> **Critério Go/No-Go #1:** Só avance para o Passo 4 se o script exibir `🎉 CUTOVER DE BANCO CONCLUÍDO COM SUCESSO!` com `0` divergências.

### Passo 4 — Publicar API V2 primeiro e apontar `VITE_API_URL` do Frontend (`02:06 BRT`)

1. No GitHub, aprove e faça o **Merge** do Pull Request `develop -> master` (confirmando antes que o Render está em `release/v1`!).
2. Aguarde o deploy de produção do projeto **API V2 na Vercel** finalizar (~1 min) e teste a saúde isolada da API:
   ```bash
   TARGET_URL="https://<sua-api-v2>.vercel.app" npm run smoke:test
   ```
3. No projeto **Frontend na Vercel**, atualize a variável `VITE_API_URL` (escopo `Production`) para `https://<sua-api-v2>.vercel.app` e dispare **Redeploy** da branch `master`.

### Passo 5 — Smoke Test Completo Pós-Cutover (`02:10 BRT`)

Valide login `scrypt`, persistência de token Bearer prévio (opcional), listagens, **criação e limpeza automática de aluno/pacote/aula**, recibo PDF de cobrança e exportação mensal CSV/PDF:

```bash
SMOKE_TEST_EMAIL="<email-conta-teste>" \
SMOKE_TEST_PASSWORD="<senha-conta-teste>" \
TARGET_URL="https://<sua-api-v2>.vercel.app" \
npm run smoke:test -- --cutover-full
```

Resultado esperado: **`Total: 14 | Aprovados: 14 | Falhas: 0`** (ou `15/15` se `SMOKE_TEST_TOKEN` também for informado), com `0` registros temporários deixados no banco.

### Passo 6 — Ativar Rotinas Operacionais de Produção (`02:15 BRT`)

1. Atualize os secrets do GitHub Actions (`PROD_DATABASE_URL` = `SUPABASE_DIRECT_URL` e `HEALTHCHECK_URL` = `https://<sua-api-v2>.vercel.app/health`).
2. Dispare manualmente uma execução de teste dos workflows **Database Backup** (`db_backup.yml`) e **Supabase Keep-Alive** (`keep_alive.yml`) na aba **Actions** do GitHub para confirmar funcionamento imediato.
3. Atualize a URL do monitor no **UptimeRobot / Better Stack** para `https://<sua-api-v2>.vercel.app/health`.
4. Envie o comunicado de conclusão da manutenção.

---

## 3. Procedimento de Rollback Imediato (Se necessário nas primeiras horas)

Acione imediatamente caso qualquer gatilho da Seção 4.3 do [MIGRATION_REHEARSAL_REPORT.md](./MIGRATION_REHEARSAL_REPORT.md) seja atingido (ex.: `5xx > 2%` por `10 min` ou falha crítica em `/health`):

1. **Reativar V1 no Render** (caso tenha sido suspensa no Passo 1) e confirmar `GET https://<api-v1-render>/` respondendo `{ "ok": true }`.
2. No projeto **Frontend na Vercel**, restaurar `VITE_API_URL` para a URL antiga do Render (ou clicar em **Instant Rollback** para o deployment anterior do frontend).
3. Tempo total estimado de reversão: **1 a 2 minutos**.
4. Se alguma aula/plano tiver sido criada na V2 durante os minutos pós-cutover, consultar as linhas com `created_at > '<timestamp_cutover>'` no Supabase para reconciliação manual.

---

## 4. Monitoramento Pós-Cutover (7 Dias) e Promoção para `v2.0.0`

### Checklist de Estabilização (Critério de Saída da Fase 7)

- [ ] **Primeiras 24–48h:** Logs da Vercel e painel do Sentry sem exceções não tratadas (`500`).
- [ ] **Dia 1 ao Dia 7:** UptimeRobot verdinho em `/health` e keep-alive diário executando às `12:00 UTC`.
- [ ] **Dia 1 ao Dia 7:** Backups diários `03:00 UTC` (`db_backup.yml`) gravando no S3/R2 e workflow semanal `db_restore_test.yml` aprovado.
- [ ] **Após 7 dias sem erro crítico — Promover Release Estável `v2.0.0`:**
  ```bash
  git checkout master && git pull origin master
  # Atualizar version para "2.0.0" em package.json, frontend/package.json e CHANGELOG.md via PR rápido
  git tag -a v2.0.0 -m "Music Class v2.0.0 - Produção V2 Estável"
  git push origin v2.0.0
  ```

---

## 5. Descomissionamento da Infraestrutura Antiga (Após 2 a 4 Semanas)

Somente após **14 a 28 dias** de operação limpa da V2 em produção:

1. Gere e arquive o pacote histórico definitivo da V1 (`.dump` + `.sha256` + `.manifest.txt` contábil):
   ```bash
   LEGACY_V1_DATABASE_URL="postgres://<neon-v1-url>" npm run cutover:archive-v1
   ```
2. Confirme que os três arquivos (`v1_decommission_final_*.dump`, `.sha256` e `.manifest.txt`) estão salvos no S3/R2 ou em cofre externo seguro.
3. Exclua o Web Service antigo no painel do **Render** e o projeto antigo no **Neon**.
4. **Fase 8 liberada!** A partir deste ponto, o desenvolvimento livre de novas funcionalidades da V2 segue o fluxo contínuo da Fase 8 no [V2_ROADMAP.md](./V2_ROADMAP.md).
