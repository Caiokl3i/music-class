# Music Class — Modelo de dados

Sistema simples para organizar aulas particulares de instrumentos e registrar pagamentos.

Objetivo: estudar AdonisJS e resolver o fluxo real de alunos, pacotes e aulas.

## Contexto de negócio

Planos oferecidos:

| Pacote | Aulas | Preço cheio | Preço ofertado | Por aula |
|--------|------:|------------:|---------------:|---------:|
| Aula avulsa | 1 | R$ 35 | R$ 35 | R$ 35,00 |
| Pacote mensal 1 | 4 | R$ 140 | R$ 130 | R$ 32,50 |
| Pacote mensal 2 | 8 | R$ 280 | R$ 240 | R$ 30,00 |

Cada aula tem 1 hora.

## Ideia central

| Conceito | Significa |
|----------|-----------|
| **Student** | Aluno |
| **Plan** | Compra de um pacote (créditos + pagamento) |
| **Lesson** | Aula agendada ou realizada (só `done` conta no pacote) |
| **User** | Professor (dono dos registros; já existe no Adonis) |

`Plan` **não** é cópia de `Lesson`.  
`Plan` = pacote comprado. `Lesson` = aula; só a concluída conta no andamento do pacote.

Aula avulsa também cria um `Plan` (`single`, 1 crédito). Mesmo fluxo para todos os casos.

## Diagrama de relacionamentos

```mermaid
erDiagram
    users ||--o{ students : "tem"
    users ||--o{ plans : "tem"
    users ||--o{ lessons : "tem"
    students ||--o{ plans : "compra"
    students ||--o{ lessons : "faz"
    plans ||--o{ lessons : "consome crédito"

    users {
        int id PK
        string full_name
        string email UK
        string password
        datetime created_at
        datetime updated_at
    }

    students {
        int id PK
        int user_id FK
        string name
        date birthdate
        string instrument
        string phone
        text description
        int preferred_weekday
        string preferred_time
        datetime created_at
        datetime updated_at
    }

    plans {
        int id PK
        int user_id FK
        int student_id FK
        enum package
        int lessons_total
        decimal price
        enum status
        datetime paid_at
        datetime expires_at
        text notes
        datetime created_at
        datetime updated_at
    }

    lessons {
        int id PK
        int user_id FK
        int student_id FK
        int plan_id FK
        datetime scheduled_at
        datetime ends_at
        enum status
        text description
        datetime created_at
        datetime updated_at
    }
```

Cardinalidade:

```
User 1 ──* Student
User 1 ──* Plan
User 1 ──* Lesson

Student 1 ──* Plan
Student 1 ──* Lesson

Plan 1 ──* Lesson
```

## Fluxo (visão rápida)

```mermaid
flowchart LR
    A[Cadastrar Student] --> B[Criar Plan<br/>pacote + pagamento]
    B --> C[Agendar Lessons<br/>1 crédito cada]
    C --> D{Status da aula}
    D -->|done| E[Conta no pacote]
    D -->|scheduled / no_show| G[Não conta ainda]
    D -->|cancelled| F[Não ocupa vaga]
```

## Catálogo de preços (código, não tabela)

Os 3 pacotes são fixos. Ficam como constante na aplicação:

```ts
export const PACKAGES = {
  single: { lessons: 1, price: 35 },
  pack_4: { lessons: 4, price: 130 },
  pack_8: { lessons: 8, price: 240 },
} as const
```

Só vale criar tabela `plan_types` depois, se precisar editar preços pela interface.

## Tabelas

### `users` (já existe)

Professor autenticado no sistema. Usado como `user_id` nas demais tabelas para isolar os dados.

| Campo | Tipo | Obrigatório | Nota |
|-------|------|:-----------:|------|
| id | int | sim | PK |
| full_name | string | não | |
| email | string | sim | Único |
| password | string | sim | |
| created_at | datetime | sim | |
| updated_at | datetime | não | |

### `students`

