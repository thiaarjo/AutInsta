from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from time import sleep
from datetime import datetime
import re
import os
import database
import webbrowser # NOVO: Para abrir a guia sozinha
from fastapi.responses import FileResponse # NOVO: Para hospedar o HTML

# --- LÓGICA BLINDADA DE DIRETÓRIOS ---
# Descobre o caminho exato onde este script main.py está salvo no seu PC
DIRETORIO_BASE = os.path.dirname(os.path.abspath(__file__))
# Cria o caminho completo para a pasta de prints
PASTA_PRINTS = os.path.join(DIRETORIO_BASE, "prints_instagram")

# Cria a pasta (se ela já existir, o exist_ok=True faz ele apenas usar a pasta sem dar erro)
os.makedirs(PASTA_PRINTS, exist_ok=True)

# --- ESTADO GLOBAL DO ROBÔ (Para Cancelamento) ---
estado_robo = {"cancelar": False}

def sleep_seguro(segundos):
    """Espera o tempo definido, mas checa a cada 0.1s se o usuário cancelou a operação"""
    passos = int(segundos * 10)
    if passos == 0: passos = 1
    for _ in range(passos):
        if estado_robo["cancelar"]:
            raise Exception("CANCELADO_PELO_USUARIO")
        sleep(0.1)

# --- API STRUCTURE ---
app = FastAPI(title="API Instagram Monitor V25 (Lote + Fotos + Matemática Blindada)")

# Permite CORS para qualquer origem (útil para testes com HTML local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Transforma a pasta de prints em links de internet usando o caminho absoluto ---
app.mount("/fotos", StaticFiles(directory=PASTA_PRINTS), name="fotos")

# --- CONFIGURATION MODEL ---
class ConfigBot(BaseModel):
    alvo: str = Field(..., description="Target profiles separated by comma (max 3)") # Atualizado para lote
    usuario: str = Field(..., description="Your Instagram username")
    senha: str = Field(..., description="Your Instagram password")
    
    # --- System Configs ---
    tempo_espera: int = Field(4, description="Base delay in seconds")
    modo_oculto: bool = Field(False, description="Run in headless mode")
    
    # --- Action Configs ---
    seguir_alvo: bool = Field(False, description="Set to True to follow the target")
    
    # --- Scraping Modules (ON/OFF) ---
    coletar_feed: bool = Field(True, description="Set to True to scrape feed posts")
    
    # AQUI ESTÃO AS TRANCAS DE SEGURANÇA (Máximo 10)
    limite_posts: int = Field(3, ge=1, le=10, description="Number of posts to fetch (Máximo 10)")
    qtd_comentarios: int = Field(0, ge=0, le=10, description="Number of comments to fetch per post (Máximo 10)")
    
    coletar_stories: bool = Field(True, description="Set to True to scrape stories")

# =========================================================================
# --- FUNÇÃO DE MATEMÁTICA SUBSTITUÍDA E BLINDADA ---
# =========================================================================
def analisar_curtidas(texto):
    if not texto or texto == "0": return 0, "0"
    texto_lower = texto.lower()
    
    # REGRA 1: Tenta extrair numero que esteja colado com palavras-chave reais do Instagram
    # Isso evita pegar numeros aleatórios dentro de arrobas como "@joao123"
    padroes = re.findall(r'([\d\.,]+)\s*(mil|mi|k|bi)?\s*(?:de\s*)?(?:curtidas?|likes?|pessoas?)', texto_lower)
    
    if not padroes:
        # REGRA 2: Se nao achou número claro, verifica se a curtida está oculta
        if "outras" in texto_lower or "others" in texto_lower or "pessoas" in texto_lower:
            return "OCULTO", "Oculto pelo usuário"
            
        # REGRA 3: Fallback generico para tentar salvar a leitura se o Instagram mudar o layout
        padroes = re.findall(r'\b([\d\.,]+)\s*(mil|mi|k|bi)?\b', texto_lower)
        if not padroes:
            return 0, "0"
            
    # Extrai o último número e multiplicador válidos encontrados
    numero_str, multiplicador_str = padroes[-1]
    
    # Aplicação matemática (Corrigido o bug do 'mil' sendo lido como 'mi' de milhões)
    multiplicador = 1
    if multiplicador_str == 'mi': multiplicador = 1_000_000
    elif multiplicador_str == 'mil' or multiplicador_str == 'k': multiplicador = 1_000
    elif multiplicador_str == 'bi': multiplicador = 1_000_000_000
        
    # Limpa a pontuação (Brasil: 5.000 ou 50,3) para que o Python consiga calcular
    numero_str = numero_str.replace(".", "").replace(",", ".")
    
    try:
        # Multiplica e devolve formatado
        valor = int(float(numero_str) * multiplicador)
        valor_fmt = f"{valor:,}".replace(",", ".")
        return valor, f"{valor_fmt}"
    except ValueError:
        return 0, "0"
