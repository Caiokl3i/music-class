# ADR 0002: Decisão de Plano e Modelo de Hospedagem (Gate A)

- **Status:** Aceito
- **Data:** 2026-10-28
- **Contexto:** Gate A do [V2_ROADMAP.md](../V2_ROADMAP.md) e Seção 13 do [V2_PLANO_DE_TRANSICAO.md](../V2_PLANO_DE_TRANSICAO.md)

---

## 1. Contexto e Problema

O Music Class é um sistema de gestão de estúdio de aulas de música com controle financeiro, controle de créditos de pacotes e geração de cobranças para professores.

Na transição para a infraestrutura V2 (Vercel + Supabase), é necessário analisar os termos de serviço e as limitações técnicas dos planos gratuitos (*free tiers*):

1. **Termos da Vercel (Hobby vs Pro):**
   - O plano **Vercel Hobby** é restrito a projetos pessoais e não-comerciais.
   - O uso por professores para controle de aulas remuneradas e cobrança pode ser caracterizado como atividade comercial, violando os termos de serviço da camada gratuita da Vercel.
2. **Limitações Técnicas do Supabase Free:**
   - **Pausa por Inatividade:** Projetos no plano gratuito são pausados automaticamente após ~7 dias sem requisições ao banco. A primeira query após a pausa falha ou sofre latência severa.
   - **Backups:** O plano gratuito do Supabase não inclui backups automáticos diários nem Point-in-Time Recovery (PITR).
3. **Limites de Execução da Vercel (Serverless):**
   - Funções serverless na camada gratuita possuem limite de tempo de execução (timeout padrão de 10 segundos, configurável até no máximo 300 segundos com limites de concorrência e memória).

---

## 2. Decisão

1. **Fase de Desenvolvimento e Staging:**
   - O ambiente de **Staging** utilizará a camada gratuita da Vercel (deploy de preview ligado à branch `develop`) e o plano gratuito do Supabase (`music-class-staging`), com isolamento total de dados e dados anonimizados.
2. **Produção (Gate A):**
   - **Cenário Inicial (Transição/Testes com professores conhecidos):** Será mantido em camada gratuita sob monitoramento, com mitigação das limitações técnicas.
   - **Cenário de Produção Comercial:** Caso haja cobrança pela plataforma ou volume de professores pagantes, a migração para o **Vercel Pro** ou para a **Arquitetura Híbrida (Frontend Vercel + API em container persistente Render/Fly + Supabase)** será obrigatória.

---

## 3. Mitigações Obrigatórias para a Camada Gratuita

Para operar a V2 de forma segura em planos gratuitos, foram estabelecidas as seguintes salvaguardas:

| Limitação | Consequência | Mitigação Implementada |
|---|---|---|
| **Pausa de 7 dias do Supabase** | Banco inacessível após período sem aulas | Job de keep-alive diário (GitHub Actions chamando `/health`) |
| **Falta de Backup no Supabase Free** | Risco de perda irreversível de dados de alunos/planos | Script automatizado de `pg_dump` agendado para storage externo gratuito (R2/B2/GitHub) com teste de restauração |
| **Timeout de funções serverless** | Geração de PDFs de mensalidade truncada | Otimização do PDFKit mantendo buffers enxutos em memória |
| **Rate Limit em memória efêmera** | Ineficácia do limitador de força bruta em serverless | Migração para store externo compartilhado (Upstash Redis ou Supabase) na Fase 4 |

---

## 4. Consequências

- O ambiente de Staging pode ser criado com custo zero imediatamente.
- A decisão final sobre o runtime de produção da API (serverless puro vs container persistente) é delegada aos resultados práticos do **Spike da Fase 3 (Gate B)**.
