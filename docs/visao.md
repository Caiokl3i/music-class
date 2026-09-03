# Music Class — visão e ideias

Documento para enxergar o sistema inteiro: o que já existe, o que vale fazer agora, e o que é só horizonte. Não é backlog engessado. Serve para ampliar ideias sem misturar “quero um dia” com “preciso na próxima aula”.

Como ler:

| Eixo | Significa |
|------|-----------|
| **Status** | **Feito** (no produto), **Parcial** (existe o pedaço útil, falta o resto), **Não** (ainda não existe) |
| **Facilidade** | Fácil (horas), médio (alguns dias), difícil (muda modelo, integração ou produto inteiro) |
| **Momento** | **Agora** (muda o dia a dia), **depois** (quando o núcleo estiver estável), **adicional** (amplia o produto; dá para viver sem) |

Regra prática: se a professora usa o sistema toda terça, o item tem que reduzir clique, erro ou esquecimento. O resto espera.

O status abaixo reflete o código atual (API + UI), não a intenção da ideia.

---

## O que o sistema já faz

Ciclo fechado: **aluno → pacote → aula**. Só a aula concluída conta no pacote. Pagamento é organização, não trava a agenda.

- Isolamento por professor (`user_id`).
- Catálogo fixo: avulsa, pack 4, pack 8 (preço no servidor).
- Crédito em pacote **pago ou pendente**. Cancelar aula devolve; falta consome. Vários pendentes no mesmo aluno.
- Conflito de horário (início + fim, 1h padrão; encostadas passam).
- Validade de 60 dias a partir do pagamento; gerar as aulas da semana de uma vez.
- Aviso de crédito 0–1 e receita do mês no painel.
- Pacotes pendentes, validade acabando e vencidos destacados no painel.
- Ficha do aluno como hub (agendar, concluir, falta, pacote, gerar aulas, editar).
- Painel com hoje, atrasadas, próximas e atividade recente.
- Perfil (nome, senha), token com validade, testes de API no domínio.
- Tema claro / escuro.
- Signup por convite (`SIGNUP_INVITE_CODE`).
- Backup do SQLite em `backups/` (`npm run db:backup`).
- Horário usual por aluno (dia + hora) no agendar e no gerar aulas.
- Duração da aula com início e fim (1h padrão) no agendar e no conflito.
- CSV do mês (aulas + pacotes) no painel.

Ainda deliberadamente **fora** (e isso continua fazendo sentido): tabela de pagamentos, tipos de plano editáveis, vários papéis, portal do aluno, comissões.

---

## Fazer agora

Os itens de agenda e pacote da lista “Agora” já estão no produto (conflito, duração 1h, aviso de crédito, gerar aulas, validade, receita do mês, pendentes no painel). Próximo recorte útil, ainda barato:

1. **Signup só por convite** — `SIGNUP_INVITE_CODE` no ambiente; sem código o cadastro fecha. **Feito**
2. **Backup do SQLite** — `npm run db:backup` copia para `backups/`, fora de `tmp/`. **Feito**
3. **Horário padrão por aluno** — dia da semana + hora na ficha; agendar e gerar aulas já nascem preenchidos. **Feito**

---

## Matriz

### Agenda e aulas

| Ideia | Status | Facilidade | Momento | Por quê |
|-------|--------|------------|---------|---------|
| Bloquear (ou avisar) duas aulas no mesmo horário | **Feito** | Fácil | Agora | Professor não se clona |
| Duração da aula (início + fim, 1h padrão) | **Feito** | Fácil | Agora | Agendar escolhe o fim; conflito usa a janela real |
| Aviso de créditos 0–1 | **Feito** | Fácil | Agora | Pacote acaba e ninguém vende o próximo |
| Gerar N aulas a partir de um dia da semana | **Feito** | Médio | Agora | Pacote mensal hoje é N cliques |
| Horário padrão por aluno (“sempre 14h”) | **Feito** | Fácil | Depois | Acelera o agendar |
| Vista semanal além do mês | **Não** | Médio | Depois | O mês é overview; a semana é o trabalho |
| Arrastar aula no calendário para remarcar | **Não** | Difícil | Adicional | Conforto; remarcar no modal já resolve |
| Bloquear agenda (viagem, feriado) | **Não** | Médio | Depois | Evita marcar em cima da folga |
| Aula atrasada (chegou tarde) vs falta | **Não** | Fácil | Adicional | Política fina; falta já existe |
| Reposição explícita (remarcar sem gastar crédito extra) | **Não** | Médio | Depois | Cancelar já devolve; reposição é o nome disso |
| Sincronizar Google Calendar / feed iCal | **Não** | Difícil | Adicional | Integração e OAuth |
| Cor por aluno no calendário | **Não** | Fácil | Adicional | Leitura visual |