# =========================================================================

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

# --- NEW FUNCTION: FOLLOW ACTION ---
def realizar_acao_seguir(driver):
    """
    Attempts to locate and click the 'Follow' button.
    """
    try:
        # 1. Check if already following or requested
        if len(driver.find_elements(By.XPATH, "//button[.//div[text()='Seguindo']]")) > 0:
            return "Already following"
        if len(driver.find_elements(By.XPATH, "//button[.//div[text()='Solicitado']]")) > 0:
            return "Request already pending"

        # 2. Try to find "Follow" or "Follow Back" button
        xpath_botao = "//button[.//div[text()='Seguir'] or .//div[text()='Seguir de volta']]"
        botoes = driver.find_elements(By.XPATH, xpath_botao)

        if len(botoes) > 0:
            botoes[0].click()
            sleep_seguro(2) # Modificado para aceitar cancelamento
            
            # Post-click verification
            if len(driver.find_elements(By.XPATH, "//button[.//div[text()='Solicitado']]")) > 0:
                return "Request Sent (Private)"
            elif len(driver.find_elements(By.XPATH, "//button[.//div[text()='Seguindo']]")) > 0:
                return "Followed Successfully"
            else:
                return "Clicked (Status Unknown)"
        
        return "Follow button not found"
    except Exception as e:
        if "CANCELADO_PELO_USUARIO" in str(e): raise e # Garante que o erro de cancelar suba
        return f"Error following: {str(e)}"

