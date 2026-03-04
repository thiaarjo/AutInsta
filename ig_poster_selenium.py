"""
ig_poster_selenium.py
=====================
Módulo dedicado para publicação automatizada de posts no Instagram
utilizando Selenium WebDriver (sem dependência da Meta Graph API).

Fluxo:
  1. Abrir o navegador (headless ou visível)
  2. Fazer login com credenciais do banco de dados
  3. Lidar com telas pós-login ("Agora não")
  4. Clicar no botão "Criar" / "+" do menu lateral
  5. Injetar o arquivo de mídia no <input type="file"> oculto
  6. Avançar pelas telas (corte, filtros) clicando "Avançar"
  7. Inserir a legenda
  8. Clicar em "Compartilhar"
  9. Fechar o navegador e limpar processos

Assinatura pública:
  publicar_no_instagram_local(caminho_foto, legenda) -> bool
"""

import os
import psutil
from time import sleep
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

import database

# =========================================================================
# CONSTANTES
# =========================================================================
DELAY_BASE = 4          # Segundos de espera padrão entre ações
INSTAGRAM_URL = "https://www.instagram.com/"

# =========================================================================
# UTILITÁRIO DE PROCESSO (Reutiliza padrão do scraper.py)
# =========================================================================
def _aniquilar_chrome(pid):
    """Força o encerramento do processo Chrome e seus filhos."""
    try:
        pai = psutil.Process(pid)
        for filho in pai.children(recursive=True):
            filho.kill()
        pai.kill()
    except psutil.NoSuchProcess:
        pass
    except Exception as e:
        print(f"[POSTER] Erro ao limpar Chrome (PID {pid}): {e}", flush=True)

# =========================================================================
# FUNÇÕES INTERNAS
# =========================================================================
def log_acao(post_id, mensagem, tipo="INFO"):
    """Imprime a mensagem no console e, se post_id for fornecido, salva no banco de dados."""
    print(mensagem, flush=True)
    if post_id:
        try:
            database.inserir_log_postagem(post_id, tipo, mensagem.replace("[POSTER] ", ""))
        except Exception as e:
            print(f"[POSTER] Erro ao salvar log no BD: {e}", flush=True)

def _criar_driver(modo_headless=False):
    """Configura e retorna uma instância do Chrome WebDriver."""
    opcoes = Options()
    opcoes.page_load_strategy = "eager"
    opcoes.add_argument("--lang=pt-BR")
    opcoes.add_argument("--window-size=1920,1080")
    opcoes.add_argument("--disable-notifications")
    
    if modo_headless:
        opcoes.add_argument("--headless=new")
    
    driver = webdriver.Chrome(options=opcoes)
    return driver


def _fazer_login(driver, usuario, senha, post_id=None):
    """Executa o fluxo de login no Instagram."""
    log_acao(post_id, "[POSTER] Acessando Instagram.com...", "INFO")
    driver.get(INSTAGRAM_URL)
    sleep(DELAY_BASE)

    # Campo de usuário
    try:
        driver.find_element(By.NAME, "username").send_keys(usuario)
    except Exception:
        driver.find_element(By.NAME, "email").send_keys(usuario)
    sleep(1)

    # Campo de senha
    try:
        driver.find_element(By.NAME, "password").send_keys(senha)
    except Exception:
        driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(senha)
    sleep(1)

    # Botão "Entrar"
    log_acao(post_id, "[POSTER] Enviando credenciais...", "INFO")
    try:
        driver.find_element(By.XPATH, "//*[text()='Entrar']").click()
    except Exception:
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    sleep(DELAY_BASE * 2)  # Espera o login processar

    # Tela "Salvar informações de login?" -> "Agora não"
    try:
        WebDriverWait(driver, 8).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@role='button' and text()='Agora não']"))
        ).click()
        log_acao(post_id, "[POSTER] Tela 'Salvar info' descartada.", "INFO")
        sleep(DELAY_BASE)
    except Exception:
        pass  # A tela pode não aparecer

    # Tela "Ativar notificações?" -> "Agora não"
    try:
        WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//button[text()='Agora não']"))
        ).click()
        log_acao(post_id, "[POSTER] Tela 'Notificações' descartada.", "INFO")
        sleep(2)
    except Exception:
        pass

    log_acao(post_id, "[POSTER] Login concluído com sucesso.", "INFO")


