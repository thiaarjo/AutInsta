import os
import requests

# =========================================================================
# CREDENCIAIS DA META (FACEBOOK / INSTAGRAM)
# =========================================================================
# Substitua estas variáveis quando gerar o Token e pegar o ID da conta
ACCESS_TOKEN = "COLE_SEU_TOKEN_AQUI_QUANDO_TIVER"
INSTAGRAM_ACCOUNT_ID = "ID_DA_CONTA_AQUI"
GRAPH_API_VERSION = "v19.0"

def publicar_no_instagram(caminho_imagem_local: str, legenda: str) -> bool:
    """
    Simula ou executa o envio de uma publicação para a API Oficial da Meta.
    """
    print("\n---------------------------------------------------")
    print("[Meta API] Iniciando rotina de publicação oficial...")
    print(f"[Meta API] Arquivo alvo: {caminho_imagem_local}")
    print(f"[Meta API] Legenda: '{legenda}'")
    
    # ---------------------------------------------------------
    # MODO DE SIMULAÇÃO (Enquanto aguarda aprovação da Meta)
    # ---------------------------------------------------------
    if ACCESS_TOKEN == "COLE_SEU_TOKEN_AQUI_QUANDO_TIVER":
        print("[Meta API] AVISO: Token real não detectado.")
        print("[Meta API] STATUS: Operando em MODO DE SIMULAÇÃO.")
        print("[Meta API] Nenhuma requisição externa foi feita aos servidores da Meta.")
        print("---------------------------------------------------\n")
        # Retorna True para avisar ao banco de dados que ele pode dar baixa na fila
        return True

    # ---------------------------------------------------------
    # MODO DE PRODUÇÃO (Código real para quando tiver o Token)
    # ---------------------------------------------------------
    try:
        # NOTA DE ARQUITETURA: 
        # A Meta exige uma URL pública. No ambiente de produção, 
        # 'caminho_imagem_local' precisará ser convertido para uma URL 
        # acessível externamente (ex: https://seu-dominio.com/uploads/foto.jpg)
        url_publica_imagem = "SUBSTITUIR_PELA_SUA_URL_PUBLICA" 
        
        # Etapa 1: Criar o Container de Mídia nos servidores da Meta
        url_container = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{INSTAGRAM_ACCOUNT_ID}/media"
        payload_container = {
            "image_url": url_publica_imagem,
            "caption": legenda,
            "access_token": ACCESS_TOKEN
        }
        
        print("[Meta API] Solicitando criação de container de mídia...")
        resposta_container = requests.post(url_container, data=payload_container)
        dados_container = resposta_container.json()
        
        if "id" not in dados_container:
            print(f"[Meta API] ERRO ao criar container: {dados_container}")
            return False
            
        creation_id = dados_container["id"]
        print(f"[Meta API] Container criado com sucesso. ID: {creation_id}")
        
        # Etapa 2: Publicar efetivamente o Container no Feed
        url_publish = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{INSTAGRAM_ACCOUNT_ID}/media_publish"
        payload_publish = {
            "creation_id": creation_id,
            "access_token": ACCESS_TOKEN
        }
        
        print("[Meta API] Solicitando publicação no feed...")
        resposta_publish = requests.post(url_publish, data=payload_publish)
        dados_publish = resposta_publish.json()
        
        if "id" in dados_publish:
            print(f"[Meta API] SUCESSO ABSOLUTO! Postagem online. ID do Post: {dados_publish['id']}")
            print("---------------------------------------------------\n")
            return True
        else:
            print(f"[Meta API] ERRO ao publicar: {dados_publish}")
            return False
            
    except Exception as e:
        print(f"[Meta API] FALHA CRÍTICA DE CONEXÃO: {e}")
        return False