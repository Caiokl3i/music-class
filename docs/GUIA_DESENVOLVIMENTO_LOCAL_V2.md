# Guia Completo de Desenvolvimento Local da V2 (Do Código Local até a `master`)

Este manual explica passo a passo **como ligar tudo na sua máquina**, **como criar e testar alterações/funcionalidades novas na Fase 8** e **como publicar com segurança até a branch `master` (Produção)**.

---

## 1. Pré-requisitos e Configuração Inicial (Uma Única Vez)

Certifique-se de ter **Node.js >= 24** instalado (`node -v`) e, para os modos com PostgreSQL local, **Docker** com Docker Compose (`docker compose version`).

```bash
# 1. Instalar dependências da API (raiz) e do Frontend
npm install
npm --prefix frontend install

# 2. Criar arquivos locais de variáveis de ambiente (ignorados pelo Git)
cp .env.example .env
cp frontend/.env.example frontend/.env

# 3. Gerar a chave criptográfica local e colar em APP_KEY= dentro do .env da raiz
node ace generate:key
```

> [!TIP]
> Se quiser testar a tela de criação de conta de professor (`/signup`) localmente, defina uma frase em `SIGNUP_INVITE_CODE=meu-convite` no arquivo `.env` da raiz. Se deixar vazio, o cadastro público fica fechado e você entra com a conta de demonstração (`npm run db:seed`).

---

## 2. Como Ligar Tudo Localmente (3 Modos Disponíveis)

Você pode escolher o modo que preferir no dia a dia. Para desenvolver features novas da V2, o **Modo 2** é o mais recomendado porque combina **Hot Reload instantâneo** com o **mesmo motor PostgreSQL 17 usado no Supabase**.

### Modo 1 — Rápido com SQLite (Sem Docker, 2 Terminais)

Ideal para ajustes rápidos de layout/CSS ou quando o Docker estiver desligado. No `.env` da raiz, mantenha `DB_CONNECTION`, `DATABASE_URL` e `DATABASE_DIRECT_URL` comentados/vazios.

```bash
# Preparar banco SQLite local (tmp/db.sqlite3) + criar estúdio de demonstração
node ace migration:run
npm run db:seed
```

Agora abra **2 terminais**:

- **Terminal 1 (API com Hot Reload em `http://localhost:3333`):**
  ```bash
  npm run dev
  ```
- **Terminal 2 (Frontend com Hot Reload em `http://localhost:5173`):**
  ```bash
  cd frontend && npm run dev
  ```

Acesse **`http://localhost:5173`** no navegador!

---

### Modo 2 — Recomendado V2: PostgreSQL 17 no Docker + Hot Reload (2 Terminais)

Roda apenas o banco PostgreSQL 17 em container Docker e mantém a API e o Frontend rodando direto no Node/Vite com recarregamento automático ao salvar qualquer arquivo.

1. **Subir o PostgreSQL 17 local em segundo plano:**
   ```bash
   npm run dev:db
   ```
2. **Descomentar as 4 linhas do Modo B no seu `.env` da raiz:**
   ```env
   DB_CONNECTION=pg
   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/musicclass
   DATABASE_DIRECT_URL=postgres://postgres:postgres@127.0.0.1:5432/musicclass
   DB_SSL=false
   ```
3. **Rodar as migrations (incluindo RLS e checks financeiros) e popular dados demo:**
   ```bash
   node ace migration:run
   npm run db:seed
   ```
4. **Abrir os 2 terminais de trabalho:**
   - **Terminal 1 (API):** `npm run dev` (`http://localhost:3333`)
   - **Terminal 2 (Frontend):** `cd frontend && npm run dev` (`http://localhost:5173`)

Quando terminar de programar e quiser desligar o banco em segundo plano:

```bash
npm run dev:db:stop
```

---

### Modo 3 — Stack Completa em Containers (`docker compose`)

Simula o build compilado completo (`postgres` + `api` em modo produção + `frontend` servido por Nginx):

