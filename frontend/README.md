# Music Class — Frontend

Interface web (React) para a API AdonisJS de gerenciamento de aulas particulares.

## Pré-requisitos

- Node.js 20+
- API rodando em `http://localhost:3333` (pasta raiz do monorepo)

## Instalação

```bash
cd frontend
cp .env.example .env
npm install
```

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_API_URL` | URL base da API **sem** `/api/v1` | `http://localhost:3333` |

O cliente HTTP usa `${VITE_API_URL}/api/v1`.

## Desenvolvimento

Terminal 1 — API (raiz do projeto):

```bash
npm run dev
```

Terminal 2 — Frontend:

```bash
cd frontend
npm run dev
```

Abra `http://localhost:5173`.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor Vite |
| `npm run build` | Typecheck + build de produção |
| `npm run preview` | Preview do build |

## Estrutura

```text
src/
├── components/   # UI reutilizável
├── contexts/     # Auth e toasts
├── layouts/      # Auth e app (sidebar)
├── pages/        # Telas
├── routes/       # Router e guards
├── services/     # Chamadas à API
├── types/        # Tipos da API
└── utils/        # Formatação, catálogo, erros, token
```

## Funcionalidades (espelham a API)

- Autenticação (signup / login / logout / profile) com Bearer token
- Alunos (CRUD)
- Pacotes / plans (CRUD, créditos, marcar pago)
- Aulas (CRUD, lista + calendário mensal client-side)
- Dashboard derivado de `students` + `plans` + `lessons`

Não há endpoint de paginação, pagamentos separados, catálogo de pacotes ou instrumentos — o frontend usa apenas o que a API expõe (catálogo `PACKAGES` espelhado no código).

## Segurança

- Token de acesso em **`sessionStorage`** (limpo ao fechar a aba); nunca em URL ou logs
- Interceptor Axios: envia `Authorization: Bearer …`; em **401** limpa a sessão
- Validação de formulários no cliente (UX); autorização real fica na API
- Sem `dangerouslySetInnerHTML`
- Mensagens de erro amigáveis; sem exposição de tokens/senhas

**Produção:** configure CORS na API para a origem do frontend. Em desenvolvimento a API aceita qualquer origem.

## Build de produção

```bash
npm run build
```

Artefatos em `dist/`. Sirva com qualquer host estático e aponte `VITE_API_URL` para a API pública no build.
