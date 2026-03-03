# AutPost (Instagram Monitor Pro)

O AutPost é um sistema corporativo de monitoramento e automação de extração de dados voltado para a plataforma Instagram. A aplicação integra uma API RESTful de alta performance desenvolvida em FastAPI, rotinas de automação Web com Selenium WebDriver e gerenciadores analíticos de publicação através do APScheduler.

## Funcionalidades Principais

- **Extração de Dados Avançada:** Coleta estruturada de engajamento em perfis-alvo (seguidores, publicações do feed e stories). Conta com roteamento direto para extração isolada e eficiente de stories.
- **Calendário de Conteúdo Interativo:** Interface avançada de agendamento em grid (Hub do Dia) permitindo manipulação via Drag & Drop e arquivamento em uma coluna de ideias persistente.
- **Painel de Controle Escalonável:** Desenvolvido puramente em módulos JavaScript ES6, com notificações UI dinâmicas não obstrutivas (Toasts UI) baseadas no status do backend.
- **Armazenamento e Histórico Rígido:** Centralização dos dados extraídos e históricos de tarefas em um banco de dados relacional SQLite, modelado em cascata.
- **Publicação Automatizada (Meta Cloud):** Motor em segundo plano que processa e despacha arquivos de mídia local diretamente por meio da Meta Graph API oficial.
- **Relatórios Analíticos:** Exportação do processamento em datasets tabulares (CSV) e renderização matemática do crescimento dos perfis em gráficos (ChartJS).

## Especificações Técnicas

- **Backend / API:** Framework FastAPI com servidor Uvicorn ASGI
- **Web Scraping:** Selenium WebDriver com prevenção ativa contra memory leaks no Chromium
- **Agendamento de Jobs:** APScheduler em background
- **Persistência de Dados:** SQLite3 
- **Frontend Interativo:** Vanilla HTML5, CSS Nativo e Módulos ECMAScript 6 (ES6)

## Instruções de Instalação e Execução

1. **Clonar o Repositório:**
```bash
git clone https://github.com/SEU_USUARIO/AutPost.git
cd AutPost
```

2. **Inicializar o Ambiente Virtual Python:**
```bash
python -m venv venv
venv\Scripts\activate   # Em ambientes Windows
```

3. **Instalar as Dependências:**
```bash
pip install -r requirements.txt
```

4. **Executar o Servidor de Desenvolvimento:**
```bash
uvicorn main:app --reload
```
A interface do sistema abrirá automaticamente através do servidor local na porta HTTP `http://localhost:8000`.

## Requisitos Base de Configuração 
* Autenticação e aprovação de permissões no portal **Meta for Developers** para as credenciais injetadas nativamente no submódulo `meta_api.py`.
* Verificação estrutural do driver base do Google Chrome mapeado no sistema operacional principal.

## Aviso e Disclaimer de Proteção
O desenvolvimento deste projeto possui propósitos estritamente focados em engenharia de extração e automação. O uso de robôs web em ecossistemas fechados, a exemplo do Instagram, pode resultar no rompimento dos Termos de Serviço proprietários. É de inteira responsabilidade do desenvolvedor-fim a manipulação dos bloqueios de sub-rede e restrições da taxa-limite (*rate limit*) através das opções administrativas disponíveis no painel de controle.