# --- NEW FUNCTION: EXTRAÇÃO FORÇA-BRUTA DE SEGUIDORES ---
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
    # A inicialização do estado de cancelamento mudou para o endpoint de lote
    
    USUARIO = config.usuario
    SENHA = config.senha
    DELAY = config.tempo_espera
    
    PERFIL_ALVO = f"https://www.instagram.com/{config.alvo}/"
    STORY_ALVO = f"https://www.instagram.com/stories/{config.alvo}/"

    chrome_options = Options()
    chrome_options.add_argument("--lang=pt-BR") # Important for finding "Seguir" text
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-notifications")
    
    if config.modo_oculto:
        chrome_options.add_argument("--headless=new")
    
    driver = webdriver.Chrome(options=chrome_options)

    # NOVO: Adicionado "seguidores_matematica" ao estado inicial
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
        # --- 1. LOGIN ---
        print(f"[*] Starting login: {USUARIO}")
        driver.get("https://www.instagram.com/")
        sleep_seguro(DELAY) 

        try: driver.find_element(By.NAME, "username").send_keys(USUARIO)
        except: driver.find_element(By.NAME, "email").send_keys(USUARIO)
        sleep_seguro(2)

        try: driver.find_element(By.NAME, "password").send_keys(SENHA)
        except: driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(SENHA)
        sleep_seguro(2)

        try: driver.find_element(By.XPATH, "//*[text()='Entrar']").click()
        except: driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        sleep_seguro(DELAY * 2) 

        try:
            driver.find_element(By.XPATH, "//div[@role='button' and text()='Agora não']").click()
            sleep_seguro(DELAY)
        except: pass

        print("[+] Login complete.")

        # --- 2. ACCESS PROFILE ---
        print(f"[*] Accessing profile: {config.alvo}")
        driver.get(PERFIL_ALVO)
        sleep_seguro(DELAY + 1)

        # --- NOVO: PEGA OS SEGUIDORES IMEDIATAMENTE APÓS ABRIR O PERFIL ---
        resultado["seguidores"] = extrair_seguidores_robusto(driver)
        
        # --- ATUALIZADO: Salva a matemática dos seguidores usando a função já existente ---
        # Se retornar "N/A" (por erro ou perfil muito novo), tratamos para não quebrar.
        try:
             valor_int_seguidores, _ = analisar_curtidas(resultado["seguidores"])
             resultado["seguidores_matematica"] = valor_int_seguidores if isinstance(valor_int_seguidores, int) else 0
        except:
             resultado["seguidores_matematica"] = 0
             
        print(f"[+] Followers found: {resultado['seguidores']} (Matemática: {resultado['seguidores_matematica']})")

        # --- 2.1 FOLLOW LOGIC ---
        if config.seguir_alvo:
            print("[*] Attempting to follow target...")
            status_follow = realizar_acao_seguir(driver)
            print(f"[+] Follow Result: {status_follow}")
            resultado["status_seguir"] = status_follow

        # --- 2.2 PRIVACY CHECK ---
        if verificar_perfil_privado(driver):
            print(f"[!] BLOCK: Profile {config.alvo} is PRIVATE and you are not following.")
            
            resultado["privado"] = True
            resultado["acessivel"] = False
            resultado["status"] = "Profile Private and Blocked"
            
            driver.quit()
            return resultado 
        
        print("[+] Profile Public or Following. Continuing...")

        # --- 4. FEED ANALYSIS ---
        if config.coletar_feed:
            print(f"\n[*] Feed (Fetching {config.limite_posts} posts)...")
            sleep_seguro(3)
            xpath_posts = "//a[contains(@href, '/p/') or contains(@href, '/reel/')]"
            
            candidatos = []
            tentativas_grade = 0
            while tentativas_grade < 3:
                sleep_seguro(0.5)
                candidatos = driver.find_elements(By.XPATH, xpath_posts)
                if len(candidatos) > 0:
                    print(f"[+] {len(candidatos)} posts found in grid.")
                    break
                else:
                    print(f"[*] Waiting for grid... ({tentativas_grade+1}/3)")
                    sleep_seguro(2.5)
                    tentativas_grade += 1
            
            if len(candidatos) == 0:
                print("[-] Feed empty.")

            posts_coletados = 0
            
            for i in range(len(candidatos)):
                sleep_seguro(0.5)
                if posts_coletados >= config.limite_posts: break
                
                candidatos = driver.find_elements(By.XPATH, xpath_posts)
                if i >= len(candidatos): break
                post_atual = candidatos[i]
                
                # --- Pega o link do post (NOVO) ---
                url_do_post = post_atual.get_attribute("href")

                fixado = eh_post_fixado(post_atual)
                
                tipo_post = "FOTO/CARROSSEL"
                try:
                    if "/reel/" in post_atual.get_attribute("href"):
                        tipo_post = "VIDEO (REEL)"
                except: pass

                try:
                    # Click and Open
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", post_atual)
                    sleep_seguro(1)
                    
                    # TIRA A FOTO DA MINIATURA ANTES DE CLICAR (Para evitar o bug do print vazio)
                    timestamp = int(datetime.now().timestamp())
                    nome_print = f"{config.alvo}_post_{posts_coletados+1}_{timestamp}.png"
                    caminho_print = os.path.join(PASTA_PRINTS, nome_print)
                    url_print = None
                    try:
                        post_atual.screenshot(caminho_print)
                        url_print = f"http://127.0.0.1:8000/fotos/{nome_print}"
                    except: pass
                    
                    # Agora sim clica e abre o post
                    driver.execute_script("arguments[0].click();", post_atual)
                    
                    # =========================================================================
                    # --- ESPERA INTELIGENTE (WEBDRIVER WAIT) ---
                    # Monitora ate 10s pelo carregamento do video, foto ou data na janela aberta
                    try:
                        xpath_espera = "//article[@role='presentation']//time | //article[@role='presentation']//video | //article[@role='presentation']//div[contains(@class, '_aagv')]"
                        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, xpath_espera)))
                        sleep_seguro(1.5) # Pausa minima de seguranca pos-renderizacao
                    except Exception:
                        print(f"[*] AVISO: Tempo limite excedido ao carregar midia. Fallback acionado.")
                        sleep_seguro(DELAY)
                    # =========================================================================
                    
                    # =========================================================================
                    # --- EXTRAÇÃO DE TEXTO PARA ACHAR AS CURTIDAS (ISOLADO PARA O POST) ---
                    texto_extraido = ""
                    try:
                        # Prioridade 1: Link direto de curtidas DENTRO do post principal (ignora comentarios)
                        links_liked = driver.find_elements(By.XPATH, "//article[@role='presentation']//a[contains(@href, 'liked_by')]")
                        if len(links_liked) > 0:
                            # textContent força a leitura de spans ocultos (como o &nbsp;)
                            texto_extraido = driver.execute_script("return arguments[0].textContent;", links_liked[-1])
                        else:
                            # Prioridade 2: Textos de like escondidos, forçando buscar só no ARTICLE do post
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
                    # =========================================================================
                    
                    # Usa nossa função blindada lá do topo
                    valor_int, val_curtidas = analisar_curtidas(texto_extraido)
                    data_real = extrair_data_post(driver)

                    # --- COMMENTS EXTRACTION ---
                    comentarios_list = []
                    comentarios_vistos = set() 
                    
                    if config.qtd_comentarios > 0:
                        try:
                            blocos_comentarios = driver.find_elements(By.XPATH, "//ul/li | //ul/div")
                            itens_para_raspar = blocos_comentarios[1:] if len(blocos_comentarios) > 1 else blocos_comentarios
                            
                            for bloco in itens_para_raspar:
                                sleep_seguro(0.1) 
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

                    print(f"> {tipo_post} #{posts_coletados+1}: {val_curtidas} | {data_real} | Pinned: {fixado}")
                    
                    resultado["feed_posts"].append({
                        "posicao": posts_coletados + 1,
                        "url_post": url_do_post, # NOVO CAMPO: Link do post
                        "tipo": tipo_post,
                        "fixado": fixado,
                        "data": data_real,
                        "curtidas": val_curtidas,
                        "curtidas_matematica": valor_int, # NOVO CAMPO: Curtidas pro banco
                        "texto_original": texto_extraido,
                        "comentarios": comentarios_list if config.qtd_comentarios > 0 else None,
                        "print_post": url_print
                    })
                    
                    posts_coletados += 1 
                    driver.back()
                    sleep_seguro(2) 
                except Exception as e:
                    if "CANCELADO_PELO_USUARIO" in str(e): raise e
                    driver.back(); sleep_seguro(2)
        else:
            print("\n[*] Skipping Feed (coletar_feed=False).")

        # --- 5. STORIES (CONDITIONAL) ---
        if config.coletar_stories:
            print("\n[*] Stories...")
            driver.get(STORY_ALVO)
            sleep_seguro(DELAY + 1)
            
            try:
                driver.find_element(By.XPATH, "//div[@role='button' and contains(., 'Ver story')]").click()
                sleep_seguro(DELAY)
            except: pass 

            if driver.current_url == PERFIL_ALVO:
                print("[-] No stories.")
            else:
                print("[+] Extracting stories...")
                stories_sessao = 0
                while True:
                    sleep_seguro(0.5)
                    stories_sessao += 1
                    
                    total_stories_dia = "?"
                    try:
                        container = driver.find_element(By.CSS_SELECTOR, "div.x1ned7t2.x78zum5")
                        barras = container.find_elements(By.XPATH, "./div")
                        total_stories_dia = len(barras)
                    except: pass

                    tempo = "N/A"; midia = "FOTO"
                    try:
                        if driver.find_elements(By.TAG_NAME, "time"): tempo = driver.find_elements(By.TAG_NAME, "time")[0].text
                        if len(driver.find_elements(By.TAG_NAME, "video")) > 0: midia = "VIDEO"
                    except: pass

                    print(f"> Story {stories_sessao} | {midia}")
                    resultado["stories"].append({"numero": stories_sessao, "tipo": midia, "tempo": tempo})

                    navegou = False
                    tentativas = 0
                    while tentativas < 3:
                        try:
                            driver.find_element(By.XPATH, "//*[@aria-label='Avançar' or @aria-label='Next']").click()
                            sleep_seguro(2)
                            if config.alvo.lower() not in driver.current_url.lower():
                                navegou = True; break
                            navegou = True; break
                        except: sleep_seguro(1); tentativas += 1
                    
                    if not navegou or (config.alvo.lower() not in driver.current_url.lower()): break
        else:
            print("\n[*] Skipping Stories (coletar_stories=False).")

    except Exception as e:
        if "CANCELADO_PELO_USUARIO" in str(e):
            print("[!] MISSÃO CANCELADA PELO USUÁRIO.")
            resultado["status"] = "Interrompido manualmente"
        else:
            print(f"[!] Error: {e}")
            resultado["status"] = f"Error: {str(e)}"
    finally:
        driver.quit()
        return resultado 

