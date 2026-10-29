## Descrição da Mudança

<!-- Descreva de forma clara e concisa o que este PR altera, adiciona ou corrige. -->

## Tipo de Mudança (Conventional Commits)

- [ ] `feat`: Nova funcionalidade
- [ ] `fix`: Correção de bug
- [ ] `refactor`: Refatoração sem alteração de comportamento
- [ ] `chore`: Manutenção, dependências, scripts ou build
- [ ] `docs`: Documentação
- [ ] `test`: Adição ou ajuste de testes

## Contexto & Motivação

<!-- Por que esta mudança é necessária? Se resolve alguma issue ou tarefa do roadmap, mencione aqui (ex: Fase 1, Fase 2, A-02). -->

---

## Checklist de Aprovação da V2 (Qualidade & Produção)

Conforme a **Seção 9** do [Plano de Transição V2](docs/V2_PLANO_DE_TRANSICAO.md):

- [ ] **CI Verde:** Lint, typecheck, testes automatizados e builds passando sem erros.
- [ ] **Banco de Dados & Migrations:**
  - [ ] Segue o padrão _expand → migrate → contract_ (sem `dropColumn`/`dropTable` no mesmo deploy).
  - [ ] Não edita migrations já aplicadas; migrations novas testadas.
- [ ] **Contrato da API:** Rotas `/api/v1` mantidas 100% retrocompatíveis com clientes existentes.
- [ ] **Segurança & Variáveis:**
  - [ ] Nenhuma credencial, secret ou connection string commitada.
  - [ ] Novas variáveis de ambiente cadastradas nos provedores (Vercel/Render/Supabase) antes do deploy.
- [ ] **Rollback:** Plano de retorno definido e compreendido.
- [ ] **Documentação:** `CHANGELOG.md` atualizado com o resumo da alteração.
