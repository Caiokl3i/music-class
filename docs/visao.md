# Music Class — visão e ideias

Documento para enxergar o sistema inteiro: o que já existe, o que vale fazer agora, e o que é só horizonte. Não é backlog engessado. Serve para ampliar ideias sem misturar “quero um dia” com “preciso na próxima aula”.

Como ler:

| Eixo | Significa |
|------|-----------|
| **Facilidade** | Fácil (horas), médio (alguns dias), difícil (muda modelo, integração ou produto inteiro) |
| **Momento** | **Agora** (muda o dia a dia), **depois** (quando o núcleo estiver estável), **adicional** (amplia o produto; dá para viver sem) |

Regra prática: se a professora usa o sistema toda terça, o item tem que reduzir clique, erro ou esquecimento. O resto espera.

---

## O que o sistema já faz

Ciclo fechado: **aluno → pacote pago → aula que gasta 1 crédito**.

- Isolamento por professor (`user_id`).
- Catálogo fixo: avulsa, pack 4, pack 8 (preço no servidor).
- Crédito só em pacote **pago**. Cancelar aula devolve; falta consome.
- Conflito de horário (aula de 1h; encostadas passam).
- Validade de 60 dias a partir do pagamento; gerar as aulas da semana de uma vez.
- Aviso de crédito 0–1 e receita do mês no painel.
- Ficha do aluno como hub (agendar, concluir, falta, pacote, gerar aulas, editar).
- Painel com hoje, atrasadas, próximas e atividade recente.
- Perfil (nome, senha), token com validade, testes de API no domínio.

Ainda deliberadamente **fora** (e isso continua fazendo sentido): tabela de pagamentos, tipos de plano editáveis, vários papéis, portal do aluno, comissões.

---

## Fazer agora

Os cinco itens desta lista já estão no produto. Próximo recorte útil, ainda barato:

1. **Signup só por convite** — qualquer um cria conta na API hoje.
2. **Backup do SQLite** — copiar `tmp/`; perder o arquivo é irreversível.
3. **Horário padrão por aluno** — “sempre terça 14h” acelera o agendar avulso.

---

## Matriz

### Agenda e aulas

| Ideia | Facilidade | Momento | Por quê |
|-------|------------|---------|---------|
| Bloquear (ou avisar) duas aulas no mesmo horário | Fácil | Agora | Professor não se clona |
| Duração da aula (início + fim, 1h padrão) | Fácil | Agora | Conflito precisa de intervalo, não só do relógio |
| Aviso de créditos 0–1 | Fácil | Agora | Pacote acaba e ninguém vende o próximo |
| Gerar N aulas a partir de um dia da semana | Médio | Agora | Pacote mensal hoje é N cliques |
| Horário padrão por aluno (“sempre 14h”) | Fácil | Depois | Acelera o agendar |
| Vista semanal além do mês | Médio | Depois | O mês é overview; a semana é o trabalho |
| Arrastar aula no calendário para remarcar | Difícil | Adicional | Conforto; remarcar no modal já resolve |
| Bloquear agenda (viagem, feriado) | Médio | Depois | Evita marcar em cima da folga |
| Aula atrasada (chegou tarde) vs falta | Fácil | Adicional | Política fina; falta já existe |
| Reposição explícita (remarcar sem gastar crédito extra) | Médio | Depois | Cancelar já devolve; reposição é o nome disso |
| Sincronizar Google Calendar / feed iCal | Difícil | Adicional | Integração e OAuth |
| Cor por aluno no calendário | Fácil | Adicional | Leitura visual |

### Pacotes e créditos

| Ideia | Facilidade | Momento | Por quê |
|-------|------------|---------|---------|
| Validade dos créditos (expiram em X dias) | Médio | Agora | Pacote “mensal” sem prazo vira dívida eterna |
| Congelar pacote (férias do aluno) | Médio | Depois | Pausa o prazo sem cancelar |
| Preço avulso / desconto na hora da venda | Médio | Depois | Hoje o catálogo é rígido; a vida não é |
| Histórico de preço (o que foi cobrado na época) | Médio | Depois | Quando o catálogo mudar, o plano antigo não mente |
| Aula experimental (0 crédito ou pacote trial) | Fácil | Depois | Porta de entrada comum |
| Editar catálogo pela tela (`plan_types`) | Médio | Adicional | Só quando 3 pacotes não bastarem |
| Pacote presente / saldo pré-pago avulso | Difícil | Adicional | Outro produto |

### Aluno e pedagogia

| Ideia | Facilidade | Momento | Por quê |
|-------|------------|---------|---------|
| Idade visível a partir do nascimento | Fácil | Depois | Já tem a data; não mostra |
| Aniversário no painel | Fácil | Depois | Relacionamento barato |
| Nível (iniciante / intermediário) ou tags | Fácil | Depois | Filtro e contexto na ficha |
| Dois instrumentos no mesmo aluno | Médio | Depois | Hoje é um campo só |
| Contato do responsável (aluno menor) | Fácil | Depois | Telefone hoje é “do aluno” |
| Repertório / músicas em andamento | Médio | Depois | A anotação da aula vira histórico solto |
| Tarefa da semana (o que treinar) | Fácil | Depois | Cabe na aula; vira campo “próxima prática” |
| Material (PDF, link de cifra) na ficha | Médio | Adicional | Arquivo e storage |
| Local da aula (estúdio, casa, online) + link | Fácil | Depois | Um select + URL |
| Metas (vestibular, recital, lazer) | Fácil | Adicional | Texto estruturado |
| Datas de prova / apresentação na ficha | Fácil | Depois | Não esquecer o evento |
| Importar alunos de planilha | Médio | Adicional | Útil na migração; uma vez só |
| Busca global (nome, instrumento, nota) | Médio | Depois | Quando passar de ~30 alunos |

