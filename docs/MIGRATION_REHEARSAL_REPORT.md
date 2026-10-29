# Relatório de Ensaios de Migração de Dados e Plano de Cutover (Fase 6)

- **Data de execução:** 2026-10-29
- **Escopo:** Tarefas `6.2` a `6.8` do [V2_ROADMAP.md](./V2_ROADMAP.md) e Seção `12.6` do [V2_PLANO_DE_TRANSICAO.md](./V2_PLANO_DE_TRANSICAO.md)
- **Status:** ✅ **100% APROVADO — Dois ensaios concluídos com paridade total, tokens preservados e rollback validado**

---

## 1. Sumário Executivo

Os dois ensaios completos de migração de dados da V1 (PostgreSQL 18 / baseline Neon) para a V2 (PostgreSQL 15 e PostgreSQL 17 / perfil Supabase) foram executados e cronometrados utilizando o orquestrador automatizado [`scripts/rehearse_cutover.sh`](../scripts/rehearse_cutover.sh) e o verificador de paridade [`scripts/verify_migration_parity.ts`](../scripts/verify_migration_parity.ts).

Principais resultados comprovados:

1. **Paridade 100% Idêntica:** Todas as 7 tabelas de domínio da V1 e todas as somas financeiras (`SUM(price) = R\$ 650,00`, `SUM(lessons_total) = 20`, `SUM(amount) = R\$ 55,00`) permaneceram inalteradas antes e depois das migrations da V2.
2. **Compatibilidade Cross-Version Automática:** O script detecta automaticamente servidores de destino PostgreSQL `< 17` e remove diretivas exclusivas do `pg_dump` 18 (`SET transaction_timeout`), garantindo restore limpo tanto em PostgreSQL 15 quanto em PostgreSQL 17.
3. **Migrations Pendentes da V2 (`18 -> 21`):** As 3 migrations da V2 (`1786577000000_add_plan_financial_checks`, `1786577500000_create_rate_limit_buckets_table` e `1786578000000_enable_rls_all_tables`) executaram sem conflitos sobre os dados reais em **`99 ms` a `114 ms`** de tempo de banco, habilitando RLS nas **8 tabelas**.
4. **Continuidade de Sessões e `APP_KEY`:** Tokens Bearer (`oat_...`) emitidos na V1 antes do congelamento continuaram autenticando normalmente na API V2 (`HTTP 200` em `82 ms`) sem necessidade de novo login, e contas existentes autenticaram via `scrypt` (`85 ms`).
5. **Modo Somente Leitura e Rollback:** O congelamento de escritas via `APP_READ_ONLY=true` bloqueou mutações com `HTTP 503` (`E_MAINTENANCE_READ_ONLY`) preservando leituras (`HTTP 200`), e o rollback completo de tráfego para a V1 foi concluído em **`728 ms`** com base original intacta.

---

## 2. Ensaio 1 — Migração para Staging + Anonimização (Tarefas 6.2, 6.3 e 6.4)

- **Origem:** Container isolado `postgres:18-alpine` (PostgreSQL `18.3`) populado com [`backups/v1_backup.dump`](../backups/v1_backup.dump) (`32 KB`).
- **Destino:** Container isolado `postgres:15-alpine` (PostgreSQL `15.19`), validando retrocompatibilidade PG 18 -> PG 15 + script [`scripts/anonymize_staging.sql`](../scripts/anonymize_staging.sql).

### 2.1 Paridade de Registros e Somas Financeiras (Pré e Pós-Migration)

| Tabela / Métrica             | Origem (V1) | Destino Pré-Migrate | Destino Pós-Migrate V2  | Status       |
| ---------------------------- | ----------- | ------------------- | ----------------------- | ------------ |
| `users`                      | `1`         | `1`                 | `1`                     | ✅ Idêntico  |
| `students`                   | `2`         | `2`                 | `2`                     | ✅ Idêntico  |
| `plans`                      | `5`         | `5`                 | `5`                     | ✅ Idêntico  |
| `lessons`                    | `22`        | `22`                | `22`                    | ✅ Idêntico  |
| `plan_types`                 | `3`         | `3`                 | `3`                     | ✅ Idêntico  |
| `plan_discounts`             | `2`         | `2`                 | `2`                     | ✅ Idêntico  |
| `auth_access_tokens`         | `23`        | `23`                | `23`                    | ✅ Idêntico  |
| `adonis_schema` (migrations) | `18`        | `18`                | **`21`** (`+3` V2)      | ✅ Evoluído  |
| `rate_limit_buckets`         | _(ausente)_ | _(ausente)_         | **Criada (`0` linhas)** | ✅ Criada    |
| `plans.SUM(price)`           | `650.00`    | `650.00`            | `650.00`                | ✅ Idêntico  |
| `plans.SUM(lessons_total)`   | `20`        | `20`                | `20`                    | ✅ Idêntico  |
| `plan_discounts.SUM(amount)` | `55.00`     | `55.00`             | `55.00`                 | ✅ Idêntico  |
| `plan_types.SUM(price)`      | `405.00`    | `405.00`            | `405.00`                | ✅ Idêntico  |
| RLS ativo nas 8 tabelas      | Não         | Não                 | **Sim (`8/8` tabelas)** | ✅ Protegido |