### Pacotes e créditos

| Ideia | Status | Facilidade | Momento | Por quê |
|-------|--------|------------|---------|---------|
| Validade dos créditos (expiram em X dias) | **Feito** | Médio | Agora | Pacote “mensal” sem prazo vira dívida eterna |
| Congelar pacote (férias do aluno) | **Não** | Médio | Depois | Pausa o prazo sem cancelar |
| Preço avulso / desconto na hora da venda | **Não** | Médio | Depois | Hoje o catálogo é rígido; a vida não é |
| Histórico de preço (o que foi cobrado na época) | **Parcial** | Médio | Depois | O `price` fica gravado no pacote; o catálogo não tem versão |
| Aula experimental (0 crédito ou pacote trial) | **Não** | Fácil | Depois | Porta de entrada comum |
| Editar catálogo pela tela (`plan_types`) | **Não** | Médio | Adicional | Só quando 3 pacotes não bastarem |
| Pacote presente / saldo pré-pago avulso | **Não** | Difícil | Adicional | Outro produto |

### Aluno e pedagogia

| Ideia | Status | Facilidade | Momento | Por quê |
|-------|--------|------------|---------|---------|
| Idade visível a partir do nascimento | **Não** | Fácil | Depois | Já tem a data; não mostra a idade |
| Aniversário no painel | **Não** | Fácil | Depois | Relacionamento barato |
| Nível (iniciante / intermediário) ou tags | **Não** | Fácil | Depois | Filtro e contexto na ficha |
| Dois instrumentos no mesmo aluno | **Não** | Médio | Depois | Hoje é um campo só |
| Contato do responsável (aluno menor) | **Não** | Fácil | Depois | Telefone hoje é “do aluno” |
| Repertório / músicas em andamento | **Não** | Médio | Depois | A anotação da aula vira histórico solto |
| Tarefa da semana (o que treinar) | **Não** | Fácil | Depois | Cabe na aula; vira campo “próxima prática” |
| Material (PDF, link de cifra) na ficha | **Não** | Médio | Adicional | Arquivo e storage |
| Local da aula (estúdio, casa, online) + link | **Não** | Fácil | Depois | Um select + URL |
| Metas (vestibular, recital, lazer) | **Não** | Fácil | Adicional | Texto estruturado |
| Datas de prova / apresentação na ficha | **Não** | Fácil | Depois | Não esquecer o evento |
| Importar alunos de planilha | **Não** | Médio | Adicional | Útil na migração; uma vez só |
| Busca global (nome, instrumento, nota) | **Parcial** | Médio | Depois | Lista de alunos filtra nome, instrumento e telefone; não busca aula/nota |

### Dinheiro

| Ideia | Status | Facilidade | Momento | Por quê |
|-------|--------|------------|---------|---------|
| Receita do mês vs acumulada | **Parcial** | Fácil | Agora | Mês no painel; acumulado existe na API, não na tela |
| Destacar pacotes pendentes (a receber) | **Feito** | Fácil | Agora | Já tem o número; falta o hábito na UI |
| Forma de pagamento no pacote (PIX, dinheiro) | **Não** | Fácil | Depois | Cabe em `notes` hoje; um enum ajuda relatório |
| Recibo / PDF simples | **Não** | Médio | Depois | Pedido clássico de responsável |
| Export CSV do mês (aulas + pacotes) | **Feito** | Fácil | Depois | Substitui o caderno no Imposto / controle |
| Tabela `payments` (várias parcelas) | **Não** | Difícil | Adicional | Modelo novo; v1 não precisa |
| Reajuste de catálogo com inflação | **Não** | Médio | Adicional | Junto com `plan_types` |
| Comissões / estúdio compartilhado | **Não** | Difícil | Adicional | Outro negócio |

### Comunicação

| Ideia | Status | Facilidade | Momento | Por quê |
|-------|--------|------------|---------|---------|
| Botão WhatsApp com o telefone que já existe | **Não** | Fácil | Depois | Zero modelo; um `wa.me` |
| Lembrete D-1 (amanhã tem aula) | **Não** | Difícil | Adicional | Precisa de job, template e opt-in |
| Confirmar presença por mensagem | **Não** | Difícil | Adicional | Dois lados (professor + aluno/família) |
| Avisar “pacote acabando” por WhatsApp | **Não** | Difícil | Adicional | Primeiro o aviso **dentro** do app |

### Conta, confiança, operação