```bash
docker compose up --build
```

- **Frontend compilado:** `http://localhost:8080`
- **Healthcheck da API:** `http://localhost:3333/health`
- Para encerrar: `Ctrl+C` e `docker compose down` (adicione `-v` apenas se quiser apagar os volumes e zerar o banco Docker).

---

## 3. Conta de Demonstração (`npm run db:seed`)

Sempre que rodar `npm run db:seed` (com `NODE_ENV=development`), o sistema cria ou reseta automaticamente o **Estúdio Marina** preenchido com alunos, pacotes ativos/pendentes/vencidos, descontos, aniversariante do dia e aulas agendadas/concluídas/atrasadas:

- **URL Local (Vite):** `http://localhost:5173`
- **E-mail:** `demo@musicclass.test`
- **Senha:** `password123`

Você pode mexer, excluir ou criar aulas à vontade nessa conta; se quiser voltar os dados de exemplo ao estado limpo inicial, basta rodar `npm run db:seed` novamente!

---

## 4. Como Criar Alterações e Novas Funcionalidades na Fase 8

### 4.1 Alterar ou Criar Telas e Rotas da API

- **Backend (`app/` + `start/routes.ts`):**
  - Toda query de domínio **deve** ser escopada pelo professor autenticado (`const user = auth.getUserOrFail()`, usando `user.related('students')...` ou `.where('userId', user.id)`).
  - Mantenha compatibilidade nas rotas `/api/v1/*`: adicione campos novos como **opcionais** nos validadores (`app/validators/`) e nos retornos JSON. Se precisar de algo incompatível, crie um grupo `/api/v2`.
- **Frontend (`frontend/src/`):**
  - Páginas ficam em `frontend/src/pages/`, componentes em `frontend/src/components/` e chamadas HTTP em `frontend/src/services/`.

### 4.2 Mudar o Banco de Dados (Regra _Expand → Migrate → Contract_ + RLS)

Nunca edite nem apague uma migration existente! Crie sempre uma nova:

```bash
node ace make:migration add_campo_x_to_students
```

Regras validadas automaticamente pela suíte de testes (`tests/unit/migration_guardrails.spec.ts` e `tests/unit/rls_migration.spec.ts`):

1. **Coluna nova:** sempre `.nullable()` ou com `.defaultTo(...)` (fase _Expand_). Nunca use `dropColumn` ou `dropTable` no `up()` junto com feature nova!
2. **Tabela nova:** além de criar a tabela com `user_id` referenciando `users.id`, habilite **Row Level Security** no PostgreSQL dentro da mesma migration:
   ```ts
   import { isPostgres } from '#database/connection'
   // dentro de async up(), após createTable('minha_tabela', ...):
   if (isPostgres()) {
     this.schema.raw('ALTER TABLE "minha_tabela" ENABLE ROW LEVEL SECURITY')
   }
   ```
   _(Se esquecer o RLS em uma tabela nova, o comando `npm run test:pg` e o CI acusarão imediatamente qual tabela ficou desprotegida!)_

### 4.3 Proteger Ideias Novas com Feature Flags (Opcional)

Quer subir código novo desativado e ligar só quando quiser na Vercel sem novo deploy?

- **No Backend:**
  ```ts
  import { isFeatureEnabled } from '#services/feature_flags'

  if (isFeatureEnabled('LEMBRETES_WHATSAPP')) {
    // lógica nova controlada por FEATURE_LEMBRETES_WHATSAPP=true no .env / Vercel
  }
  ```
- **No Frontend:**
  ```ts
  import { isClientFeatureEnabled } from '@/utils/features'

  if (isClientFeatureEnabled('LEMBRETES_WHATSAPP')) {
    // exibe botão novo controlado por VITE_FEATURE_LEMBRETES_WHATSAPP=true
  }
  ```

---

## 5. Como Testar Tudo Localmente Antes do Commit

