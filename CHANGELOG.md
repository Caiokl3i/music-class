# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [Unreleased]

### Adicionado

- **Fase 1 (Fundação)**:
  - Pipeline de CI/CD automatizado via GitHub Actions (`.github/workflows/ci.yml`) validando backend (lint, typecheck, testes), frontend (lint, build) e Docker.
  - Monitoramento automatizado de vulnerabilidades e dependências via Dependabot (`.github/dependabot.yml`).
  - Template padronizado de Pull Request (`.github/pull_request_template.md`) com checklist de produção da V2.
  - Documentação para setup dos ambientes de Staging no Supabase e Vercel (`docs/STAGING_SETUP.md`).
- **Fase 2 (Rede de Segurança: Testes, Postgres e Higiene)**:
  - Suporte a execução de testes contra PostgreSQL (`TEST_DB=pg`) mantendo SQLite em memória para dev local rápido (`A-04`).
  - Job paralelo de testes em PostgreSQL com service container no GitHub Actions (`.github/workflows/ci.yml`).
  - Testes de caracterização para fronteiras de fuso horário e virada de mês (`tests/unit/timezone_boundaries.spec.ts`).
  - Testes de caracterização para aritmética monetária e arredondamento de centavos (`tests/unit/money_arithmetic.spec.ts`).
  - Testes de caracterização para regras de consumo de créditos e expiração de pacotes (`tests/unit/plan_characterization.spec.ts`).
  - Migration expand-only adicionando constraints financeiras `CHECK (lessons_total > 0)` e `CHECK (price >= 0)` em `plans`.
  - Configuração de `trustProxy: true` no servidor HTTP para identificar o IP real de clientes através de proxies reversos (`A-05`).
  - Registro de Decisão Arquitetural formalizado em `docs/adr/0001-autenticacao-e-tokens.md` (`A-06`).
- **Fase 3 (Spike Vercel + Supabase)**:
  - Registro de Decisão Arquitetural formalizado em `docs/adr/0002-decisao-plano-hospedagem.md` avaliando Vercel Hobby vs Pro e Supabase Free vs Pro com aprovação do Gate A (`A-07`).
  - Entrypoint serverless para AdonisJS 7 com lazy initialization e caching de instância em `bin/serverless.ts` e bridge Node.js via `api/index.js` (`A-08`).
  - Configuração de deployment unificado na Vercel com rewrites para API e SPA frontend em `vercel.json` (`A-08`).
  - Desacoplamento do ciclo de migrations de produção via script dedicado `npm run db:migrate:prod` para execução contra porta 5432 (Session Mode) (`A-09`).
  - Script automatizado de smoke test pós-deploy com validação de health check e latência em `scripts/smoke_test.ts` (`A-10`).
  - Relatório técnico do Spike consolidado em `docs/SPIKE_REPORT.md` detalhando métricas de cold start, pooling (Supavisor port 6543), migração de rate limit (`A-05`) e comportamento do PDFKit.
  - Registro de Decisão Arquitetural formalizado em `docs/adr/0003-decisao-arquitetura-v2.md` com aprovação do Gate B e decisão formal GO para arquitetura Serverless.
- **Fase 4 (Adaptação Serverless da API)**:
  - Boot estrito em produção (`A-11`): falha imediata se `DATABASE_URL` estiver ausente, impedindo fallback silencioso para SQLite em disco efêmero.
  - Conexão com pool reduzido (`min: 0, max: 2`) para lambdas e `DATABASE_DIRECT_URL` para execução isolada de migrations (`A-09`, `A-12`).
  - Desacoplamento definitivo de migrations no boot do container Docker (`docker/api-entrypoint.sh`), tornando migrações um passo explícito de release (`A-01`).
  - Rate limit compartilhado com arquitetura de stores desacoplados: `UpstashRateLimitStore` (REST via fetch), `DatabaseRateLimitStore` (tabela `rate_limit_buckets` com UPSERT atômico) e `MemoryRateLimitStore` (`A-05`).
  - Restrição de backup SQLite e envio de e-mail ao ambiente de arquivo local, com resposta informativa 404 (`E_BACKUP_DISABLED`) em produção/PostgreSQL (`A-11`).
  - Endpoint `GET /health` com ping real no banco via `SELECT 1` e validação integrada ao smoke test (`A-08`).
  - Migration habilitando Row Level Security (RLS) em todas as 8 tabelas do banco no PostgreSQL, blindando a Data API pública do Supabase contra acessos com a chave `anon` (`A-13`).
  - Middleware global de logging estruturado com `x-request-id`, correlação de eventos e higienização estrita de PII (`A-10`).
  - Resolução dinâmica de CORS para ambientes de Preview na Vercel (`ALLOW_VERCEL_PREVIEW=true`) e documentação detalhada de segredos por ambiente.
