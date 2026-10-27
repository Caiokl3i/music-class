# Music Class — Plano de Transição V1 → V2

Objetivo: evoluir o produto **sem derrubar nem corromper o que já roda em produção**.
Princípio central: **a V1 é intocável; a V2 nasce ao lado dela e só substitui a V1 quando provar que é igual ou melhor.**

---

## 1. Princípios

1. **Produção é sagrada.** Nenhum commit vai direto para o que está em produção sem passar pelo fluxo abaixo.
2. **Dados valem mais que código.** Código se refaz; dados de alunos, pacotes e pagamentos, não. Backup verificado antes de qualquer mudança de schema.
3. **Mudanças pequenas e reversíveis.** Preferir muitos PRs pequenos a um "big bang".
4. **Sem teste, sem merge.** Os testes da V1 (funcionais + unitários) são a rede de segurança.
5. **Todo deploy precisa ter plano de volta (rollback).**

---

## 2. Congelar a V1 (fazer primeiro, uma única vez)

1. Garantir que `main` == o que está em produção (Render + Vercel).
2. Criar tag e branch de manutenção:
   ```bash
   git tag -a v1.0.0 -m "V1 em produção - baseline"
   git push origin v1.0.0
   git branch release/v1 v1.0.0
   git push origin release/v1
   ```
   - `release/v1`: só recebe **hotfixes** de bugs críticos da V1.
   - Tag `v1.0.0`: ponto de retorno garantido.
3. **Backup do banco de produção** (Postgres do Render) e **testar a restauração** em um banco vazio. Backup nunca restaurado não é backup.
   ```bash
   pg_dump "$DATABASE_URL" -Fc -f backup_v1_$(date +%F).dump
   pg_restore --no-owner -d "$DB_TESTE" backup_v1_$(date +%F).dump
   ```
4. Anotar em local seguro (gerenciador de senhas): variáveis de ambiente de produção (`APP_KEY`, `DATABASE_URL`, `RESEND_API_KEY`, `SIGNUP_INVITE_CODE`, `CORS_ORIGIN`...). `APP_KEY` perdida = tokens/criptografia invalidados.
5. Registrar o **estado de produção** (versão do Node, imagem, URLs, plano do Render/Vercel).

---

## 3. Estratégia de branches (simples e profissional para solo)

```
master          ← produção (protegida)
release/v1      ← tag v1.0.0 e hotfixes da V1
develop         ← desenvolvimento da V2 (abre PR para master quando estiver estável)
```

