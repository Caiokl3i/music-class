# Music Class V2 — Guia de Configuração: Staging e Proteção de Branches (Fase 1)

Este guia orienta a configuração dos ambientes de **Staging** e das regras de **Branch Protection** no GitHub, concluindo os itens **1.2**, **1.8** e **1.9** do [V2_ROADMAP.md](file:///home/caiokl3i/music-class/docs/V2_ROADMAP.md).

---

## 1. Proteção de Branches no GitHub (Tarefa 1.2)

Para garantir o princípio _"Produção é sagrada"_ e impedir merges acidentais ou com testes falhando:

1. Acesse o repositório no GitHub: `https://github.com/Caiokl3i/music-class/settings/branches`.
2. Clique em **Add branch ruleset** (ou _Add rule_).
3. Crie uma regra para `master` e `release/v1`:
   - **Target branches:** `master`, `release/v1`
   - Marque: **Require a pull request before merging**
     - Require approvals: `0` (trabalho solo) ou `1`
     - Dismiss stale pull request approvals when new commits are pushed: ✅
   - Marque: **Require status checks to pass before merging**
     - Marque: **Require branches to be up to date before merging**
     - Adicione os status checks do CI (`.github/workflows/ci.yml`):
       1. `Backend (SQLite: Lint, Typecheck & Tests)`
       2. `Backend (PostgreSQL: Tests & Migrations)`
       3. `Frontend (Lint & Build)`
       4. `Docker Build Validation`
   - Marque: **Block force pushes** (evita sobrescrever histórico).
   - Marque: **Block deletions**.
4. Salve as alterações.

---

## 2. Projeto Supabase de Staging (Tarefa 1.8)

Staging **nunca** compartilha dados ou credenciais com o banco de produção (Neon).

### 2.1 Criar o projeto

1. Acesse o console do [Supabase](https://supabase.com/dashboard).
2. Clique em **New Project**.
3. Defina:
   - **Name:** `music-class-staging`
   - **Database Password:** Gere uma senha forte e guarde no cofre de senhas.
   - **Region:** Escolha a região mais próxima dos usuários e das funções Vercel (recomendado: `sa-east-1 - São Paulo` ou `us-east-1`).
   - **Pricing Plan:** Free tier.

### 2.2 Obter as Connection Strings

No painel do projeto em **Project Settings → Database → Connection string**:

- **Connection pooling (Supavisor) - Modo Transaction (porta 6543):**
  Usada em runtime pela API serverless:
  ```
  DATABASE_URL="postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
  ```
- **Direct connection - Modo Session (porta 5432):**
  Usada **apenas para migrations** (`DATABASE_DIRECT_URL`):
  ```
  DATABASE_DIRECT_URL="postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
  ```

### 2.3 Políticas de Segurança do Staging

- **RLS (Row Level Security):** Certifique-se de que o RLS está ativo nas tabelas.
- **Dados:** Nunca faça restore de dados reais com informações pessoais sem anonimizar nomes, telefones e e-mails de alunos.

---

## 3. Projeto Vercel de Staging / Preview (Tarefa 1.9)

A Vercel suporta deploys automáticos de **Preview** para cada commit na branch `develop`.

### 3.1 Configuração de Branch

1. Acesse o projeto no painel da [Vercel](https://vercel.com).
2. Vá em **Settings → Git**.
3. Confirme que `master` é a **Production Branch**.
4. A branch `develop` gerará automaticamente deploys de **Preview** com URLs estáveis (`*-preview.vercel.app`).

### 3.2 Variáveis de Ambiente Isoladas

No painel da Vercel em **Settings → Environment Variables**, cadastre as variáveis marcando **apenas** o escopo `Preview`:

| Variável              | Escopo Preview (Staging)                 | Observação                                           |
| --------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `NODE_ENV`            | `production`                             | Modo otimizado de build                              |
| `DATABASE_URL`        | String do **pooler do Supabase Staging** | Nunca usar URL do Neon                               |
| `DATABASE_DIRECT_URL` | String **direta do Supabase Staging**    | Apenas para migrations                               |
| `APP_KEY`             | Gerada exclusivamente para staging       | **Diferente** da chave de produção                   |
| `APP_URL`             | URL de preview da Vercel                 | ex.: `https://music-class-git-develop-...vercel.app` |
| `CORS_ORIGIN`         | URL do frontend de staging               | Permite comunicação sem erros de CORS                |
| `SIGNUP_INVITE_CODE`  | Código exclusivo de staging              | ex.: `staging-invite-secret`                         |
| `RESEND_API_KEY`      | Chave de testes (ou omitir)              | Impede envio de e-mails para alunos reais            |

---

## 4. Regra de Ouro do Staging

> [!CAUTION]
> Staging é um espelho técnico, não uma lixeira de dados reais. Testes destrutivos, scripts de migração e novas migrations devem sempre ser validados primeiro no Supabase de Staging antes de qualquer PR para `master`.