| Ideia | Status | Facilidade | Momento | Por quê |
|-------|--------|------------|---------|---------|
| Signup só por convite (fechar cadastro aberto) | **Feito** | Fácil | Agora | Qualquer um cria conta na API hoje |
| Rate limit em login / signup | **Não** | Fácil | Depois | Abuso óbvio |
| Esqueci a senha | **Não** | Médio | Depois | E-mail + token; hoje só troca logado |
| Lembrar sessão (não cair ao fechar a aba) | **Não** | Fácil | Depois | `sessionStorage` some com a aba |
| Backup do SQLite (copiar `tmp/`) | **Feito** | Fácil | Agora | Um arquivo; perder é irreversível |
| Paginação nas listas | **Não** | Médio | Depois | Vai doer com um ano de aulas |
| Testes do frontend | **Não** | Médio | Depois | API está coberta; UI não |
| CI (testes no push) | **Não** | Fácil | Depois | Evita regressão |
| Postgres em produção | **Não** | Médio | Depois | SQLite em `tmp/` não é destino |
| Monitorar erro (Sentry ou log) | **Não** | Médio | Adicional | Quando tiver usuário de verdade |
| 2FA | **Não** | Difícil | Adicional | Overkill para um professor |
| LGPD: exportar / apagar dados do aluno | **Não** | Médio | Adicional | Quando sair do uso pessoal |

### Produto maior (outro sistema, não “mais um campo”)

| Ideia | Status | Facilidade | Momento | Por quê |
|-------|--------|------------|---------|---------|
| Portal do aluno / responsável (ver próxima aula) | **Não** | Difícil | Adicional | Auth, permissão, UX nova |
| Turma / aula em grupo | **Não** | Difícil | Adicional | Quebra 1 aluno ↔ 1 crédito |
| Vários professores no mesmo estúdio | **Não** | Difícil | Adicional | Papéis; `user_id` só isola donos |
| PWA / app no celular | **Não** | Médio | Adicional | A UI já é usável no telefone |
| Gravação da aula / biblioteca de partitura | **Não** | Difícil | Adicional | Storage, direito autoral, UX pesada |

---

## Ideias para ampliar (ainda soltas)

Não estão na matriz de “fazer agora”, mas valem anotar para não esquecer:

- **Onboarding de 3 passos** na primeira conta: cadastrar aluno → vender pack 4 → gerar as 4 terças. **Não**
- **Atalho de teclado** na ficha: C conclui, F falta (o dia a dia é repetitivo). **Não**
- **Imprimir / PDF da semana** para deixar no estúdio. **Não**
- **Aula extra avulsa no meio do pacote** — **Parcial**: já dá criar um `single`; falta o botão “+ avulsa”.
- **Política de falta configurável** — hoje falta consome; alguns professores reposição na primeira falta. **Não**
- **Fila de espera** num horário disputado (sábado 10h). **Não**
- **Professor substituto** num dia (outro `user` dá a aula, crédito continua do dono) — só se um dia houver estúdio. **Não**
- **Tema escuro** — **Feito** (claro / escuro no layout).
- **Comando rápido (Ctrl+K)** — “Ana, agendar terça”. **Não**
- **Linha do tempo na ficha** — pacotes e aulas misturados por data, em vez de dois cards. **Não**
- **Seed / conta demo** — para testar o painel sem cadastro manual. **Não**
- **Desfazer** os 10 segundos depois de “Concluir” (toque errado no celular). **Não**

---

## O que não misturar agora

Estas ideias são boas e **atrasam** o núcleo se entram cedo:

- Pagamentos em tabela separada, recorrência de cobrança, PIX automático.
- Google Calendar, WhatsApp em massa, e-mail transacional.
- Portal do aluno, grupos, multi-professor.
- Catálogo editável antes de precisar do 4º pacote.

O modelo em `docs/modelo.md` já marca isso como fora da v1. Continua válido.

---

## Três ciclos (sugestão)

**Ciclo A — não se enrolar na agenda**  
Conflito de horário + duração 1h + aviso de crédito + receita do mês + backup do banco + signup fechado (convite ou desligar registro público).

- **Feito:** conflito, duração com início e fim (1h padrão), aviso de crédito, receita do mês, pendentes no painel, backup do SQLite, signup só por convite.

**Ciclo B — o pacote mensal de verdade**  
Gerar aulas da semana + validade dos créditos + horário padrão do aluno + CSV do mês.

- **Feito:** gerar aulas da semana, validade dos créditos, horário padrão do aluno, CSV do mês.

**Ciclo C — carinho e operação**  
WhatsApp na ficha, aniversário, responsável, recibo, paginação, “esqueci senha”, CI.

- **Não** (nada deste ciclo entrou ainda). Tema escuro saiu à frente, fora da lista.

Depois disso, só abrir ideia **adicional** se uma dor concreta aparecer (ex.: “preciso de 5 tipos de pacote” → `plan_types`).