# =========================================================================
# --- INICIALIZAÇÃO DO PAINEL (FRONTEND) ---
# =========================================================================
@app.on_event("startup")
async def iniciar_painel():
    """Gatilho que abre o navegador sozinho quando o Uvicorn liga."""
    print("INFO: Iniciando painel no navegador padrao...")
    # Aguarda 1 segundinho para dar tempo do servidor subir totalmente
    sleep(1) 
    webbrowser.open("http://127.0.0.1:8000")

@app.get("/")
async def painel_html():
    """Hospeda o index.html na raiz da API."""
    caminho_html = os.path.join(DIRETORIO_BASE, "index.html")
    if os.path.exists(caminho_html):
        return FileResponse(caminho_html)
    return {"erro": "Arquivo index.html nao encontrado na pasta do projeto."}

# =========================================================================
# --- ENDPOINTS ATUALIZADOS PARA EXECUÇÃO EM LOTE E BANCO DE DADOS ---
# =========================================================================
@app.post("/executar_bot")
async def executar_bot(request: ConfigBot):
    # Reinicia o status de cancelamento ao iniciar uma nova leva
    estado_robo["cancelar"] = False 
    
    # Processa a string de alvos (separa por vírgula e remove espaços), limitando a 3
    alvos_brutos = request.alvo.replace(";", ",").split(",")
    alvos_lista = [a.strip() for a in alvos_brutos if a.strip()][:3]
    
    resultados_em_lote = []
    
    for perfil_atual in alvos_lista:
        # Verifica cancelamento antes de abrir o próximo perfil
        if estado_robo["cancelar"]:
            break
            
        print(f"\n=========================================")
        print(f"[*] INICIANDO PERFIL LOTE: {perfil_atual}")
        print(f"=========================================\n")
        
        # Sobrescreve o alvo da requisição atual pelo perfil do loop
        request.alvo = perfil_atual
        
        # Executa a função principal (abre Chrome, processa, fecha Chrome)
        resultado = rodar_robo(request)
        resultados_em_lote.append(resultado)
        
        # Checa novamente após a execução
        if estado_robo["cancelar"]:
            break
            
    # Salva toda a operacao no SQLite antes de enviar para o frontend
    database.salvar_lote(resultados_em_lote)
    
    # Retorna o array de resultados
    return {"resultados": resultados_em_lote}

@app.post("/cancelar_bot")
async def cancelar_bot():
    estado_robo["cancelar"] = True
    return {"status": "Sinal de cancelamento enviado com sucesso!"}

# --- NOVO: ENDPOINT PARA BUSCAR ESTATÍSTICAS PARA O GRÁFICO ---
@app.get("/estatisticas/ultimo_lote")
async def estatisticas_ultimo_lote():
    """Retorna os dados do último lote processado com cálculo de engajamento."""
    dados = database.buscar_ultimo_lote_com_engajamento()
    if not dados:
        return {"erro": "Nenhum dado encontrado no banco."}
    
    return {"dados": dados}