- Habilitar **branch protection** em `master` no GitHub: exigir PR antes do merge.
- Commits no padrão **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`).
- Versionamento **SemVer**: V1 = `1.x.y`; V2 = `2.0.0`.
- Manter `CHANGELOG.md`.

---

## 4. Ambientes (nunca testar em produção)

| Ambiente           | Para quê                      | Banco                                                          | Como                                                                |
| ------------------ | ----------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Local              | Desenvolvimento               | SQLite                                                         | `npm run dev`                                                       |
| **Staging** (novo) | Validar a V2 como em produção | **Projeto Supabase separado**, com cópia anonimizada dos dados | Preview/projeto da Vercel (branch `develop-v2`) para API e frontend |
| Produção V1        | Usuários reais                | Postgres do Render (atual)                                     | Render + Vercel atuais. **Não mexer** até o cutover (seção 12)      |
| Produção V2 (alvo) | Usuários reais após cutover   | **Supabase** (projeto de produção)                             | **Vercel** (API + frontend)                                         |

> A V1 usa SQLite localmente mas Postgres em produção. Isso é um risco (comportamentos diferentes). Na V2, **rodar os testes também contra Postgres** (ver auditoria, item A-04).

Regras: staging **nunca** usa `DATABASE_URL`/`RESEND_API_KEY` de produção, e dados reais só entram anonimizados (nome, telefone, e-mail).

---

## 5. Mudanças de banco de dados (o ponto mais perigoso)

Use o padrão **expand → migrate → contract**, em deploys separados:

1. **Expand**: adicionar colunas/tabelas novas, nullable ou com default. A V1 continua funcionando.
2. **Migrate**: copiar/transformar dados (script idempotente, testado em staging com cópia do prod).
3. **Contract**: só depois que a V2 estiver estável por um período, remover o que ficou obsoleto.

Regras:

- **Nunca editar migrations já aplicadas.** Sempre criar nova.
- **Nunca `dropColumn`/`dropTable` no mesmo deploy** em que o código deixa de usar a coluna.
- Cada migration com `down()` funcional quando possível; senão, documentar que é irreversível e exigir backup antes.
- Atenção: [docker/api-entrypoint.sh](../docker/api-entrypoint.sh) roda `migration:run --force` **a cada boot**. Qualquer migration ruim executa em produção automaticamente no deploy. Por isso: testar em staging com dump do prod **antes**.
- Fazer backup imediatamente antes de todo deploy que contenha migration.
- **Na Vercel não existe "boot" de servidor**: o `migration:run` do entrypoint deixa de existir. Migrations passam a ser um **passo explícito** (CI ou comando manual) contra o Supabase, **antes** do deploy do código. Ver seção 12.4.

---

## 6. Contrato da API (`/api/v1`)

- O frontend V1 e a API V1 conversam por `/api/v1`. **Não quebrar `/api/v1`** enquanto a V1 estiver ativa.
- Mudanças incompatíveis → novo prefixo `/api/v2`, mantendo `/api/v1` funcionando até a migração completa.
- Mudanças compatíveis (campo novo opcional) podem ficar em `/api/v1`.
- Remover `/api/v1` só depois de confirmar (logs) que ninguém mais usa.

---

## 7. Rede de segurança de qualidade

Criar CI (GitHub Actions) rodando em todo PR:

```
npm ci → lint → typecheck → test (backend)
cd frontend → npm ci → lint → build
docker build (valida o Dockerfile)
```

Adicionar:

- Testes de **caracterização** antes de refatorar áreas sem cobertura (ver auditoria).
- Um **smoke test pós-deploy**: `GET /` retorna `{ok:true}`, login com conta de teste, listar alunos.
- Dependabot/Renovate para dependências.

---

## 8. Estratégia de release e rollback

**Release incremental (recomendado)** em vez de trocar tudo de uma vez:

1. Mergear em `develop-v2` → deploy automático em **staging**.
2. Validar com checklist (seção 9).
3. Criar PR `develop-v2 → main` → tag `v2.0.0-rc.1`.
4. Antes do deploy: backup do banco. Deploy de **API primeiro**, depois frontend (a API nova deve aceitar o frontend antigo).
5. Rodar smoke test. Monitorar logs por 24–48h.

**Rollback**

- Código: Render → redeploy do deploy anterior; Vercel → "Promote" do deploy anterior; ou `git revert` + deploy.
- Banco: se migration foi apenas _expand_, o rollback de código basta (a V1 ignora colunas novas). Se houve _contract_/dados alterados → restaurar o backup. Por isso contract é o último passo.
- Definir antes: "se X acontecer em Y minutos, faço rollback".

**Feature flags simples**: variáveis de ambiente (`FEATURE_X=1`) para ligar/desligar funcionalidades novas sem novo deploy.

---

## 9. Checklist de aprovação para produção

- [ ] CI verde (lint, typecheck, testes, build, docker build)
- [ ] Testado em staging com dump anonimizado do prod
- [ ] Migrations revisadas (expand-only? reversível?)
- [ ] Backup recente **e restauração testada**
- [ ] Variáveis de ambiente novas cadastradas em produção **antes** do deploy
- [ ] `/api/v1` continua compatível
- [ ] Plano de rollback escrito
- [ ] Horário de baixo uso (ex.: madrugada/fim de semana — aulas de música: evitar fim de tarde)
- [ ] Smoke test pós-deploy executado
- [ ] CHANGELOG atualizado e tag criada

---

## 10. Roteiro sugerido

| Fase | Entrega                                                                                | Risco                        |
| ---- | -------------------------------------------------------------------------------------- | ---------------------------- |
| 0    | Congelar V1 (tag, branch, backup testado)                                              | Nenhum                       |
| 1    | CI + staging + proteção de branch                                                      | Baixo                        |
| 1.5  | **Spike (prova de conceito) Vercel + Supabase** em staging (seção 12.2)                | Baixo (não toca na produção) |
| 2    | **Correções da auditoria** que são críticas (A-01…A-05)                                | Baixo/Médio                  |
| 2.5  | **Cutover** Render→Vercel e Postgres→Supabase (seção 12.6), _antes_ das features novas | **Alto** (janela planejada)  |
| 3    | Refatorações com testes de caracterização                                              | Médio                        |
| 4    | Funcionalidades novas da V2 (flag + expand-only)                                       | Médio                        |
| 5    | Release `2.0.0-rc` → produção → monitorar                                              | Médio                        |
| 6    | Contract (limpeza), remoção de legado                                                  | Baixo                        |

> Dica: planeje a V2 como **evolução da V1 em fatias**, não como reescrita. Reescrever do zero é a causa nº 1 de V2 que nunca termina.

---

## 11. Documentação a manter durante a V2

- `CHANGELOG.md` (por release)
- `docs/adr/` — _Architecture Decision Records_: um arquivo curto por decisão importante (ex.: "por que Postgres no CI"). Salva você de você mesmo daqui a 6 meses.
- `docs/RUNBOOK.md` — como fazer deploy, rollback, restaurar backup, rotacionar chaves.
- README atualizado.

---

## 12. Mudança de infraestrutura: Render → Vercel (backend) e Postgres Render → Supabase

> [!IMPORTANT]
> Esta é a mudança **mais arriscada** da V2: troca o modelo de execução (servidor sempre ligado → _serverless_) e o banco ao mesmo tempo. **Não misture com features novas.** Faça o spike (12.2), o cutover (12.6) e só então siga com o produto.

### 12.1 O que muda de verdade

| Hoje (V1)                                               | Destino (V2)                                              | Impacto                                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Processo Node contínuo (Render, Docker)                 | Funções serverless na Vercel                              | Sem estado em memória, sem disco gravável, _cold start_, limite de tempo por requisição |
| `Dockerfile`, `render.yaml`, `docker/api-entrypoint.sh` | Configuração Vercel (`vercel.json`, entrypoint de função) | Arquivos de deploy da V1 ficam obsoletos (manter até o cutover)                         |
| `migration:run` no boot                                 | Migration como passo explícito                            | Ver 12.4                                                                                |
| Rate limit em memória                                   | Store externo (Upstash/Vercel KV ou tabela no Supabase)   | Em serverless o `Map` não é compartilhado: **o limite deixa de funcionar**              |
| Backup por e-mail (SQLite) / SQLite em produção         | Backups do Supabase                                       | `sqlite_backup`/`backup_email` deixam de fazer sentido em prod                          |
| Postgres do Render                                      | Supabase (Postgres gerenciado)                            | Pooler, SSL, região, backups                                                            |

### 12.2 Spike obrigatório antes de decidir (1–2 dias, só em staging)

AdonisJS é feito para **servidor persistente**, e a Vercel não tem suporte oficial de primeira classe ao Adonis. Rodá-lo como função serverless é possível (expondo o servidor HTTP do Adonis dentro de um handler), mas **não confio em afirmar que funciona sem testar**. Valide em staging:

- [ ] A API Adonis sobe como função Vercel (boot, `import` ESM, aliases `#...`, `node ace build`)
- [ ] Cold start aceitável (medir p50/p95)
- [ ] Login, CRUD de alunos/planos/aulas, dashboard funcionando
- [ ] **PDFKit** (cobrança/exportação): fontes embutidas, tamanho do bundle, tempo de execução dentro do limite
- [ ] `better-sqlite3` removido do bundle de produção (binário nativo não é necessário com Supabase)
- [ ] Sem escrita em disco (`tmp/`, `backups/`) em produção
- [ ] Limite de tempo/memória do plano da Vercel respeitado
- [ ] CORS/cookies entre frontend e API (mesmo domínio ou subdomínios)

