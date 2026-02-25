import os
import psutil
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Importa as configurações e utilidades (agora com o megafone 'atualizar_status')
from config import ConfigBot, PASTA_PRINTS, gerenciador_tarefas
from utils import sleep_seguro, analisar_curtidas, atualizar_status

# --- FUNÇÃO PARA MATAR PROCESSOS ZUMBIS (Proteção de RAM) ---
def aniquilar_processo_chrome(pid):
    """Mata o processo do ChromeDriver e todos os processos filhos (Chrome.exe) à força."""
    try:
        processo_pai = psutil.Process(pid)
        for processo_filho in processo_pai.children(recursive=True):
            processo_filho.kill()
        processo_pai.kill()
    except psutil.NoSuchProcess:
        pass # O processo já morreu naturalmente
    except Exception as e:
        print(f"[!] Erro ao tentar limpar a memória (PID {pid}): {e}")

def eh_post_fixado(elemento_post):
    try:
        alfinete = elemento_post.find_elements(By.XPATH, ".//*[local-name()='svg' and (contains(@aria-label, 'ixad') or contains(@aria-label, 'inn') or contains(@aria-label, 'Fixado'))]")
        return len(alfinete) > 0
    except: return False

def extrair_data_post(driver):
    """Extracts real date from <time> tag"""
    try:
        elemento_tempo = driver.find_element(By.TAG_NAME, "time")
        data_iso = elemento_tempo.get_attribute("datetime")
        if data_iso:
            data_iso = data_iso.split(".")[0].replace("Z", "")
            obj_data = datetime.fromisoformat(data_iso)
            return obj_data.strftime("%d/%m/%Y %H:%M")
        return "Data N/A"
    except:
        return "Data N/A"

def verificar_perfil_privado(driver):
    """
    Checks if 'This account is private' text exists.
    """
    try:
        xpath_privado = "//*[contains(text(), 'Essa conta é privada') or contains(text(), 'This account is private')]"
        aviso = driver.find_elements(By.XPATH, xpath_privado)
        return len(aviso) > 0
    except:
        return False

# --- FOLLOW ACTION (Com task_id) ---
def realizar_acao_seguir(driver, task_id):
    """
    Attempts to locate and click the 'Follow' button.
    """
    try:
        if len(driver.find_elements(By.XPATH, "//button[.//div[text()='Seguindo']]")) > 0:
            return "Already following"
        if len(driver.find_elements(By.XPATH, "//button[.//div[text()='Solicitado']]")) > 0:
            return "Request already pending"

        xpath_botao = "//button[.//div[text()='Seguir'] or .//div[text()='Seguir de volta']]"
        botoes = driver.find_elements(By.XPATH, xpath_botao)

        if len(botoes) > 0:
            botoes[0].click()
            sleep_seguro(2, task_id) 
            
            if len(driver.find_elements(By.XPATH, "//button[.//div[text()='Solicitado']]")) > 0:
                return "Request Sent (Private)"
            elif len(driver.find_elements(By.XPATH, "//button[.//div[text()='Seguindo']]")) > 0:
                return "Followed Successfully"
            else:
                return "Clicked (Status Unknown)"
        
        return "Follow button not found"
    except Exception as e:
        if "CANCELADO_PELO_USUARIO" in str(e): raise e 
        return f"Error following: {str(e)}"

# --- EXTRAÇÃO FORÇA-BRUTA DE SEGUIDORES ---
def extrair_seguidores_robusto(driver):
    """Garante que os seguidores sejam pegos, seja a conta pública ou privada"""
    try:
        elem = driver.find_element(By.XPATH, "//a[contains(@href, '/followers/')]//span[@title]")
        _, txt = analisar_curtidas(elem.get_attribute("title"))
        if txt and txt != "0": return txt
    except: pass

    try:
        elem = driver.find_element(By.XPATH, "//a[contains(@href, '/followers/')]")
        txt = elem.text.lower().replace("seguidores", "").replace("followers", "").strip()
        _, txt_final = analisar_curtidas(txt)
        if txt_final and txt_final != "0": return txt_final
    except: pass

    try:
        itens = driver.find_elements(By.XPATH, "//header//li | //header//ul/div | //header//section//div")
        for item in itens:
            texto_item = item.text.lower()
            if "seguidores" in texto_item or "followers" in texto_item:
                num_str = texto_item.split("seguidores")[0].split("followers")[0].strip()
                _, final = analisar_curtidas(num_str)
                if final and final != "0": return final
    except: pass

    return "N/A"

