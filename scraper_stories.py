import os
from datetime import datetime
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from config import PASTA_PRINTS
from utils import sleep_seguro, atualizar_status
from database import buscar_print_story_existente


def _extrair_media_url(driver):
    """
    Extrai a URL da mídia (src) do story em exibição.
    Retorna (media_url, tipo_midia) ou (None, tipo_midia).
    Essa URL serve como identificador único do story para deduplicação.
    """
    tipo_midia = "FOTO"

    try:
        # Detecta se é vídeo ou foto
        videos = driver.find_elements(By.TAG_NAME, "video")
        if len(videos) > 0:
            tipo_midia = "VIDEO"
            # Extrai src do <video> ou do <source> filho
            try:
                src = videos[0].get_attribute("src")
                if not src:
                    sources = videos[0].find_elements(By.TAG_NAME, "source")
                    if sources:
                        src = sources[0].get_attribute("src")
                if src:
                    return src, tipo_midia
            except:
                pass
        else:
            # Tenta extrair src de <img> do story
            try:
                img = driver.find_element(By.XPATH,
                    "//img[@draggable='false' and contains(@style, 'object-fit')]"
                )
                src = img.get_attribute("src")
                if src:
                    return src, tipo_midia
            except:
                pass

            try:
                imgs = driver.find_elements(By.XPATH, 
                    "//section//img[not(contains(@alt, 'profile'))]"
                )
                for img in imgs:
                    tamanho = img.size
                    if tamanho.get("height", 0) > 300:
                        src = img.get_attribute("src")
                        if src:
                            return src, tipo_midia
            except:
                pass

    except Exception as e:
        if "CANCELADO_PELO_USUARIO" in str(e):
            raise e

    return None, tipo_midia


def _capturar_print_story(driver, alvo, numero_story, task_id):
    """
    Localiza a tag HTML principal da mídia do story em exibição
    e tira um screenshot isolado (sem pegar a interface ao redor).
    Retorna (url_print, tipo_midia) ou (None, tipo_midia) em caso de falha.
    """
    tipo_midia = "FOTO"

    try:
        # Detecta se é vídeo ou foto
        videos = driver.find_elements(By.TAG_NAME, "video")
        if len(videos) > 0:
            tipo_midia = "VIDEO"

        # Estratégia 1: Tenta capturar o container do player de vídeo (aria-label="Video player")
        # ou a imagem principal do story (role="img" dentro da seção de stories)
        elemento_midia = None

        if tipo_midia == "VIDEO":
            # Para vídeos: busca o container pai do <video> que funciona como player
            try:
                elemento_midia = driver.find_element(By.XPATH,
                    "//div[@aria-label='Video player' or @aria-label='Reprodutor de vídeo']"
                )
            except:
                # Fallback: pega o próprio elemento <video>
                try:
                    elemento_midia = videos[0]
                except:
                    pass
        else:
            # Para fotos: busca a <img> principal do story (geralmente tem role="presentation" 
            # ou está dentro de uma seção específica com dimensões de tela cheia)
            try:
                elemento_midia = driver.find_element(By.XPATH,
                    "//img[@draggable='false' and contains(@style, 'object-fit')]"
                )
            except:
                try:
                    # Fallback: busca qualquer img grande dentro do container de stories
                    imgs = driver.find_elements(By.XPATH, 
                        "//section//img[not(contains(@alt, 'profile'))]"
                    )
                    # Filtra por imagens grandes (stories são fullscreen)
                    for img in imgs:
                        tamanho = img.size
                        if tamanho.get("height", 0) > 300:
                            elemento_midia = img
                            break
                except:
                    pass

        if elemento_midia is None:
            # Último recurso: tenta capturar a <section> inteira que envelopa o story
            try:
                elemento_midia = driver.find_element(By.XPATH, 
                    "//section[.//video or .//img[@draggable='false']]"
                )
            except:
                return None, tipo_midia

        # Gera nome único e salva o print
        timestamp = int(datetime.now().timestamp())
        nome_print = f"{alvo}_story_{numero_story}_{timestamp}.png"
        caminho_print = os.path.join(PASTA_PRINTS, nome_print)

        elemento_midia.screenshot(caminho_print)
        url_print = f"/fotos/{nome_print}"
        return url_print, tipo_midia

    except Exception as e:
        if "CANCELADO_PELO_USUARIO" in str(e):
            raise e
        print(f"[STORIES] Falha ao capturar print do story {numero_story}: {e}", flush=True)
        return None, tipo_midia


def extrair_stories_perfil(driver, config, task_id, resultado):
    """
    Função dedicada para extrair stories de um perfil.
    Recebe o driver Selenium já logado e navega para a URL de stories do alvo.
    Preenche resultado["stories"] com os dados coletados incluindo prints.
    Usa deduplicação baseada em media_url para evitar screenshots repetidos.
    """
    DELAY = config.tempo_espera
    STORY_ALVO = f"https://www.instagram.com/stories/{config.alvo}/"
    PERFIL_ALVO = f"https://www.instagram.com/{config.alvo}/"

    atualizar_status(task_id, 85, "Acessando Stories Ativos...")
    driver.get(STORY_ALVO)
    sleep_seguro(DELAY + 1, task_id)

    # Tenta clicar no botão "Ver story" se aparecer
    try:
        driver.find_element(By.XPATH, "//div[@role='button' and contains(., 'Ver story')]").click()
        sleep_seguro(DELAY, task_id)
    except:
        pass

    # Verifica se realmente estamos na página de stories (e não fomos redirecionados pro perfil)
    if driver.current_url == PERFIL_ALVO:
        atualizar_status(task_id, 95, "Nenhum story ativo encontrado.")
        return

    stories_sessao = 0
    while True:
        sleep_seguro(0.5, task_id)
        stories_sessao += 1
        atualizar_status(task_id, 85 + min(10, stories_sessao), f"Lendo Story {stories_sessao}...")

        # Extrai tempo de publicação
        tempo = "N/A"
        try:
            elementos_time = driver.find_elements(By.TAG_NAME, "time")
            if elementos_time:
                tempo = elementos_time[0].text
        except:
            pass

        # DEDUPLICAÇÃO: Extrai a URL da mídia para identificar o story
        media_url, tipo_midia = _extrair_media_url(driver)

        # Verifica se já temos um print salvo para essa media_url
        url_print = None
        if media_url:
            print_existente = buscar_print_story_existente(config.alvo, media_url)
            if print_existente:
                url_print = print_existente
                print(f"[STORIES] ♻️ Reutilizando print existente para story {stories_sessao} (@{config.alvo})", flush=True)

        # Se não encontrou print existente, captura um novo
        if url_print is None:
            url_print, tipo_midia = _capturar_print_story(driver, config.alvo, stories_sessao, task_id)
            if url_print:
                print(f"[STORIES] 📸 Novo print capturado para story {stories_sessao} (@{config.alvo})", flush=True)

        resultado["stories"].append({
            "numero": stories_sessao,
            "tipo": tipo_midia,
            "tempo": tempo,
            "caminho_imagem": url_print,
            "media_url": media_url
        })

        # Tenta navegar para o próximo story
        navegou = False
        tentativas = 0
        while tentativas < 3:
            try:
                driver.find_element(By.XPATH, "//*[@aria-label='Avançar' or @aria-label='Next']").click()
                sleep_seguro(2, task_id)
                if config.alvo.lower() not in driver.current_url.lower():
                    navegou = True
                    break
                navegou = True
                break
            except:
                sleep_seguro(1, task_id)
                tentativas += 1

        if not navegou or (config.alvo.lower() not in driver.current_url.lower()):
            break
