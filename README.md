# IG Monitor Pro

O IG Monitor Pro é um sistema corporativo de monitoramento e automação de extração de dados voltado para a plataforma Instagram. A aplicação integra uma API RESTful de alta performance desenvolvida em FastAPI, processamento de tarefas em segundo plano com Celery e Redis, e automação Web com Selenium WebDriver.

## Funcionalidades Principais

- **Extração de Dados em Tempo Real:** Coleta estruturada de engajamento (seguidores, posts e stories) com feedback visual instantâneo via barra de progresso.
- **Arquitetura Escalável (Celery + Redis):** Desacoplamento da API e do motor de extração, permitindo processamento assíncrono e resiliente.
- **Suporte a Extrações Paralelas:** Configuração nativa para múltiplos Celery Workers, permitindo monitorar vários perfis simultaneamente sem bloqueios.
- **Deduplicação Inteligente:** O sistema identifica stories e posts já capturados, otimizando o armazenamento e evitando duplicatas.
- **Dashboard Analítico & Histórico:** Painel completo para revisar extrações passadas, filtrar por perfil e acompanhar métricas de crescimento.
- **Calendário de Conteúdo Interativo:** Interface de agendamento com Drag & Drop e Hub do Dia para organização operacional.
- **Publicação Automatizada:** Integração com Meta Graph API para despachar mídias agendadas.

## Especificações Técnicas

- **Backend:** FastAPI (Python 3.10+) 
- **Task Queue:** Celery com Redis Broker
- **Web Scraping:** Selenium WebDriver (Modo Headless/Visível)
- **Persistência:** SQLite3 com suporte a transações e Foreign Keys
- **Frontend:** React + Tailwind CSS (Vite)
- **Paralelismo:** Suporte a múltiplos workers (`--pool=solo` no Windows)

## Instruções de Instalação e Execução

1. **Clonar o Repositório:**
```bash
git clone https://github.com/thiaarjo/AutInsta.git
cd AutInsta
```

2. **Configuração do Ambiente:**
- Crie e ative sua `venv`: `python -m venv venv` -> `venv\Scripts\activate`
- Instale as dependências: `pip install -r requirements.txt`
- Certifique-se de ter o **Redis** instalado e rodando na porta padrão (6379).

3. **Execução (Simplificada):**
O projeto conta com um script automatizado para Windows:
```bash
.\start.bat
```
Este comando irá:
- Buildar o frontend React.
- Iniciar o servidor Redis.
- Subir 2 Celery Workers em paralelo.
- Iniciar a API FastAPI.

A interface ficará disponível em: `http://localhost:8000`

## Requisitos de Configuração
* Credenciais de usuário/senha configuradas no painel de Configurações Globais.
* Google Chrome instalado (o Selenium gerencia o driver automaticamente).

## Aviso e Disclaimer
O desenvolvimento deste projeto possui propósitos estritamente focados em engenharia de extração e monitoramento operacional. O uso de automação web deve respeitar os Termos de Serviço da plataforma. É de inteira responsabilidade do usuário final a conformidade com as políticas de uso do Instagram.