### Dinheiro

| Ideia | Facilidade | Momento | Por quê |
|-------|------------|---------|---------|
| Receita do mês vs acumulada | Fácil | Agora | O card atual mente o recorte mental |
| Destacar pacotes pendentes (a receber) | Fácil | Agora | Já tem o número; falta o hábito na UI |
| Forma de pagamento no pacote (PIX, dinheiro) | Fácil | Depois | Cabe em `notes` hoje; um enum ajuda relatório |
| Recibo / PDF simples | Médio | Depois | Pedido clássico de responsável |
| Export CSV do mês (aulas + pacotes) | Fácil | Depois | Substitui o caderno no Imposto / controle |
| Tabela `payments` (várias parcelas) | Difícil | Adicional | Modelo novo; v1 não precisa |
| Reajuste de catálogo com inflação | Médio | Adicional | Junto com `plan_types` |
| Comissões / estúdio compartilhado | Difícil | Adicional | Outro negócio |

### Comunicação

| Ideia | Facilidade | Momento | Por quê |
|-------|------------|---------|---------|
| Botão WhatsApp com o telefone que já existe | Fácil | Depois | Zero modelo; um `wa.me` |
| Lembrete D-1 (amanhã tem aula) | Difícil | Adicional | Precisa de job, template e opt-in |
| Confirmar presença por mensagem | Difícil | Adicional | Dois lados (professor + aluno/família) |
| Avisar “pacote acabando” por WhatsApp | Difícil | Adicional | Primeiro o aviso **dentro** do app |

### Conta, confiança, operação

| Ideia | Facilidade | Momento | Por quê |
|-------|------------|---------|---------|
| Signup só por convite (fechar cadastro aberto) | Fácil | Agora | Qualquer um cria conta na API hoje |
| Rate limit em login / signup | Fácil | Depois | Abuso óbvio |
| Esqueci a senha | Médio | Depois | E-mail + token; hoje só troca logado |
| Lembrar sessão (não cair ao fechar a aba) | Fácil | Depois | `sessionStorage` some com a aba |
| Backup do SQLite (copiar `tmp/`) | Fácil | Agora | Um arquivo; perder é irreversível |
| Paginação nas listas | Médio | Depois | Vai doer com um ano de aulas |
| Testes do frontend | Médio | Depois | API está coberta; UI não |
| CI (testes no push) | Fácil | Depois | Evita regressão |
| Postgres em produção | Médio | Depois | SQLite em `tmp/` não é destino |
| Monitorar erro (Sentry ou log) | Médio | Adicional | Quando tiver usuário de verdade |
| 2FA | Difícil | Adicional | Overkill para um professor |
| LGPD: exportar / apagar dados do aluno | Médio | Adicional | Quando sair do uso pessoal |

### Produto maior (outro sistema, não “mais um campo”)

| Ideia | Facilidade | Momento | Por quê |
|-------|------------|---------|---------|
| Portal do aluno / responsável (ver próxima aula) | Difícil | Adicional | Auth, permissão, UX nova |
| Turma / aula em grupo | Difícil | Adicional | Quebra 1 aluno ↔ 1 crédito |
| Vários professores no mesmo estúdio | Difícil | Adicional | Papéis; `user_id` só isola donos |
| PWA / app no celular | Médio | Adicional | A UI já é usável no telefone |
| Gravação da aula / biblioteca de partitura | Difícil | Adicional | Storage, direito autoral, UX pesada |

---

## Ideias para ampliar (ainda soltas)

Não estão na matriz de “fazer agora”, mas valem anotar para não esquecer:

- **Onboarding de 3 passos** na primeira conta: cadastrar aluno → vender pack 4 → gerar as 4 terças.
- **Atalho de teclado** na ficha: C conclui, F falta (o dia a dia é repetitivo).
- **Imprimir / PDF da semana** para deixar no estúdio.
- **Aula extra avulsa no meio do pacote** (já dá: cria um `single`; o fluxo pode ser um botão “+ avulsa”).
- **Política de falta configurável** — hoje falta consome; alguns professores reposição na primeira falta.
- **Fila de espera** num horário disputado (sábado 10h).
- **Professor substituto** num dia (outro `user` dá a aula, crédito continua do dono) — só se um dia houver estúdio.
- **Tema escuro** — conforto; zero negócio.
- **Comando rápido (Ctrl+K)** — “Ana, agendar terça”.
- **Linha do tempo na ficha** — pacotes e aulas misturados por data, em vez de dois cards.
- **Seed / conta demo** — para testar o painel sem cadastro manual.
- **Desfazer** os 10 segundos depois de “Concluir” (toque errado no celular).

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

**Ciclo B — o pacote mensal de verdade**  
Gerar aulas da semana + validade dos créditos + horário padrão do aluno + CSV do mês.

**Ciclo C — carinho e operação**  
WhatsApp na ficha, aniversário, responsável, recibo, paginação, “esqueci senha”, CI.

Depois disso, só abrir ideia **adicional** se uma dor concreta aparecer (ex.: “preciso de 5 tipos de pacote” → `plan_types`).
