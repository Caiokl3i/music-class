# Music Class — Baseline da V1 (Fase 0)

Data do registro: 2026-10-26  
Branch: `master`  
Commit baseline: registrado antes do início das alterações da V2.

---

## 1. Status da Suíte de Testes da V1

- **Framework:** Japa 5 (@japa/runner) com AdonisJS 7 e SQLite em memória.
- **Total de testes:** **152 aprovados (0 falhas)**.
- **Tempo de execução:** ~9 segundos.
- **Suítes funcionais cobertas:**
  - `auth` (signup, login, logout, me, refresh)
  - `backup` (criação e retenção de arquivos SQLite)
  - `catalog` (pacotes padrão e tipos customizados)
  - `dashboard` (métricas de alunos, aulas do dia, a receber)
  - `export` (exportação mensal CSV e PDF)
  - `health` (endpoint de healthcheck)
  - `lessons` (agendamento, reposicionamento, conclusão, cancelamento)
  - `plan_discounts` (descontos e abatimentos em planos)
  - `plan_types` (CRUD de tipos de planos/pacotes)
  - `plans` (criação, expiração, geração de aulas, cobrança PDF)
  - `rate_limit` (bloqueio por força bruta em login)
  - `students` (CRUD, tags, níveis, cores, arquivamento)
- **Suítes unitárias cobertas:**
  - `auth_credentials`
  - `billing_message`
  - `lesson_schedule`
  - `month_export`
  - `plan_credits`
  - `plan_types`
  - `rate_limit`
  - `signup_invite`

---

## 2. Status do Lint e Typecheck

- **Backend (AdonisJS):**
  - `npm run lint` (`eslint .`): **0 erros, 0 avisos**.
  - `npm run typecheck` (`tsc --noEmit`): **0 erros**.
- **Frontend (React + Vite):**
  - `npm run build` (`tsc -b && vite build`): **Build concluído com sucesso** (dist gerada).
  - `npm run lint` (`oxlint`): **0 erros** (20 warnings informativos do React 19 Compiler).

---

## 3. Ajustes de Higiene Realizados no Baseline

1. **Prettier:** Formatação aplicada em todo o repositório (`npm run format`).
2. **Types:** `types/better-sqlite3.d.ts` renomeado para `types/better_sqlite3.d.ts` (convenção *snake_case* do AdonisJS).
3. **Linter Backend:** 
   - `eslint.config.js` configurado para ignorar `frontend/**` (que tem seu próprio linter oxlint).
   - [app/services/month_export.ts](file:///home/caiokl3i/music-class/app/services/month_export.ts): substituição de `==` por `===` estrito para atender à regra `eqeqeq`.
   - [tests/functional/students.spec.ts](file:///home/caiokl3i/music-class/tests/functional/students.spec.ts) e [tests/functional/backup.spec.ts](file:///home/caiokl3i/music-class/tests/functional/backup.spec.ts): separação de await em variável intermediária para atender à regra `@unicorn/no-await-expression-member`.