**Critério de decisão:** se o spike falhar ou ficar frágil, alternativas (decidir com um ADR):

1. Frontend na Vercel + API Adonis em outro host de servidor persistente (Render/Fly/Railway) + Supabase. _Menor risco; você só troca o banco._
2. Reescrever a API como _Route Handlers_ Next.js / Hono (mais esforço — evitar na V2 se possível).
3. Vercel Functions com Fluid Compute (reduz custo de _cold start_ e permite concorrência) — verificar disponibilidade e limites no plano.

### 12.3 Supabase como banco

- **Usar o Supabase só como Postgres** (via Lucid/`pg`). Não migrar a autenticação para o Supabase Auth na V2: seria uma segunda migração grande (hash de senhas, tokens). Fica como ADR futuro.
- **Conexão com a Vercel (serverless):** usar o **pooler** do Supabase (Supavisor), não a conexão direta. Em modo _transaction_ (porta 6543) não há _prepared statements_ de sessão: validar o driver/Knex nesse modo. Usar a conexão direta (ou _session mode_) **apenas para migrations**.
- **Pool pequeno por função** (ex.: `min: 0, max: 1–2`) para não esgotar conexões com várias instâncias.
- **SSL obrigatório** (`ssl: { rejectUnauthorized: ... }` conforme config do Supabase).
- **Região**: criar o projeto na mesma região geográfica da função Vercel (latência por query pesa em serverless).
- **Row Level Security (RLS):** se a API é o único cliente do banco (via credencial de servidor), o isolamento por professor continua sendo feito pela aplicação (`user_id`). **Ainda assim, ative RLS nas tabelas** (sem policies públicas) para que a _Data API_ (PostgREST) do Supabase não exponha dados caso a chave `anon` vaze. Desativar a Data API se não for usada.
- **Segredos:** `service_role` key **nunca** no frontend nem em variável `VITE_*`. A API usa apenas a connection string do banco.
- **Planos e limites** _(conferir a página de preços atual)_: o plano gratuito pausa projetos inativos e não oferece o mesmo nível de backup de um plano pago. Para dados de clientes pagantes, considerar plano com **backups diários/PITR**.
- Backups extras: `pg_dump` agendado para storage externo (GitHub Actions + S3/Backblaze), com restauração testada.