def _clicar_botao_criar(driver, post_id=None):
    """Localiza e clica no botão 'Criar' / '+' do menu lateral."""
    log_acao(post_id, "[POSTER] Procurando botão 'Criar'...", "INFO")
    
    # Estratégia 1: Procurar pelo texto "Criar" dentro de um span no menu
    try:
        botao = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//span[text()='Criar']/ancestor::a | //span[text()='Criar']/ancestor::div[@role='button']"))
        )
        botao.click()
        log_acao(post_id, "[POSTER] Botão 'Criar' clicado.", "INFO")
        sleep(3)
        return
    except Exception:
        pass

    # Estratégia 2: Procurar pelo texto "Novo post"
    try:
        botao = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//span[text()='Novo post']/ancestor::a | //span[text()='Novo post']/ancestor::div[@role='button']"))
        )
        botao.click()
        log_acao(post_id, "[POSTER] Botão 'Novo post' clicado.", "INFO")
        sleep(3)
        return
    except Exception:
        pass

    # Estratégia 3: Procurar pelo SVG com aria-label "Novo post" ou "New post"
    try:
        botao = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//*[local-name()='svg' and (@aria-label='Novo post' or @aria-label='New post' or @aria-label='Criar')]/ancestor::a | //*[local-name()='svg' and (@aria-label='Novo post' or @aria-label='New post' or @aria-label='Criar')]/ancestor::div[@role='button']"))
        )
        botao.click()
        log_acao(post_id, "[POSTER] Botão 'Criar' (via SVG) clicado.", "INFO")
        sleep(3)
        return
    except Exception:
        msg = "Não foi possível encontrar o botão 'Criar' no menu lateral."
        log_acao(post_id, f"[POSTER] ERRO: {msg}", "ERROR")
        raise Exception(f"[POSTER] ERRO: {msg}")


def _upload_midia(driver, caminhos_midia, post_id=None):
    """
    Injeta o(s) arquivo(s) de mídia no <input type='file'> oculto dentro do modal 
    'Criar novo post', suportando carrossel separando caminhos por \\n (Selenium/Chrome doc).
    """
    
    lista_caminhos = [p.strip() for p in caminhos_midia.split(",")]
    arquivos_validos = []
    
    for c in lista_caminhos:
        caminho_abs = os.path.abspath(c)
        if not os.path.exists(caminho_abs):
            msg = f"Arquivo não encontrado: {caminho_abs}"
            log_acao(post_id, f"[POSTER] ERRO: {msg}", "ERROR")
            raise FileNotFoundError(f"[POSTER] Arquivo não encontrado: {caminho_abs}")
        arquivos_validos.append(caminho_abs)
        
    eh_carrossel_ou_video = len(arquivos_validos) > 1 or any(a.lower().endswith(('.mp4', '.mov', '.avi')) for a in arquivos_validos)
        
    # Selenium no Chrome aceita multi-upload enviando os paths separados por \n
    string_upload = "\n".join(arquivos_validos)
    
    log_acao(post_id, f"[POSTER] Enviando {len(arquivos_validos)} arquivo(s) de mídia (via input)...", "INFO")

    # Localiza o <input type="file"> oculto dentro do formulário do modal
    try:
        input_file = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='file' and (@accept)]"))
        )
        input_file.send_keys(string_upload)
        log_acao(post_id, "[POSTER] Arquivo(s) carregado(s) no modal do Instagram.", "INFO")
        
        # Vídeos ou múltiplos arquivos requerem mais tempo do front-end do IG para montar a preview
        if eh_carrossel_ou_video:
             log_acao(post_id, "[POSTER] Aguardando processamento da mídia (pode levar alguns segundos)...", "INFO")
             sleep(DELAY_BASE * 3)
        else:
             sleep(DELAY_BASE)
             
    except Exception as e:
        msg = f"ERRO ao localizar <input type='file'>: {e}"
        log_acao(post_id, f"[POSTER] {msg}", "ERROR")
        raise Exception(f"[POSTER] {msg}")


