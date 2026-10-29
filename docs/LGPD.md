# Diretrizes de Privacidade e Conformidade LGPD

Este documento formaliza as políticas de privacidade, governança e conformidade com a **Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD)** implementadas no **Music Class**.

---

## 1. Princípios e Bases Legais

O Music Class trata dados de professores (usuários titulares da conta) e alunos estritamente para viabilizar a prestação de serviços educacionais de música, gestão de agendamentos e faturamento.

As operações de tratamento baseiam-se nos seguintes artigos da LGPD:
1. **Execução de Contrato ou Procedimentos Preliminares (Art. 7º, V):**
   - Gestão de matrículas, agendamento de aulas, emissão de faturas/recibos e histórico pedagógico.
2. **Legítimo Interesse do Controlador (Art. 7º, IX):**
   - Métricas de frequência, lembretes de aula e relatórios gerenciais operacionais.
3. **Cumprimento de Obrigação Legal ou Regulatória (Art. 7º, II):**
   - Retenção de registros fiscais e contábeis de planos e faturas (conforme Código Civil e legislação tributária).

---

## 2. Inventário de Dados Pessoais

| Categoria | Dados Coletados | Finalidade | Tempo de Retenção |
| :--- | :--- | :--- | :--- |
| **Professor (Usuário)** | Nome completo, e-mail, telefone, estúdio, cidade, senha (hash Argon2/Scrypt) | Autenticação, controle de acesso e comunicação com a plataforma | Durante a vigência da conta + 5 anos para obrigações legais |
| **Aluno** | Nome, telefone, data de nascimento, instrumento, nível musical, dia/horário preferido, notas pedagógicas | Gestão da agenda de aulas, plano contratado e acompanhamento pedagógico | Durante a vigência da matrícula ou até solicitação de anonimização |
| **Financeiro / Aulas** | Valor de planos, descontos, datas de pagamento, data e status das aulas | Cumprimento de obrigações contratuais e fiscais | 5 anos após encerramento do contrato |

---

## 3. Direitos dos Titulares (Art. 18)

Os alunos ou responsáveis legais possuem os seguintes direitos:
1. **Confirmação e Acesso (Art. 18, I e II):** Obter confirmação e acesso aos dados pessoais mantidos na plataforma.
2. **Correção (Art. 18, III):** Solicitar correção de dados incompletos, inexatos ou desatualizados via interface do professor.
3. **Portabilidade dos Dados (Art. 18, V):** Obter dossiê integral e interoperável em formato JSON de todo o seu histórico.
4. **Anonimização / Eliminação (Art. 18, IV e VI):** Solicitar a desidentificação de dados desnecessários ou excessivos após o término do vínculo.

---

## 4. Procedimentos Operacionais do Operador/DPO

O Music Class disponibiliza utilitários CLI integrados para garantir o atendimento ágil às requisições de titulares em menos de 15 dias (Art. 19, II).

### 4.1 Exportação para Portabilidade (Art. 18, V)

Para gerar o dossiê eletrônico completo de um aluno em formato JSON legível por máquina:

```bash
# Saída no terminal (stdout)
node ace lgpd:student 42

# Ou via npm script
npm run lgpd:export -- 42

# Exportar diretamente para arquivo
node ace lgpd:student 42 --output=./dossie_aluno_42.json
```

O arquivo gerado inclui:
- Metadados de emissão e base jurídica.
- Cadastro do aluno (nome, telefone, nível, tags, preferências de horário).
- Histórico de todos os planos contratados (valores, datas de pagamento, validade).
- Histórico completo de aulas agendadas, executadas ou canceladas.

### 4.2 Anonimização e Direito ao Esquecimento (Art. 18, VI)

Quando um aluno encerra o vínculo e solicita exclusão dos seus dados, a exclusão física bruta não deve violar a integridade financeira e contábil do professor (relatórios de receita e aulas executadas no passado).

A plataforma aplica **anonimização irreversível** dos dados pessoais identificáveis, preservando os registros agregados e transacionais:

```bash
node ace lgpd:student 42 --anonymize
```

**Efeitos da anonimização:**
- O nome do aluno é substituído por `Aluno Anonimizado #42`.
- Telefone, data de nascimento, tags e observações pedagógicas são limpos (`NULL`).
- O instrumento é marcado como `Anonimizado`.
- Observações e descrições detalhadas de aulas anteriores são desidentificadas.
- Valores faturados e datas de aulas permanecem íntegros para auditoria contábil.

---

## 5. Medidas de Segurança Técnica e Organizacional

1. **Criptografia em Trânsito:** Todo tráfego HTTP é protegido via TLS 1.3 (HTTPS).
2. **Criptografia de Senhas:** Hashes irreversíveis para credenciais de acesso.
3. **Segurança de Acesso:** Proteção contra força bruta com Rate Limiter distribuído (`app/services/rate_limit.ts`).
4. **Isolamento Multitenant:** Cada professor visualiza e opera exclusivamente sobre seus próprios alunos e planos (`userId` em todas as consultas ORM).
5. **Backups Seguros:** Dumps do banco de dados são cifrados em trânsito e armazenados em bucket S3/R2 com retenção estrita de 14 dias (`scripts/backup_postgres.sh`).