Antes de fazer push, rode estes **3 comandos** na raiz do projeto:

```bash
# 1. Formata automaticamente todo o código (Prettier)
npm run format

# 2. Roda ESLint + TypeScript + Testes SQLite + Lint e Build do Frontend
npm run check

# 3. Sobe o Postgres 17 local automaticamente e roda todos os testes em PostgreSQL (incluindo RLS!)
npm run test:pg
```

Se os três terminarem sem erros (código `0`), o CI do GitHub Actions passará de primeira!

---

## 6. Fluxo Completo até Jogar na `master` (Produção)

```mermaid
flowchart LR
  L["1. Máquina Local<br/>git checkout -b feat/ideia<br/>npm run check && npm run test:pg"] --> D["2. PR -> develop<br/>CI Verde + Preview Staging"]
  D --> S["3. Validar em Staging<br/>Testar tela/fluxo no Preview"]
  S --> M["4. PR develop -> master<br/>Backup + db:migrate:prod (se houver)"]
  M --> P["5. Produção V2 no Ar<br/>npm run smoke:test + tag v2.x.0"]
```

### Passo a passo de comandos Git:

1. **Criar a branch da sua alteração a partir da `develop` atualizada:**

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/nome-curto-da-alteracao
   ```

2. **Fazer commits semânticos (Conventional Commits) após validar com `npm run check` e `npm run test:pg`:**

   ```bash
   git add .
   git commit -m "feat(alunos): adiciona filtro rapido por instrumento"
   git push -u origin feat/nome-curto-da-alteracao
   ```

3. **Integrar na `develop` (Ambiente de Staging / Preview):**
   - Abra um Pull Request `feat/nome-curto-da-alteracao -> develop` no GitHub.
   - Aguarde os **4 checks do CI** ficarem verdes e faça o **Merge** na `develop`.
   - Se a alteração tiver migration nova, aplique primeiro no banco de **Staging**:
     ```bash
     DATABASE_URL="<URL_POOLER_STAGING>" \
     DATABASE_DIRECT_URL="<URL_DIRETA_5432_STAGING>" \
     DB_CONNECTION=pg NODE_ENV=production APP_KEY="<APP_KEY_STAGING>" APP_URL="https://staging.vercel.app" \
     npm run db:migrate:prod
     ```
   - Teste a funcionalidade na URL de **Preview da Vercel** gerada automaticamente pela branch `develop`.

4. **Promover da `develop` para a `master` (Produção):**
   Quando estiver 100% satisfeito no Staging:
   1. Atualize o `CHANGELOG.md` (movendo os itens de `[Unreleased]` para a nova versão, ex.: `## [2.1.0] - AAAA-MM-DD`) e o `"version"` no `package.json` / `frontend/package.json`.
   2. Abra um Pull Request **`develop -> master`** no GitHub e aguarde o CI ficar 100% verde.
   3. **Se houver migration nova neste PR**, rode antes do merge um backup rápido + a migration explícita no Supabase de **Produção** (porta `:5432`):
      ```bash
      DATABASE_DIRECT_URL="<URL_DIRETA_5432_PROD>" ./scripts/backup_postgres.sh

      DATABASE_URL="<URL_POOLER_6543_PROD>" \
      DATABASE_DIRECT_URL="<URL_DIRETA_5432_PROD>" \
      DB_CONNECTION=pg NODE_ENV=production APP_KEY="<APP_KEY_PROD>" APP_URL="https://<prod>.vercel.app" \
      npm run db:migrate:prod
      ```
   4. Clique em **Merge pull request** no GitHub -> a Vercel fará o deploy automático de Produção!
   5. Rode o smoke test pós-deploy e crie a tag da versão:
      ```bash
      API_URL="https://<sua-api-prod>.vercel.app" npm run smoke:test

      git checkout master && git pull origin master
      git tag -a v2.1.0 -m "Release v2.1.0"
      git push origin v2.1.0
      ```
