# ADR 0001: Estratégia de Autenticação e Armazenamento de Tokens (A-06)

- **Status:** Aceito
- **Data:** 2026-10-28
- **Contexto:** Auditoria da V1 (item `A-06`) e Plano de Transição V1 → V2

---

## 1. Contexto

A V1 do Music Class utiliza autenticação baseada em **Access Tokens** (`@adonisjs/auth/access_tokens`), onde:

- O cliente frontend envia credenciais para `/api/v1/auth/login` ou `/api/v1/auth/signup`.
- O servidor gera um token com validade de 7 dias e o retorna no corpo da resposta JSON.
- O frontend armazena esse token no storage do navegador (`localStorage`) e o envia a cada requisição HTTP através do cabeçalho `Authorization: Bearer <token>`.

O achado de auditoria **A-06** apontou que tokens armazenados em storage do navegador são acessíveis via JavaScript e, portanto, suscetíveis a exfiltração caso ocorra uma vulnerabilidade de Cross-Site Scripting (XSS). A alternativa mais robusta contra XSS é o uso de cookies com as flags `HttpOnly`, `Secure` e `SameSite=Lax/Strict`.

---

## 2. Decisão

**Decidimos MANTER o modelo atual (`Authorization: Bearer` via storage) durante todo o processo de transição da V1 para a V2**, adiando a migração para cookies `HttpOnly` para a **Fase 8 (Desenvolvimento Livre)**.

---

## 3. Justificativa

1. **Princípio da Não-Regressão e Estabilidade:** O princípio central do [V2_PLANO_DE_TRANSICAO.md](../V2_PLANO_DE_TRANSICAO.md) é: _"a V1 é intocável; mudanças de infra não devem ser misturadas com mudanças de produto/contrato"_.
2. **Preservação do Contrato `/api/v1`:** O frontend atual e eventuais integrações consomem a API esperando o formato Bearer token. Alterar para cookies agora exigiria reescrever o cliente HTTP do frontend, o tratamento de CORS com credentials (`Access-Control-Allow-Credentials: true`), domínios de cookies entre Vercel e subdomínios, e a camada de middleware do AdonisJS simultaneamente à migração de servidor.
3. **Simplicidade em Serverless:** Bearer tokens são completamente stateless do ponto de vista de sessão HTTP do servidor (a validação consulta apenas a tabela `auth_access_tokens` no banco), o que se adapta perfeitamente ao ciclo de vida efêmero das funções serverless na Vercel.

---

## 4. Mitigações Ativas (Rede de Proteção)

Para compensar o risco residual de XSS enquanto o token permanecer no storage:

1. **Expiração curta:** Tokens expiram automaticamente em **7 dias**.
2. **Revogação ativa:** Ao trocar de senha, a API revoga imediatamente todos os outros tokens ativos do usuário (`revokeOtherAccessTokens`).
3. **Cabeçalhos de Segurança (Shield):**
   - `Strict-Transport-Security` (HSTS): ativo com `180 days`.
   - `X-Frame-Options`: configurado para `DENY` (impede clickjacking).
   - `X-Content-Type-Options`: configurado para `nosniff`.
4. **Higienização de Entradas:** Todas as entradas de dados são estritamente validadas via **VineJS** antes de chegarem ao banco ou serem renderizadas.
5. **Multi-tenancy Rígido:** Todas as operações do sistema são vinculadas ao `user_id` autenticado via `user.related(...)`, impedindo que mesmo um token comprometido acesse dados de outro professor (sem risco de IDOR).

---

## 5. Roteiro Futuro (Fase 8)

Na Fase 8, após a conclusão do cutover de produção da V2:

- Implementar suporte a cookies de sessão `HttpOnly` em novas rotas `/api/v2`.
- Manter suporte ao Bearer token para chamadas que exijam autenticação programática ou mobile.
