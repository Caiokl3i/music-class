# Music Class — Baseline da V1 (Fase 0 Concluída)

Data do registro: 2026-10-26  
Branch de referência: `master`  
Tag da V1: `v1.0.0`  
Branch de manutenção da V1: `release/v1`  
Branch de desenvolvimento da V2: `develop` (trabalho livre via PR para `master`)

---

## 1. Status da Suíte de Testes da V1

- **Framework:** Japa 5 (@japa/runner) com AdonisJS 7 e SQLite em memória.
- **Total de testes:** **152 aprovados (0 falhas)**.
- **Tempo de execução:** ~9 segundos.
- **Suítes funcionais cobertas (12 specs):** `auth`, `backup`, `catalog`, `dashboard`, `export`, `health`, `lessons`, `plan_discounts`, `plan_types`, `plans`, `rate_limit`, `students`.
- **Suítes unitárias cobertas (8 specs):** `auth_credentials`, `billing_message`, `lesson_schedule`, `month_export`, `plan_credits`, `plan_types`, `rate_limit`, `signup_invite`.

---

## 2. Status do Lint e Typecheck

- **Backend (AdonisJS):**
  - `npm run lint` (`eslint .`): **0 erros, 0 avisos**.
  - `npm run typecheck` (`tsc --noEmit`): **0 erros**.
- **Frontend (React + Vite):**
  - `npm run build` (`tsc -b && vite build`): **Build concluído com sucesso**.
  - `npm run lint` (`oxlint`): **0 erros** (20 warnings informativos do compilador React 19).

---

## 3. Banco de Dados de Produção (Neon) e Backup

- **Provedor:** Neon Serverless PostgreSQL 18.6 (AWS sa-east-1).
- **Política do Provedor:** O plano gratuito do Neon suspende o compute após 5 minutos de inatividade para economizar recursos (retoma em ~500ms na primeira query). Os dados no storage **não expiram nem são deletados** (diferente do banco temporário do Render).
- **Arquivo de Backup:** [backups/v1_backup.dump](file:///home/caiokl3i/music-class/backups/v1_backup.dump) (32 KB, formato custom `-Fc`).
- **Restauração de Teste:** Executada com sucesso em container isolado de PostgreSQL 18.6.
- **Paridade:** 100% dos registros conferidos ([Relatório detalhado](file:///home/caiokl3i/music-class/docs/RESTORATION_REPORT_V1.md)).

---

## 4. Auditoria de Segurança e Dependências (Tarefa 0.7)

- **Segredos no Git:** Verificado com `git log` em todo o histórico. **Nenhum arquivo `.env` ou chave de API foi commitado no repositório**.
- **Auditoria de dependências (`npm audit --omit=dev`):**
  - **Backend:** 5 vulnerabilidades em dependências transitivas (`proxy-addr`, `qs`, `brace-expansion`, `fast-copy`, `@adonisjs/http-server`). Podem ser tratadas progressivamente na V2 via `npm update` / `npm audit fix`.
  - **Frontend:** 2 vulnerabilidades (`follow-redirects`, `zod`). A atualização do Zod envolve breaking changes da v3 para v4, que será avaliada na V2.

---

## 5. Estratégia de Branches Simplificada (Decisão do Desenvolvedor)

Conforme alinhado para o fluxo solo:

- `master` = código em produção (estável, só recebe merge de PR aprovado).
- `release/v1` = código congelado da V1 (para eventual hotfix emergencial).
- `develop` = **branch principal de trabalho da V2**. Todas as melhorias serão feitas nela e, quando estiver pronto, será aberto um PR de `develop` para `master`.
