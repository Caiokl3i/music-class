# ADR 0004: Operação, Backups, Monitoramento e Resiliência da V2

- **Status:** Aceito
- **Data:** 2026-10-29
- **Contexto:** Fase 5 do [V2_ROADMAP.md](../V2_ROADMAP.md) — Operação, Backups, Monitoramento, Runbook e Resiliência

---

## 1. Contexto

Com a migração da arquitetura para a V2 (Frontend SPA e API na Vercel + banco de dados PostgreSQL no Supabase), os mecanismos de operação anteriores baseados em backup de arquivo SQLite local e envio por e-mail tornaram-se obsoletos e incompatíveis com a infraestrutura em nuvem.

Adicionalmente, novos desafios operacionais surgiram:

1. **Pausa de Inatividade do Supabase Free Tier:** Projetos gratuitos no Supabase são pausados automaticamente após 7 dias de inatividade de requisições.
2. **Backups Automatizados e Confiáveis:** O Supabase Free Tier não inclui backups pontuais ou restaurações granulares com retenção longa sem upgrade de plano.
3. **Visibilidade de Erros em Produção:** Ambientes serverless exigem centralização de logs e rastreamento de exceções que persistam fora do ciclo de vida das instâncias efêmeras.
4. **Governança e LGPD:** Necessidade de cumprir com solicitações de portabilidade (Art. 18, V) e exclusão/anonimização (Art. 18, VI) sem violar integridade de faturamento do professor.

---

## 2. Decisões Arquiteturais

### 2.1 Backups Diários em S3-Compatible Storage com Retenção de 14 Dias

- Implementado script `scripts/backup_postgres.sh` acionado via GitHub Actions (`.github/workflows/db_backup.yml`) diariamente às 03:00 UTC.
- Utiliza `pg_dump` compactado com gzip (`.sql.gz`) e transmitido para bucket compatível com S3 (Cloudflare R2 ou AWS S3).
- Arquivos com mais de 14 dias são automaticamente excluídos no bucket.

### 2.2 Teste Automatizado de Restauração

- Implementado script `scripts/restore_postgres.sh` e workflow (`.github/workflows/db_restore_test.yml`).
- Baixa o backup mais recente gerado, aplica-o em um banco de dados de destino e valida a contagem e integridade das tabelas essenciais (`users`, `students`, `plans`, `lessons`).

### 2.3 Prevenção de Pausa via Keep-Alive Diário

- Implementado workflow `.github/workflows/keep_alive.yml` agendado diariamente às 12:00 UTC.
- O workflow dispara uma requisição `GET /health` que executa uma query ativa (`SELECT 1`) no banco de dados, resetando a contagem de 7 dias de inatividade do Supabase Free Tier.

### 2.4 Monitoramento de Erros e Uptime

- **Sentry Lightweight:** Implementado cliente Sentry customizado em `app/services/error_monitoring.ts` (backend) e `frontend/src/services/monitoring.ts` (frontend). O cliente captura pilha de erros, metadados de requisição, versão de release e envia payloads formatados para a Sentry Store API sem adicionar dependências pesadas de SDK ao bundle da aplicação.
- **Uptime Monitoring:** Definição no runbook para monitoramento externo via UptimeRobot / Better Stack apontando para o endpoint `/health` com intervalos de 5 minutos.

### 2.5 Conformidade com LGPD

- Implementada ferramenta CLI `node ace lgpd:student <id>` (`commands/lgpd_export.ts` e `app/services/lgpd_service.ts`) para geração de dossiês portáveis em JSON e anonimização irreversível de dados sensíveis preservando registros contábeis.
- Políticas e inventário formalizados em `docs/LGPD.md`.

### 2.6 Runbook Operacional

- Consolidado em `docs/RUNBOOK.md` todos os procedimentos de deploy, rollback, recuperação de desastres, rotação de chaves criptográficas (`APP_KEY`, senhas de banco) e despausa emergencial do Supabase.

---

## 3. Consequências e Trade-offs

### Positivas

- **Custo Zero:** A estratégia inteira opera dentro das camadas gratuitas do Supabase, Cloudflare R2, GitHub Actions e Sentry.
- **Resiliência Comprovada:** O backup é testado automaticamente a cada ciclo, evitando a clássica surpresa de backups corrompidos no momento do desastre.
- **Transparência e Governança:** O professor tem total controle sobre os dados de seus alunos conforme a legislação brasileira.

### Negativas / Mitigações

- **Dependência do GitHub Actions:** Caso o GitHub Actions fique fora do ar no horário do cron, o backup não é gerado naquele dia específico. A retenção de 14 dias garante que múltiplos pontos de restauração anteriores permaneçam disponíveis.
