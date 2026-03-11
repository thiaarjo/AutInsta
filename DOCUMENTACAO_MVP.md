# Documentação de Ação Inicial
Projeto: Plataforma de Orquestração e Monitoramento de Canais Digitais

## 1. Visão geral do projeto

O objetivo deste projeto é desenvolver uma plataforma capaz de centralizar a operação digital de múltiplos clientes, permitindo monitorar ativos, acompanhar desempenho por canal, detectar problemas operacionais e apoiar a tomada de decisão comercial com poucos cliques.

A proposta inicial não será focada em burlar restrições de plataforma, e sim em criar uma base sólida para:

monitorar contas e ativos reais dos clientes;
identificar falhas, bloqueios, restrições e perdas de desempenho;
organizar a operação em escala;
reduzir trabalho manual;
gerar feedback rápido sobre quais canais estão performando melhor para venda, captação ou distribuição.

## 2. Objetivo da Fase 1

A Fase 1 terá como foco construir um MVP operacional, ou seja, uma primeira versão funcional do sistema, com capacidade de:

cadastrar clientes e seus ativos digitais;
acompanhar status de canais e contas;
registrar incidentes operacionais;
visualizar métricas básicas por canal;
identificar rapidamente onde o cliente está obtendo melhor retorno;
oferecer um painel centralizado com feedback rápido da operação.

## 3. Problema que o sistema quer resolver

Hoje, operações digitais multi-canal costumam sofrer com:
excesso de tarefas manuais;
dificuldade de acompanhar várias contas ao mesmo tempo;
falta de visibilidade sobre qual canal está trazendo resultado;
demora para perceber incidentes, restrições ou queda de performance;
dificuldade de escalar atendimento para muitos clientes.
O sistema nasce para resolver isso com centralização, visibilidade e padronização operacional.

## 4. Público-alvo inicial

Na fase inicial, o software deve ser pensado para atender:
empresas que vendem produtos ou serviços em canais digitais;
operadores de múltiplas contas e múltiplos clientes;
equipes comerciais ou de marketing;
agências;
estruturas que precisem acompanhar várias frentes digitais ao mesmo tempo.
No futuro, o sistema pode ser adaptado para clientes maiores, incluindo operações com exigência maior de controle, auditoria e escala.

## 5. Escopo inicial do MVP

O MVP não precisa tentar fazer tudo de uma vez.
Ele deve começar resolvendo o núcleo da dor operacional.

O MVP deve incluir:

**Cadastro e organização**
- cadastro de clientes;
- cadastro de canais por cliente;
- cadastro de ativos digitais por cliente;
- categorização por tipo de canal.

**Painel central**
- visão resumida por cliente;
- visão resumida por canal;
- status operacional dos ativos;
- alertas principais.

**Monitoramento**
- canal ativo/inativo;
- falha de acesso;
- queda de desempenho;
- incidente registrado;
- alteração de status operacional.

**Métricas iniciais**
- canal com melhor retorno;
- canal com pior retorno;
- leads, cliques, mensagens ou vendas por canal;
- histórico simples de performance.

**Registro operacional**
- histórico de eventos;
- observações por cliente;
- incidentes e ações tomadas.

## 6. O que fica fora da Fase 1

Para evitar complexidade excessiva e risco alto, a Fase 1 não deve começar tentando:
- automatizar tudo;
- recriar ativos após punição;
- operar evasão de bloqueio;
- simular comportamento humano para enganar plataforma;
- criar uma malha massiva de contas paralelas;
- depender de dezenas de fluxos frágeis com Selenium logo no início.

Esses caminhos aumentam risco técnico, jurídico e comercial, além de comprometer a escalabilidade do produto. As regras da Meta restringem meios não autorizados de criação/acesso e também scraping não autorizado.

## 7. Proposta de posicionamento do sistema

O sistema deve ser apresentado inicialmente como:
**uma plataforma de monitoramento, análise e orquestração operacional de canais digitais**
Isso é mais forte, mais vendável e mais sustentável do que apresentar como “ferramenta para contornar bloqueios”.

## 8. Módulos principais do sistema

**8.1. Módulo de clientes**
Responsável por armazenar e organizar: nome do cliente; segmento; responsáveis; canais cadastrados; observações; status geral da operação.

**8.2. Módulo de ativos digitais**
Responsável por listar os ativos de cada cliente: perfis; páginas; contas comerciais; domínios; outros ativos relevantes.

**8.3. Módulo de saúde operacional**
Responsável por acompanhar: status atual do ativo; incidentes; última verificação; tipo de falha; nível de risco; observações operacionais.

**8.4. Módulo de performance**
Responsável por mostrar: desempenho por canal; histórico de performance; comparativo entre canais; tendência de crescimento ou queda; destaque de canal mais promissor.

**8.5. Módulo de incidentes**
Responsável por registrar: bloqueio; restrição; falha de login; perda de acesso; queda anormal de resultado; ação tomada; data e responsável.

**8.6. Módulo de recomendação operacional**
Responsável por sugerir: revisar canal X; priorizar canal Y; pausar operação Z; registrar análise manual; redistribuir esforço para canal com melhor retorno.

## 9. Fluxo operacional esperado