- **Fase 5 (Operação, Backups, Monitoramento, Runbook e Resiliência)**:
  - Script automatizado de backup do PostgreSQL (`scripts/backup_postgres.sh`) com compactação gzip e envio para S3/Cloudflare R2 com retenção estrita de 14 dias (`5.1`).
  - Workflow agendado via GitHub Actions cron (`.github/workflows/db_backup.yml`) executando diariamente às 03:00 UTC (`5.1`).
  - Script de restauração e validação de integridade (`scripts/restore_postgres.sh`) e workflow automatizado (`.github/workflows/db_restore_test.yml`) para validação periódica de dados em banco efêmero (`5.2`).
  - Workflow de keep-alive diário (`.github/workflows/keep_alive.yml`) chamando `GET /health` (`SELECT 1`) para prevenção proativa da pausa de 7 dias de inatividade no Supabase Free Tier (`5.3`).
  - Monitoramento de uptime documentado com UptimeRobot / Better Stack apontando para `/health` (`5.4`).
  - Integração lightweight com Sentry no backend (`app/services/error_monitoring.ts`) e frontend (`frontend/src/services/monitoring.ts`) capturando pilha de erros, release e contexto de requisição sem overhead de SDK externo (`5.5`).
  - Manual de Operação e Resiliência formalizado em `docs/RUNBOOK.md` cobrindo deploy, rollback, restauração com `pg_restore`, rotação de chaves e reativação manual do Supabase (`5.6`).
  - Diretrizes e governança de privacidade LGPD em `docs/LGPD.md` com ferramenta CLI integrada (`commands/lgpd_export.ts` e `npm run lgpd:export`) para exportação de dossiê em JSON (Art. 18, V) e anonimização de alunos (Art. 18, VI) mantendo integridade financeira (`5.7`).
  - Registro de Decisão Arquitetural formalizado em `docs/adr/0004-operacao-e-resiliencia-v2.md` documentando a estratégia de resiliência e operação contínua (`5.8`).

---

## [1.0.0] - 2026-10-26

Versão estável congelada da V1 em produção (Render + Vercel + Neon PostgreSQL).

### Adicionado

- **Autenticação & Contas**:
  - Cadastro exclusivo por convite (`SIGNUP_INVITE_CODE`).
  - Autenticação via Access Tokens com validade de 7 dias.
  - Troca de senha segura com revogação imediata de outros tokens ativos e log de segurança.
- **Gestão de Alunos**:
  - Cadastro completo com instrumento, nível, data de nascimento/idade e observações.
  - Cores personalizadas em hexadecimal para identificação visual na agenda.
  - Exclusão e arquivamento protegidos por integridade referencial.
- **Planos & Pacotes**:
  - Controle de créditos de aula por pacote com regras de validade.
  - Descontos percentuais ou fixos nomeados por plano.
  - Regras rígidas de integridade: bloqueio de cancelamento/exclusão de planos vinculados a aulas já realizadas.
- **Agenda & Aulas**:
  - Calendário interativo com visualização mensal e semanal.
  - Detecção e aviso de conflitos de horário entre alunos.
  - Reposicionamento explícito de aulas e controle de status (agendada, realizada, falta, cancelada).
- **Cobrança & Relatórios**:
  - Geração de mensagens de cobrança formatadas e recibos em PDF via PDFKit.
  - Exportação de fechamento mensal em CSV e PDF estilizado.
  - Dashboard consolidado com métricas de pacotes em aberto e aulas do dia.
- **Segurança & Arquitetura**:
  - Multi-tenancy com isolamento rigoroso por professor em todas as queries (`user.related(...)`).
  - Rate limiting granular por IP e operação.
  - Docker multi-stage build com usuário não-root (`adonis`).
