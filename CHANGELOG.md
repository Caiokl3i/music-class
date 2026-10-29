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