O sistema deve seguir uma lógica simples:
cadastrar cliente -> cadastrar canais e ativos -> coletar ou registrar status operacional -> exibir painel resumido -> identificar alertas -> registrar incidentes -> comparar canais -> apontar qual canal está trazendo melhor retorno -> permitir ação rápida do operador.

## 10. Exemplo de fluxo de uso

Um operador abre o sistema e vê:
Cliente A
- Canal 1: ativo, boa performance
- Canal 2: queda de desempenho
- Canal 3: incidente operacional

A partir disso, ele consegue:
ver qual canal está melhor; abrir detalhes do canal com problema; registrar observação; acompanhar histórico; tomar decisão rápida sem precisar navegar manualmente em vários ambientes.

## 11. Requisitos funcionais iniciais

O sistema deve permitir:
cadastrar clientes; editar clientes; cadastrar canais por cliente; editar canais; registrar status operacional; registrar incidente; exibir dashboard resumido; exibir ranking de canais; filtrar por cliente; filtrar por status; visualizar histórico básico; armazenar observações operacionais.

## 12. Requisitos não funcionais iniciais

O sistema deve buscar:
interface simples; poucos cliques; navegação rápida; base preparada para multiusuário; estrutura preparada para crescer; logs básicos; consistência de dados; possibilidade futura de integração com APIs oficiais.

## 13. Stack sugerida para começar

**Backend:** Python (FastAPI ou Django)
**Frontend:** HTML/CSS/JS ou React, dependendo do nível atual da equipe
**Banco de dados:** SQLite para protótipo local, PostgreSQL para crescimento futuro
**Automação auxiliar:** Selenium apenas em pontos muito controlados e não como base total da arquitetura
**Outras camadas futuras:** filas de processamento; autenticação robusta; permissões por usuário; integração por API; alertas automatizados.

## 14. Estratégia técnica recomendada

A automação não deve ser o centro do sistema no começo. O centro deve ser o modelo operacional.
Primeiro vocês precisam responder: o que será monitorado; qual evento é importante; quais métricas importam; como o operador toma decisão; o que deve aparecer no painel. Depois disso, a automação entra como apoio, não como fundação inteira.

## 15. Estrutura mínima de banco de dados

**Cliente**: id, nome, segmento, responsavel, status, observacoes
**Canal**: id, cliente_id, nome, tipo, status, data_cadastro
**AtivoDigital**: id, canal_id, nome_ativo, identificador, status, ultima_verificacao
**Incidente**: id, ativo_id, tipo_incidente, descricao, data, acao_tomada, responsavel
**MetricaCanal**: id, canal_id, data, cliques, leads, mensagens, vendas, observacao

## 16. Primeiras telas do sistema

- **Tela 1 — Login**: Acesso do operador.
- **Tela 2 — Dashboard geral**: Visão com clientes monitorados; canais ativos; alertas; canais com melhor retorno; incidentes recentes.
- **Tela 3 — Lista de clientes**: Cadastro e busca.
- **Tela 4 — Detalhe do cliente**: Mostra canais; ativos; histórico; incidentes; observações.
- **Tela 5 — Painel de canal**: Mostra status; métricas; tendência; incidentes; feedback operacional.
- **Tela 6 — Registro de incidente**: Formulário simples para registrar problema e ação tomada.

## 17. Ordem de desenvolvimento recomendada

Etapa 1: Modelar banco de dados.
Etapa 2: Criar cadastro de clientes.
Etapa 3: Criar cadastro de canais.
Etapa 4: Criar dashboard básico.
Etapa 5: Criar módulo de incidentes.
Etapa 6: Criar painel de performance simples.
Etapa 7: Adicionar filtros e histórico.
Etapa 8: Melhorar usabilidade e reduzir cliques.

## 18. Critérios de sucesso da Fase 1

A Fase 1 será considerada bem-sucedida se o sistema conseguir:
centralizar clientes e canais; mostrar rapidamente o status operacional; indicar qual canal está trazendo melhor resultado; registrar incidentes; reduzir tempo de análise manual; servir como base para expansão futura.

## 19. Riscos do projeto

Os principais riscos são:
tentar fazer tudo ao mesmo tempo; depender demais de automações frágeis; falta de definição do produto; escopo amplo demais; operação fora das políticas das plataformas; arquitetura nascer desorganizada.

## 20. Próximas ações imediatas

Ação 1: Definir nome provisório do projeto.
Ação 2: Desenhar no papel as entidades (cliente, canal, ativo, incidente, métrica).
Ação 3: Definir quais métricas realmente importam no MVP.
Ação 4: Esboçar as telas principais.
Ação 5: Montar o banco inicial.
Ação 6: Criar backend básico.
Ação 7: Criar dashboard simples funcional.
Ação 8: Testar com 1 ou 2 clientes fictícios.

## 21. Conclusão

O projeto tem potencial real, mas precisa começar pelo caminho certo.
A prioridade agora não é construir uma máquina gigante de automação, e sim criar uma base sólida de operação, monitoramento e análise. Se a Fase 1 for bem estruturada, depois vocês poderão evoluir para integrações; inteligência operacional; multiusuário robusto; alertas automáticos; recomendações; expansão comercial.