### 2.2 Tempos Medidos no Ensaio 1

| Etapa                                             | Duração Medida           |
| ------------------------------------------------- | ------------------------ |
| 1. Pre-flight check de conectividade e versão     | `150 ms`                 |
| 2. `pg_dump -Fc` da origem (`32 KB`)              | `167 ms`                 |
| 3. `pg_restore` cross-version no destino PG 15    | `293 ms`                 |
| 3.5 Sanitização de PII (`anonymize_staging.sql`)  | `53 ms`                  |
| 4. Verificação automática de paridade pré-migrate | `336 ms`                 |
| 5. `npm run db:migrate:prod` (`114 ms` SQL puro)  | `1.179 ms`               |
| 6. Verificação pós-migrate + constraints + RLS    | `296 ms`                 |
| **Tempo Total do Pipeline (Ensaio 1)**            | **`2.498 ms` (~2,50 s)** |

---

## 3. Ensaio 2 — Roteiro Completo do Dia do Cutover, `APP_KEY` e Rollback (Tarefas 6.5, 6.6 e 6.7)

- **Origem:** PostgreSQL `18.3` com build de produção compilado (`node build/bin/server.js`) e `APP_KEY` compartilhada.
- **Destino:** Container isolado `postgres:17` (PostgreSQL `17.11`), simulando o projeto `music-class-prod` no Supabase sem anonimização.

### 3.1 Cronometragem Completa do Fluxo do Dia D

| Passo do Cutover (Seção 12.6)                                         | Resultado Técnico                                             | Duração Medida           |
| --------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------ |
| **Passo 2:** Ativar `APP_READ_ONLY=true` na V1                        | `POST /students -> 503 E_MAINTENANCE_READ_ONLY`, `GET -> 200` | `686 ms`                 |
| **Passo 3/4a:** `pg_dump -Fc` final da origem congelada               | Arquivo `.dump` íntegro (`32 KB`)                             | `157 ms`                 |
| **Passo 4b:** `pg_restore` limpo no destino PostgreSQL 17.11          | Código de saída `0`, sem avisos                               | `176 ms`                 |
| **Passo 4c:** Conferência de paridade pré-migration                   | `100%` idêntico em todas as 7 tabelas e somas                 | `306 ms`                 |
| **Passo 4d:** `npm run db:migrate:prod` (3 migrations V2)             | `99–101 ms` no Postgres (`1.178 ms` processo Node completo)   | `1.178 ms`               |
| **Passo 5:** Conferência pós-migration + constraints `CHECK` + RLS    | `21` migrations, `2` checks em `plans` e RLS nas `8` tabelas  | `283 ms`                 |
| **Passo 6/7:** Smoke Test autenticado completo na V2 (`10/10` checks) | Token pré-cutover, login `scrypt`, dashboard, CSV e PDFKit OK | `672 ms`                 |
| **Tempo Técnico Total da Migração de Dados (`rehearse_cutover.sh`)**  | **Pipeline de banco ponta a ponta**                           | **`2.240 ms` (~2,24 s)** |

> [!NOTE]
> Em rede de nuvem real (Neon `sa-east-1` -> máquina/runner -> Supabase `sa-east-1`), considerando RTT TLS de `~30–80 ms` para um volume de `~32 KB` a alguns megabytes, o pipeline completo de banco (`rehearse_cutover.sh`) levará estimados **`10` a `30 segundos`**, mantendo toda a operação técnica dentro de **menos de 5 minutos**.

### 3.2 Validação de Login e Preservação de Tokens com `APP_KEY` (Tarefa 6.6)

Com a mesma `APP_KEY` configurada na instância V2 e `RATE_LIMIT_ENABLED=1` (gravando em `rate_limit_buckets` no PostgreSQL 17 com RLS ativo), o `npm run smoke:test` validou:

- `GET /` -> `200 OK` (`47 ms`)
- `GET /health` -> `200 OK` (`5 ms`, `database: "connected"`)
- `GET /api/v1/packages` (sem token) -> `401 Unauthorized` (`6 ms`)
- `GET /api/v1/students` (sem token) -> `401 Unauthorized` (`4 ms`)
- **`GET /api/v1/account/profile` com Bearer token `oat_...` emitido na V1 antes da migração** -> **`200 OK` (`82 ms`)** _(sessões ativas dos professores permanecem válidas após o cutover sem exigir novo login)_
- **`POST /api/v1/auth/login` com conta real de teste (`scrypt`)** -> **`200 OK` (`85 ms`)**
- `GET /api/v1/dashboard` -> `200 OK` (`154 ms`)
- `GET /api/v1/students` -> `200 OK` (`22 ms`)
- `GET /api/v1/export?month=2026-10` (CSV) -> `200 OK` (`25 ms`)
- `GET /api/v1/export.pdf?month=2026-10` (PDFKit) -> `200 OK` (`242 ms`, assinatura `%PDF-` íntegra)