def _avancar_etapas_e_legendar(driver, legenda, post_id=None):
    """
    Avança pelas telas de corte e filtros clicando 'Avançar',
    depois insere a legenda e clica em 'Compartilhar'.
    """
    # === ETAPA 1: Tela de Corte -> Avançar ===
    log_acao(post_id, "[POSTER] Avançando tela de corte...", "INFO")
    try:
        # Aumentar timeout por precaução (vídeos grandes demoram pra habilitar o Okey)
        btn_avancar = WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@role='button' and text()='Avançar'] | //button[text()='Avançar'] | //div[text()='Next']/ancestor::div[@role='button']"))
        )
        btn_avancar.click()
        sleep(3)
    except Exception as e:
        msg = f"ERRO ao avançar tela de corte: {e}"
        log_acao(post_id, f"[POSTER] {msg}", "ERROR")
        raise Exception(f"[POSTER] {msg}")

    # === ETAPA 2: Tela de Filtros -> Avançar ===
    log_acao(post_id, "[POSTER] Avançando tela de filtros...", "INFO")
    try:
        btn_avancar = WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@role='button' and text()='Avançar'] | //button[text()='Avançar'] | //div[text()='Next']/ancestor::div[@role='button']"))
        )
        btn_avancar.click()
        sleep(3)
    except Exception as e:
        msg = f"ERRO ao avançar tela de filtros: {e}"
        log_acao(post_id, f"[POSTER] {msg}", "ERROR")
        raise Exception(f"[POSTER] {msg}")

    # === ETAPA 3: Tela de Legenda -> Escrever e Compartilhar ===
    log_acao(post_id, "[POSTER] Inserindo legenda...", "INFO")
    try:
        # O campo de legenda pode ser um <textarea> ou um <div contenteditable>
        campo_legenda = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//textarea[@aria-label='Escreva uma legenda...' or @aria-label='Write a caption...'] | //div[@aria-label='Escreva uma legenda...' or @aria-label='Write a caption...'][@contenteditable='true'] | //div[@role='textbox'][@contenteditable='true']"))
        )
        campo_legenda.click()
        sleep(0.5)
        campo_legenda.send_keys(legenda)
        log_acao(post_id, f"[POSTER] Legenda inserida com sucesso.", "INFO")
        sleep(2)
    except Exception as e:
        log_acao(post_id, f"[POSTER] AVISO: Não foi possível inserir a legenda: {e}", "ERROR")

    # === ETAPA 4: Clicar em "Compartilhar" ===
    log_acao(post_id, "[POSTER] Clicando em 'Compartilhar'...", "INFO")
    try:
        btn_compartilhar = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@role='button' and text()='Compartilhar'] | //button[text()='Compartilhar'] | //div[text()='Share']/ancestor::div[@role='button'] | //button[text()='Share']"))
        )
        btn_compartilhar.click()
        
        # Pode demorar bastante para o upload real acontecer
        log_acao(post_id, "[POSTER] Upload em andamento... Aguarde.", "INFO")
        sleep(DELAY_BASE * 4) 
    except Exception as e:
        msg = f"ERRO ao clicar em 'Compartilhar': {e}"
        log_acao(post_id, f"[POSTER] {msg}", "ERROR")
        raise Exception(f"[POSTER] {msg}")

    # === ETAPA 5: Verificar confirmação "Post compartilhado" ===
    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'compartilhad') or contains(text(), 'shared') or contains(text(), 'publicação foi')]"))
        )
        log_acao(post_id, "[POSTER] Confirmação de publicação detectada!", "INFO")
    except Exception:
        log_acao(post_id, "[POSTER] AVISO: Não foi possível confirmar a publicação visualmente (pode ter sido postado mesmo assim).", "INFO")


# =========================================================================
# FUNÇÃO PÚBLICA PRINCIPAL
# =========================================================================
def publicar_no_instagram_local(caminho_foto: str, legenda: str, post_id: int = None) -> bool:
    """
    Publica uma foto no Instagram via Selenium WebDriver e guarda os logs no banco de dados.
    """
    print("\n===================================================", flush=True)
    log_acao(post_id, "[POSTER] Iniciando rotina de publicação automatizada...", "INFO")
    
    # Busca credenciais do banco
    config = database.obter_configuracoes()
    usuario = config.get("usuario", "")
    senha = config.get("senha", "")

    if not usuario or not senha:
        log_acao(post_id, "[POSTER] ERRO: Credenciais ausentes no banco. Vá em Configurações e salve-as.", "ERROR")
        return False

    driver = None
    pid_chrome = None

    try:
        # 1. Inicializar navegador
        modo_headless = config.get("modo_invisivel", False)
        log_acao(post_id, f"[POSTER] Iniciando Chrome em modo Invisível: {modo_headless}", "INFO")
        driver = _criar_driver(modo_headless)
        pid_chrome = driver.service.process.pid

        # 2. Login
        _fazer_login(driver, usuario, senha, post_id)

        # 3. Clicar em "Criar"
        _clicar_botao_criar(driver, post_id)

        # 4. Upload da mídia
        _upload_midia(driver, caminho_foto, post_id)

        # 5. Avançar etapas e inserir legenda
        _avancar_etapas_e_legendar(driver, legenda, post_id)

        log_acao(post_id, "[POSTER] ✔ PUBLICAÇÃO FINALIZADA COM SUCESSO!", "INFO")
        return True

    except FileNotFoundError as e:
        log_acao(post_id, f"[POSTER] ✖ Arquivo não encontrado: {e}", "ERROR")
        return False
    except Exception as e:
        log_acao(post_id, f"[POSTER] ✖ Falha inesperada durante a automação: {e}", "ERROR")
        return False
    finally:
        # Limpeza garantida
        try:
            if driver:
                driver.quit()
        except Exception:
            pass
        finally:
            if pid_chrome:
                _aniquilar_chrome(pid_chrome)
