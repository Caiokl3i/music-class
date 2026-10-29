# ADR 0003: Decisão Arquitetural da V2 pós-Spike (Gate B)

- **Status:** Aceito
- **Data:** 2026-10-28
- **Contexto:** Marco de Decisão Gate B do [V2_ROADMAP.md](../V2_ROADMAP.md) e resultados do [SPIKE_REPORT.md](../SPIKE_REPORT.md)

---

## 1. Contexto

A Fase 3 executou a prova de conceito técnica (Spike) para validar a viabilidade de rodar a API AdonisJS 7 em funções serverless da Vercel conectadas ao banco de dados PostgreSQL do Supabase (via pooler Supavisor).

O [Relatório do Spike](../SPIKE_REPORT.md) confirmou:
- O compilador do AdonisJS (`node ace build`) gera código ESM plenamente compatível com o runtime Node.js 24 da Vercel.
- O handler serverless (`bin/serverless.ts`) gerencia o boot de forma idempotente, entregando cold starts de ~1s a 2s e tempos de resposta quentes de 15ms a 40ms.
- A geração de relatórios e cobranças em PDF via PDFKit consome pouca memória e executa dentro do limite de tempo da camada gratuita.
- O rate limit baseado em `Map` em memória precisa ser externalizado para um store compartilhado (Upstash Redis ou tabela no Supabase).

---

## 2. Decisão

**Aprovamos o avanço para a Fase 4 (Adaptação Serverless da API)**, mantendo a arquitetura alvo de **Frontend e API na Vercel + Supabase como banco de dados**.

Ao mesmo tempo, mantemos a **Fase 4-alt (Frontend na Vercel + API persistente em Docker/Render + Supabase)** como plano de contingência (*fallback*) 100% preparado, uma vez que o [Dockerfile](../../Dockerfile) e a suíte de testes multi-banco permanecem ativos e validados no CI.

---

## 3. Diretrizes Obrigatórias para a Fase 4

Para consolidar a arquitetura serverless aprovada, a Fase 4 implementará:

1. **Boot Estrito em Produção (`A-11`):** Falhar imediatamente a inicialização da API caso a variável `DATABASE_URL` não esteja definida em ambiente de produção (eliminando o fallback silencioso para SQLite local).
2. **Migrations Explícitas (`A-01`):** Eliminar definitivamente a execução de migrações automáticas no boot do servidor. O fluxo de release passará a ser: **Backup → `npm run db:migrate:prod` (conexão direta porta 5432) → Deploy do código na Vercel → Smoke test**.
3. **Rate Limit Compartilhado (`A-05`):** Migrar a interface `consumeRateLimit` para utilizar store externo (Upstash Redis ou tabela no Supabase), mantendo a compatibilidade dos testes unitários existentes.
4. **Desativação de Backups Locais (`A-11`):** Restringir chamadas a `backupSqlite` e envio de e-mails de backup ao ambiente SQLite local, retornando respostas sem erro de colapso quando executado em nuvem.
5. **Segurança no Supabase (`A-13`):** Ativação de Row Level Security (RLS) nas tabelas e restrição da Data API (PostgREST) para evitar vazamento de dados caso a chave pública `anon` seja exposta.

---

## 4. Critério de Reversão para Fase 4-alt

Caso durante a validação em staging o cold start se mostre prejudicial à experiência de uso diário dos professores, a alternância para a arquitetura híbrida (API em container persistente) não exigirá retrabalho de código, bastando reativar o deploy do backend no Render e apontar a variável `VITE_API_URL` do frontend para ele.