### 3.3 Ensaio de Rollback (Tarefa 6.7)

1. Foi realizada uma escrita pós-cutover na V2 (`POST /api/v1/students` -> `201 Created`, elevando `students` para `3` apenas no banco V2).
2. Simulou-se um incidente exigindo retorno imediato para a V1: tráfego da V2 encerrado e instância V1 reaberta com `APP_READ_ONLY=false` apontando para o banco original.
3. **Tempo de recuperação (RTO do Rollback):** **`728 ms`** (na Vercel/Render real, o promote/redeploy de variável leva `~30` a `90 segundos`).
4. **Validação pós-rollback:** `10/10` checagens do `smoke:test` aprovadas na V1, token pré-cutover continuou válido (`66 ms`) e a contagem de `students` na V1 permaneceu intacta em `2` registros.

---

## 4. Definição da Janela de Cutover, Comunicação e Critérios de Rollback (Tarefa 6.8)

### 4.1 Janela Oficial de Manutenção Planejada

- **Dia e Horário:** **Domingo, das `02:00` às `02:30` (Horário de Brasília — `BRT / UTC-3`)** (`05:00` às `05:30 UTC`).
- **Justificativa:** Madrugada de sábado para domingo tem uso praticamente nulo por professores de música (evitando qualquer impacto em aulas de fim de tarde, noite ou sábado pela manhã).
- **Duração estimada real:** `~5 minutos` de execução técnica + `25 minutos` de margem para validação calma e observação inicial.
- **Preparação de DNS (48h antes, se houver domínio próprio):** Reduzir o `TTL` dos registros `A` / `CNAME` para `60` ou `300` segundos.

### 4.2 Templates de Aviso aos Usuários

**1. Aviso Prévio (Enviar 24h a 48h antes — WhatsApp / E-mail):**

> **Aviso de Atualização Programada — Music Class**
> Olá! Neste domingo, entre **02h00 e 02h30 da madrugada (horário de Brasília)**, faremos uma rápida manutenção programada para atualizar a infraestrutura do Music Class, trazendo mais velocidade e segurança. Durante esses minutos o salvamento de novos registros ficará temporariamente pausado, retornando normalmente logo em seguida sem necessidade de novo cadastro.

**2. Início da Janela (`02:00 BRT` — se necessário em canal de status):**

> Iniciamos agora a manutenção programada do Music Class (modo somente leitura ativo). Previsão de conclusão até 02h30 BRT.

**3. Conclusão da Manutenção (`~02:15–02:30 BRT`):**

> Manutenção concluída com sucesso! O Music Class já está operando normalmente na nova infraestrutura. Bom trabalho e boas aulas!

### 4.3 Critérios Objetivos de Go/No-Go e Gatilhos de Rollback

| Momento                    | Métrica / Verificação                                     | Limite Aceitável (GO)         | Gatilho de Aborto / Rollback Imediato (NO-GO)                           | Ação Operacional                                                                       |
| -------------------------- | --------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Pré-abertura (Passo 5)** | `npm run db:verify:parity -- --post-migrate`              | `0` divergências (`passed`)   | Qualquer divergência (`!= 0`) em contagens, `SUM(price)` ou RLS inativo | **Abortar antes de virar `VITE_API_URL`/DNS**; tirar `APP_READ_ONLY` da V1.            |
| **Pré-abertura (Passo 7)** | `npm run smoke:test` com conta real + token existente     | `10/10` checks `PASS`         | Qualquer falha em `/health`, login, token prévio, CSV ou PDF            | **Abortar virada**; manter usuários na V1 (Render + Neon) e investigar em staging.     |
| **Primeiros 30 min**       | Taxa de erros HTTP `5xx` (Logs Vercel / Sentry)           | `< 1%` (zero erros 500 de DB) | **`5xx > 2%` por `10 minutos`** ou `>= 3` exceções críticas de conexão  | **Executar Rollback Imediato**: reapontar `VITE_API_URL`/DNS para V1 e reabrir V1.     |
| **Primeiros 30 min**       | Disponibilidade e latência de `GET /health` (UptimeRobot) | HTTP `200` e `p95 < 2s`       | Indisponível (`503`/timeout) ou `p95 > 5s` sustentado por `5 minutos`   | **Executar Rollback Imediato** para V1 (ou contingência Fase 4-alt).                   |
| **Primeiras 24–48 h**      | Integridade de escrita pós-cutover e sessões              | Zero perda/corrupção          | Qualquer anomalia de integridade financeira ou falha generalizada auth  | Congelar escrita (`APP_READ_ONLY=true`), exportar delta criado pós-cutover e reverter. |

> [!WARNING]
> **Preservação da Infraestrutura Legada:** O serviço da V1 (Render + Neon PostgreSQL) **não deve ser desligado no dia do cutover**. Ele permanecerá preservado (em repouso / somente leitura) por **2 a 4 semanas** de operação estável da V2 e só será descomissionado após arquivamento de um dump final definitivo.