| Campo | Tipo | Obrigatório | Nota |
|-------|------|:-----------:|------|
| id | int | sim | PK |
| user_id | FK → users | sim | Professor dono |
| name | string | sim | |
| birthdate | date | não | |
| instrument | string | sim | Ex.: violão |
| phone | string | não | Contato / WhatsApp |
| description | text | não | Observações gerais |
| preferred_weekday | int | não | ISO 1–7 (segunda=1); `null` = sem dia fixo |
| preferred_time | string | não | `HH:mm`; `null` = 14:00 no agendar |
| created_at | datetime | sim | |
| updated_at | datetime | não | |

### `plans`

Compra do pacote pelo aluno.

| Campo | Tipo | Obrigatório | Nota |
|-------|------|:-----------:|------|
| id | int | sim | PK |
| user_id | FK → users | sim | |
| student_id | FK → students | sim | |
| package | enum | sim | `single` \| `pack_4` \| `pack_8` |
| lessons_total | int | sim | 1, 4 ou 8 |
| price | decimal(8,2) | sim | 35 / 130 / 240 |
| status | enum | sim | `pending` \| `paid` \| `cancelled` |
| paid_at | datetime | não | `null` = ainda não pagou |
| expires_at | datetime | não | `paid_at` + 60 dias; `null` = sem validade (pendente ou plano antigo) |
| notes | text | não | |
| created_at | datetime | sim | |
| updated_at | datetime | não | |

### `lessons`

Aula individual ligada a um pacote.

| Campo | Tipo | Obrigatório | Nota |
|-------|------|:-----------:|------|
| id | int | sim | PK |
| user_id | FK → users | sim | |
| student_id | FK → students | sim | |
| plan_id | FK → plans | sim | Pacote que esta aula consome |
| scheduled_at | datetime | sim | Início da aula |
| ends_at | datetime | sim | Fim da aula (padrão: início + 60 min) |
| status | enum | sim | `scheduled` \| `done` \| `cancelled` \| `no_show` |
| description | text | não | O que foi treinado / anotações |
| created_at | datetime | sim | |
| updated_at | datetime | não | |

## Fluxo do dia a dia

1. Cadastrar o aluno em `students`.
2. Aluno compra um pacote → criar `plan`  
   Ex.: `package: pack_4`, `lessons_total: 4`, `price: 130`, `status: paid`.
3. Agendar aulas → criar `lessons` com o `plan_id` correspondente.
4. Após a aula → atualizar `status` para `done`.
5. Créditos restantes:

```text
feitas     = aulas com status done
a fazer    = lessons_total - feitas
vagas      = lessons_total - aulas com status != cancelled
```

## Regras de domínio

- Pacote **pago** ou **pendente** agenda aula. Dá para dar aula agora e receber depois, ou o contrário. Cancelado não agenda.
- Pode existir mais de um pacote pendente no mesmo aluno (pagamento atrasado não trava o próximo).
- Só aula **concluída** (`done`) conta no andamento. Agendada e falta ainda não.
- Não permitir mais aulas ativas (agendada / feita / falta) em um `plan` do que `lessons_total`.
- Cancelar aula (`cancelled`) **libera a vaga**. Falta (`no_show`) ocupa vaga, mas não conta como feita.
- Pagamento fica no próprio `plan` (`price` + `status` + `paid_at`). Sem tabela `payments` na v1.
- Cada aula tem **início e fim** (padrão 60 minutos, no máximo 8h). Duas aulas do mesmo professor não podem se sobrepor; encostar (14h–15h e 15h–16h) pode. Aula cancelada não ocupa horário.
- Créditos valem **60 dias** a partir de `paid_at` (`expires_at`). Pacote vencido não agenda aula nova; concluir uma já agendada continua permitido.
- Dá para gerar as aulas restantes do pacote em lote (mesmo dia da semana, de hora em hora semanal), parando na validade. Se algum horário já estiver ocupado, não cria nenhuma.

## Fora do escopo (v1)

- Tabela separada de pagamentos
- Tabela de tipos de plano editáveis
- Múltiplos professores com papéis complexos (`user_id` já isola se um dia precisar)
- Financeiro avançado (comissões, recorrência automática, etc.)
