# Relatório de Restauração de Backup V1 (Tarefa 0.4)

Data do teste: 2026-10-26 23:37  
Status da validação: ✅ **100% APROVADO COM PARIDADE TOTAL**

---

## 1. Dados do Dump e Origem

- **Banco de produção (origem):** Neon Serverless PostgreSQL (versão 18.6).
- **Arquivo de backup:** `backups/v1_backup.dump`
- **Tamanho do arquivo:** 32 KB
- **Formato:** PostgreSQL Custom (`-Fc`, comprimido)
- **Comando de geração:**
  ```bash
  /usr/lib/postgresql/18/bin/pg_dump "$DATABASE_URL" -Fc --no-owner --no-acl -f backups/v1_backup.dump
  ```

---

## 2. Processo de Restauração de Teste

- **Ambiente de teste:** Banco de dados isolado em container Docker temporário rodando PostgreSQL 18.6 limpo (`v1_test`).
- **Comando de restauração executado:**
  ```bash
  pg_restore -h 127.0.0.1 -p 54329 -U postgres -d v1_test --no-owner --no-acl backups/v1_backup.dump
  ```
- **Resultado do `pg_restore`:** Código de saída 0 (sem erros, sem avisos de integridade).

---

## 3. Comparação de Registros (Neon vs Banco Restaurado)

| Tabela | Origem (Neon) | Restaurado (Teste) | Status |
|---|---|---|---|
| `users` | 1 | 1 | ✅ Idêntico |
| `students` | 2 | 2 | ✅ Idêntico |
| `plans` | 5 | 5 | ✅ Idêntico |
| `lessons` | 22 | 22 | ✅ Idêntico |
| `plan_types` | 3 | 3 | ✅ Idêntico |
| `plan_discounts` | 2 | 2 | ✅ Idêntico |
| `auth_access_tokens` | 23 | 23 | ✅ Idêntico |
| `adonis_schema` | 18 | 18 | ✅ Idêntico |

---

## 4. Integridade Financeira e de Negócio

- **Soma dos valores dos planos (`SUM(price)` em `plans`):**
  - Neon (Produção): **R$ 650,00**
  - Banco Restaurado: **R$ 650,00**
  - Status: ✅ **Exatamente igual**

---

## 5. Conclusão da Tarefa 0.4

O arquivo `backups/v1_backup.dump` é um **backup íntegro, funcional e testado**.
Em caso de necessidade de rollback ou para a migração futura para o Supabase (Fase 6 do roadmap), este arquivo garante a recuperação completa do estado atual da V1.