# =========================================================================
# --- BOT LOGIC (EXECUTA 1 PERFIL POR VEZ) ---
# =========================================================================
def rodar_robo(config: ConfigBot):
    
    # 🛡️ REGISTRA A TAREFA NO GERENCIADOR
    task_id = config.task_id
    gerenciador_tarefas[task_id] = {"cancelar": False, "pid": None, "progresso": 0, "mensagem": "Iniciando..."}
    
    USUARIO = config.usuario
    SENHA = config.senha
    DELAY = config.tempo_espera
    
    PERFIL_ALVO = f"https://www.instagram.com/{config.alvo}/"
    STORY_ALVO = f"https://www.instagram.com/stories/{config.alvo}/"

    chrome_options = Options()
    chrome_options.add_argument("--lang=pt-BR") 
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-notifications")
    
    if config.modo_oculto:
        chrome_options.add_argument("--headless=new")
    
    resultado = {
        "status": "success",
        "alvo": config.alvo,
        "privado": False,
        "acessivel": True,
        "status_seguir": "Not requested", 
        "seguidores": "N/A",
        "seguidores_matematica": 0, 
        "feed_posts": [],
        "stories": []
    }

    try:
        atualizar_status(task_id, 10, "Iniciando Navegador Invisível...")
        driver = webdriver.Chrome(options=chrome_options)
        
        # 🛡️ GUARDA O PID (Process ID) PARA LIMPAR A RAM DEPOIS
        gerenciador_tarefas[task_id]["pid"] = driver.service.process.pid
        
        # --- 1. LOGIN ---
        atualizar_status(task_id, 15, "Acessando Instagram.com e fazendo Login...")
        driver.get("https://www.instagram.com/")
        sleep_seguro(DELAY, task_id) 

        try: driver.find_element(By.NAME, "username").send_keys(USUARIO)
        except: driver.find_element(By.NAME, "email").send_keys(USUARIO)
        sleep_seguro(2, task_id)

        try: driver.find_element(By.NAME, "password").send_keys(SENHA)
        except: driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(SENHA)
        sleep_seguro(2, task_id)

        atualizar_status(task_id, 25, "Bypass de Telas Iniciais...")
        try: driver.find_element(By.XPATH, "//*[text()='Entrar']").click()
        except: driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        sleep_seguro(DELAY * 2, task_id) 

        try:
            driver.find_element(By.XPATH, "//div[@role='button' and text()='Agora não']").click()
            sleep_seguro(DELAY, task_id)
        except: pass

        # --- 2. ACCESS PROFILE ---
        atualizar_status(task_id, 35, f"Buscando Perfil: @{config.alvo}...")
        driver.get(PERFIL_ALVO)
        sleep_seguro(DELAY + 1, task_id)

        # --- PEGA OS SEGUIDORES IMEDIATAMENTE APÓS ABRIR O PERFIL ---
        resultado["seguidores"] = extrair_seguidores_robusto(driver)
        try:
             valor_int_seguidores, _ = analisar_curtidas(resultado["seguidores"])
             resultado["seguidores_matematica"] = valor_int_seguidores if isinstance(valor_int_seguidores, int) else 0
        except:
             resultado["seguidores_matematica"] = 0
             
        # --- 2.1 FOLLOW LOGIC ---
        if config.seguir_alvo:
            atualizar_status(task_id, 40, "Processando Follow no Alvo...")
            status_follow = realizar_acao_seguir(driver, task_id)
            resultado["status_seguir"] = status_follow

        # --- 2.2 PRIVACY CHECK ---
        if verificar_perfil_privado(driver):
            atualizar_status(task_id, 100, "Perfil Privado detectado. Operação concluída parcial.")
            resultado["privado"] = True
            resultado["acessivel"] = False
            resultado["status"] = "Profile Private and Blocked"
            return resultado 
        
        # --- 4. FEED ANALYSIS ---
        if config.coletar_feed:
            atualizar_status(task_id, 45, "Mapeando Grade de Posts do Feed...")
            sleep_seguro(3, task_id)
            xpath_posts = "//a[contains(@href, '/p/') or contains(@href, '/reel/')]"
            
            candidatos = []
            tentativas_grade = 0
            while tentativas_grade < 3:
                sleep_seguro(0.5, task_id)
                candidatos = driver.find_elements(By.XPATH, xpath_posts)
                if len(candidatos) > 0:
                    break
                else:
                    sleep_seguro(2.5, task_id)
                    tentativas_grade += 1
            
            posts_coletados = 0
            
            for i in range(len(candidatos)):
                sleep_seguro(0.5, task_id)
                if posts_coletados >= config.limite_posts: break
                
                # Progresso dinâmico baseado na quantidade de posts (De 45% até 80%)
                prog = int(45 + ((posts_coletados / config.limite_posts) * 35))
                atualizar_status(task_id, prog, f"Extraindo dados do Post {posts_coletados+1} de {config.limite_posts}...")
                
                # ==========================================================
                # 🛡️ BLINDAGEM MESTRA: ISOLA O POST PARA EVITAR EFEITO DOMINÓ
                # ==========================================================
                try:
                    candidatos = driver.find_elements(By.XPATH, xpath_posts)
                    if i >= len(candidatos): break
                    post_atual = candidatos[i]
                    
                    url_do_post = post_atual.get_attribute("href")
                    fixado = eh_post_fixado(post_atual)
                    
                    tipo_post = "FOTO/CARROSSEL"
                    try:
                        if "/reel/" in post_atual.get_attribute("href"):
                            tipo_post = "VIDEO (REEL)"
                    except: pass

                    # Click and Open
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", post_atual)
                    sleep_seguro(1, task_id)
                    
                    # TIRA A FOTO DA MINIATURA ANTES DE CLICAR
                    timestamp = int(datetime.now().timestamp())
                    nome_print = f"{config.alvo}_post_{posts_coletados+1}_{timestamp}.png"
                    caminho_print = os.path.join(PASTA_PRINTS, nome_print)
                    url_print = None
                    try:
                        post_atual.screenshot(caminho_print)
                        url_print = f"/fotos/{nome_print}" 
                    except: pass
                    
                    driver.execute_script("arguments[0].click();", post_atual)
                    
                    try:
                        xpath_espera = "//article[@role='presentation']//time | //article[@role='presentation']//video | //article[@role='presentation']//div[contains(@class, '_aagv')]"
                        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, xpath_espera)))
                        sleep_seguro(1.5, task_id) 
                    except Exception:
                        sleep_seguro(DELAY, task_id)
                    
                    texto_extraido = ""
                    try:
                        links_liked = driver.find_elements(By.XPATH, "//article[@role='presentation']//a[contains(@href, 'liked_by')]")
                        if len(links_liked) > 0:
                            texto_extraido = driver.execute_script("return arguments[0].textContent;", links_liked[-1])
                        else:
                            elementos = driver.find_elements(By.XPATH, "//article[@role='presentation']//section//span")
                            for el in elementos:
                                txt = driver.execute_script("return arguments[0].textContent;", el).strip()
                                t = txt.lower()
                                if ("curtida" in t or "likes" in t or "pessoas" in t) and len(txt) < 80:
                                    texto_extraido = txt
                                    if any(char.isdigit() for char in txt):
                                        break
                    except Exception as e:
                        texto_extraido = "0"
                    
                    valor_int, val_curtidas = analisar_curtidas(texto_extraido)
                    data_real = extrair_data_post(driver)

                    comentarios_list = []
                    comentarios_vistos = set() 
                    
                    if config.qtd_comentarios > 0:
                        atualizar_status(task_id, prog + 2, f"Raspando amostra de comentários do Post {posts_coletados+1}...")
                        try:
                            blocos_comentarios = driver.find_elements(By.XPATH, "//ul/li | //ul/div")
                            itens_para_raspar = blocos_comentarios[1:] if len(blocos_comentarios) > 1 else blocos_comentarios
                            
                            for bloco in itens_para_raspar:
                                sleep_seguro(0.1, task_id) 
                                if len(comentarios_list) >= config.qtd_comentarios:
                                    break
                                
                                nome_autor = ""
                                texto_coment = ""
                                
                                try:
                                    elem_usuario = bloco.find_element(By.XPATH, ".//h2//a | .//h3//a")
                                    nome_autor = elem_usuario.text.strip()
                                    elem_texto = bloco.find_element(By.XPATH, ".//span[@dir='auto'][not(ancestor::h2) and not(ancestor::h3)]")
                                    texto_coment = elem_texto.text.strip()
                                except:
                                    try:
                                        links = bloco.find_elements(By.XPATH, ".//a")
                                        for lnk in links:
                                            if lnk.text.strip():
                                                nome_autor = lnk.text.strip()
                                                break
                                                
                                        spans = bloco.find_elements(By.XPATH, ".//span[@dir='auto']")
                                        for sp in spans:
                                            txt = sp.text.strip()
                                            if txt and txt != nome_autor:
                                                texto_coment = txt
                                                break
                                    except: pass
                                
                                if nome_autor and texto_coment:
                                    assinatura = f"{nome_autor}|{texto_coment}"
                                    if assinatura not in comentarios_vistos:
                                        comentarios_vistos.add(assinatura)
                                        comentarios_list.append({
                                        "usuario": nome_autor,
                                        "texto": texto_coment
                                    })
                        except Exception as e:
                            if "CANCELADO_PELO_USUARIO" in str(e): raise e

                    resultado["feed_posts"].append({
                        "posicao": posts_coletados + 1,
                        "url_post": url_do_post, 
                        "tipo": tipo_post,
                        "fixado": fixado,
                        "data": data_real,
                        "curtidas": val_curtidas,
                        "curtidas_matematica": valor_int, 
                        "texto_original": texto_extraido,
                        "comentarios": comentarios_list if config.qtd_comentarios > 0 else None,
                        "print_post": url_print
                    })
                    
                    posts_coletados += 1 
                    driver.back()
                    sleep_seguro(2, task_id) 
                    
                except Exception as e:
                    if "CANCELADO_PELO_USUARIO" in str(e): raise e
                    try:
                        driver.back()
                        sleep_seguro(2, task_id)
                    except: pass
                    continue 

        # --- 5. STORIES (CONDITIONAL) ---
        if config.coletar_stories:
            atualizar_status(task_id, 85, "Acessando Stories Ativos...")
            driver.get(STORY_ALVO)
            sleep_seguro(DELAY + 1, task_id)
            
            try:
                driver.find_element(By.XPATH, "//div[@role='button' and contains(., 'Ver story')]").click()
                sleep_seguro(DELAY, task_id)
            except: pass 

            if driver.current_url != PERFIL_ALVO:
                stories_sessao = 0
                while True:
                    sleep_seguro(0.5, task_id)
                    stories_sessao += 1
                    atualizar_status(task_id, 85 + min(10, stories_sessao), f"Lendo Story {stories_sessao}...")
                    
                    tempo = "N/A"; midia = "FOTO"
                    try:
                        if driver.find_elements(By.TAG_NAME, "time"): tempo = driver.find_elements(By.TAG_NAME, "time")[0].text
                        if len(driver.find_elements(By.TAG_NAME, "video")) > 0: midia = "VIDEO"
                    except: pass

                    resultado["stories"].append({"numero": stories_sessao, "tipo": midia, "tempo": tempo})

                    navegou = False
                    tentativas = 0
                    while tentativas < 3:
                        try:
                            driver.find_element(By.XPATH, "//*[@aria-label='Avançar' or @aria-label='Next']").click()
                            sleep_seguro(2, task_id)
                            if config.alvo.lower() not in driver.current_url.lower():
                                navegou = True; break
                            navegou = True; break
                        except: sleep_seguro(1, task_id); tentativas += 1
                    
                    if not navegou or (config.alvo.lower() not in driver.current_url.lower()): break

        atualizar_status(task_id, 100, "Extração Finalizada. Salvando banco de dados...")

    except Exception as e:
        if "CANCELADO_PELO_USUARIO" in str(e):
            resultado["status"] = "Interrompido manualmente"
            atualizar_status(task_id, 0, "Operação Abortada pelo Usuário.")
        else:
            resultado["status"] = f"Error: {str(e)}"
            atualizar_status(task_id, 0, "Erro Crítico na Extração.")
            
    # =========================================================================
    # 🛡️ LIMPEZA GARANTIDA (RAM CLEAR)
    # =========================================================================
    finally:
        pid_alvo = None
        try:
            if 'driver' in locals():
                pid_alvo = gerenciador_tarefas.get(task_id, {}).get("pid")
                driver.quit() 
        except: 
            pass
        finally:
            if pid_alvo:
                aniquilar_processo_chrome(pid_alvo)
        
        return resultado