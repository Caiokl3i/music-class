# Music Class

Gestão para professores particulares de música: alunos, pacotes, agenda, créditos e o que tem a receber no mês.

Cada conta é um estúdio. Um professor não vê os dados do outro.

**Interface** React · **API** AdonisJS 7 (`/api/v1`) · **Banco** SQLite (local) / PostgreSQL (produção)

---

## O que o professor faz

- Cadastra alunos (instrumento, horário usual, nível, tags) e arquiva quem parou
- Vende pacotes (avulsa, mensal 4, mensal 8 — ou tipos que ele mesmo cria)
- Agenda aulas, marca falta, conclui, gera a semana de uma vez
- Vê no painel o dia de hoje, atrasadas, a receber, crédito acabando e aniversários
- Cobra por WhatsApp ou PDF e exporta o mês em CSV/PDF
- Manda uma cópia do banco por e-mail (botão no painel)

Aula padrão: **1 hora**. Crédito válido por **60 dias** depois do pagamento. Só a aula feita conta no progresso; cancelar devolve o crédito.

---

## Stack

```text
React (Vite)  ── token ──►  AdonisJS  ──►  SQLite local  ou  Postgres no Render
 :5173                       :3333          tmp/db.sqlite3
```

Um processo Node, sem fila e sem Redis. E-mail só no backup SQLite (Resend).

---

## Rodar local

Node **24**. Dois terminais:

```bash
# API
cp .env.example .env
node ace generate:key          # cole em APP_KEY
# SIGNUP_INVITE_CODE=uma-frase  # sem isso o cadastro fica fechado
npm install
node ace migration:run
npm run dev                    # http://localhost:3333
```

```bash
# Interface
cd frontend
cp .env.example .env
npm install
npm run dev                    # http://localhost:5173
```

Conta de demonstração (`npm run db:seed`, só em development): `demo@musicclass.test` / `password123`.

Ou os dois de uma vez: `export APP_KEY='…'` e `docker compose up --build` → app em http://localhost:8080.

Variáveis: [`.env.example`](.env.example) e [`frontend/.env.example`](frontend/.env.example).

---

## Produção

Site na **Vercel** (pasta `frontend`, `VITE_API_URL` = URL da API).  
API no **Render** (Docker da raiz, `CORS_ORIGIN` = URL da Vercel, `DATABASE_URL` do Postgres).

Suba o banco e a API primeiro. Depois o site.

No plano grátis, o disco do web service some quando a instância dorme ou redeploya. Contas e aulas no SQLite (`tmp/db.sqlite3`) desaparecem. O outro projeto “mantém” seed porque o seed roda de novo no boot — não porque o disco sobrevive. Crie um **PostgreSQL** no Render, ligue `DATABASE_URL` e `DB_CONNECTION=pg` (o `render.yaml` já faz isso no Blueprint).

---

Licença MIT.