### 12.4 Migrations no novo cenário

1. Remover a dependência do boot: criar script `npm run db:migrate:prod` (usa conexão direta ao Supabase).
2. Pipeline de release: **backup → migrate → deploy do código → smoke test**.
3. Staging usa **seu próprio projeto Supabase**; nunca apontar staging para o banco de produção.
4. Manter o padrão expand/contract (seção 5). Com migrate separado do deploy, a V-anterior do código precisa continuar funcionando com o schema novo.

### 12.5 Variáveis de ambiente e configuração

Revisar `config/database.ts` e `database/connection.ts` (hoje SQLite quando sem `DATABASE_URL`):

| Variável                         | Observação                                                                |
| -------------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`                   | String do **pooler** do Supabase (runtime)                                |
| `DATABASE_DIRECT_URL` _(nova)_   | Conexão direta, **só migrations**                                         |
| `DB_CONNECTION=pg`               | Forçar Postgres em produção                                               |
| `APP_KEY`                        | **Copiar a mesma da V1**; se mudar, tokens/sessões atuais são invalidados |
| `CORS_ORIGIN`, `APP_URL`         | Atualizar para os domínios novos                                          |
| `RATE_LIMIT_*` / URL do store    | Novo store compartilhado                                                  |
| `RESEND_*`, `SIGNUP_INVITE_CODE` | Mantidas                                                                  |

Segredos ficam em _Environment Variables_ da Vercel, **separados por ambiente** (Production / Preview).

### 12.6 Cutover (troca de produção) com mínimo de risco

**Preparação (dias antes)**

1. Spike aprovado e staging estável.
2. Ensaiar a migração de dados **pelo menos duas vezes** em staging: `pg_dump` do Render → `pg_restore` no Supabase → comparar contagens por tabela (`users`, `students`, `plans`, `lessons`, `plan_types`, `plan_discounts`, `auth_access_tokens`) e somas (`SUM(price)`).
3. Reduzir o TTL do DNS (se houver domínio próprio) e definir janela de baixo uso.
4. Definir critério de rollback (ex.: erro 5xx > X% por 10 min).

**Dia do cutover**

1. Aviso aos usuários (janela curta de manutenção).
2. Colocar a V1 em **somente leitura/manutenção** (impede escrita durante a cópia).
3. Backup final do Render (guardar).
4. `pg_dump` → `pg_restore` no Supabase de produção; rodar migrations pendentes.
5. Validar contagens e somas; testar login com conta real de teste.
6. Apontar o frontend (`VITE_API_URL`) e domínio para a API na Vercel.
7. Smoke test completo (login, listar, criar aula, gerar PDF, exportar CSV).
8. Monitorar logs/erros por 24–48h.

**Rollback:** reapontar `VITE_API_URL`/DNS para a API do Render (que continua intacta e com o banco antigo). Escritas feitas **depois** do cutover precisam ser reconciliadas manualmente, por isso a janela de manutenção e o rollback rápido nas primeiras horas.

**Descomissionamento:** só desligar Render/Postgres antigo após **2–4 semanas** estáveis e com backup final arquivado. Atenção: o Postgres gratuito do Render expira — confirme a data para não perder dados antes do cutover.

### 12.7 Checklist adicional desta mudança

- [ ] Spike Vercel + Supabase aprovado (12.2) ou ADR com alternativa
- [ ] Projeto Supabase de staging e de produção criados, região definida
- [ ] Pooler configurado; migrations usando conexão direta
- [ ] RLS ativado / Data API desativada ou restrita
- [ ] Rate limit em store compartilhado (não em memória)
- [ ] Nenhuma escrita em disco local; backup SQLite/e-mail desativado em prod
- [ ] PDF e exportação testados dentro dos limites de tempo/memória
- [ ] `APP_KEY` preservada; `CORS_ORIGIN`/`APP_URL` atualizados
- [ ] Ensaio de migração de dados feito 2× com contagens conferidas
- [ ] Plano de backup do Supabase definido e restauração testada
- [ ] Rollback para o Render documentado e testado
- [ ] Custos estimados (Vercel + Supabase) e limites dos planos conferidos

---

## 13. Decisões registradas e restrições dos planos gratuitos

**Decisões:** backend + frontend na Vercel; **Supabase usado só como Postgres** (sem Supabase Auth/Storage); todos os serviços em plano gratuito.

> [!WARNING]
> **Vercel Hobby é só para uso pessoal e não comercial.** Se o Music Class for usado por professores como serviço (principalmente se houver cobrança, direta ou indireta), isso viola os termos do plano Hobby e a conta pode ser suspensa. Se o projeto é comercial, o plano Vercel Pro é necessário. Confirme os termos atuais antes do cutover.

| Restrição (plano gratuito)                                           | Consequência                                                                           | Mitigação                                                                                                                                        |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Supabase pausa o projeto após ~7 dias sem consultas ao banco**     | Primeira requisição após a pausa falha/demora; pode ser retomado manualmente no painel | Job agendado que faça `SELECT 1` periodicamente (ex.: GitHub Actions cron ou Vercel Cron chamando `/health`)                                     |
| **Supabase Free não tem backup automático nem PITR**                 | Sem rede de segurança para os dados                                                    | `pg_dump` agendado (GitHub Actions) para armazenamento externo gratuito, com restauração testada. **Isso passa a ser obrigatório, não opcional** |
| Vercel Hobby: limite de duração por função (configurável, até 300 s) | PDFs/exportações lentos podem estourar                                                 | Medir no spike; manter geração de PDF enxuta                                                                                                     |
| Cold start em funções                                                | Primeira requisição mais lenta                                                         | Medir p95; aceitar ou otimizar boot do Adonis                                                                                                    |
| Limites de conexões do Supabase Free                                 | Esgotamento com várias instâncias                                                      | Pooler + pool `max` 1–2                                                                                                                          |
| Sem SLA em nenhum dos planos                                         | Indisponibilidades sem suporte                                                         | Uptime monitor gratuito + backup externo                                                                                                         |

**Serviços gratuitos complementares sugeridos** _(conferir limites atuais de cada um)_:

- Rate limit compartilhado: Upstash Redis (free) ou tabela no próprio Supabase.
- CI e agendamentos (keep-alive, `pg_dump`): GitHub Actions.
- Monitoramento: UptimeRobot/Better Stack e Sentry (free).
- Armazenar dumps: Backblaze B2 / Cloudflare R2 (camadas gratuitas) ou repositório privado cifrado.

**Gatilhos para sair do plano gratuito:** primeiros clientes pagantes, dados que não podem ser perdidos (→ Supabase Pro com backups), ou necessidade de uso comercial (→ Vercel Pro).
