# AutInsta (Instagram Monitor Pro)

AutInsta é um sistema de monitoramento e automação para Instagram construído em Python. Ele unifica uma API local construída com FastAPI, automação de navegador usando Selenium e agendamento de postagens automatizado usando APScheduler.

## 🚀 Funcionalidades

- **Extração Avançada:** Coleta dados de perfis, posts, curtidas, seguidores e stories.
- **Painel de Controle (Dashboard):** Acompanhamento visual da automação e status das extrações pelo navegador.
- **Gestão no Banco de Dados:** Salva e organiza os dados colhidos usando SQLite (histórico de execuções).
- **Agendador de Postagens:** Interface para hospedar mídias locais e uma fila (_Vigia_) para publicar automaticamente na Meta API nos horários agendados.
- **Relatórios:** Exporta o engajamento extraído em formato CSV e mostra gráficos de evolução.

## 🛠️ Tecnologias Utilizadas

- **Backend / API:** [FastAPI](https://fastapi.tiangolo.com/) e [Uvicorn](https://www.uvicorn.org/)
- **Scraping / Bot:** [Selenium](https://selenium-python.readthedocs.io/)
- **Agendamento (CRON):** [APScheduler](https://apscheduler.readthedocs.io/)
- **Banco de Dados:** SQLite3 Nativo
- **Frontend:** Vanilla HTML/JS interativo

## 📦 Instalação e Uso

1. **Clone o repositório:**
```bash
git clone https://github.com/SEU_USUARIO/AutInsta.git
cd AutInsta
```

2. **Crie e ative o ambiente virtual:**
```bash
python -m venv venv
venv\Scripts\activate   # No Windows
```

3. **Instale as dependências:**
```bash
pip install -r requirements.txt
```

4. **Inicie o servidor localmente:**
```bash
uvicorn main:app --reload
```
O sistema abrirá automaticamente o navegador na porta HTTP `http://localhost:8000`.

## ⚠️ Avisos e Configurações de Deploy
* Crie sua integração nas plataformas de desenvolvedor da **Meta** e insira suas credenciais em `meta_api.py`.
* Verifique o caminho base da sua instalação do Google Chrome para o ChromeDriver.

## 🛡️ Aviso Legal
Este projeto é para propósitos educacionais. O uso de bots para raspagem de dados no Instagram pode infligir os Termos de Serviço da plataforma. Use com responsabilidade e saiba que limites de taxa podem aplicar restrições na sua conta.
