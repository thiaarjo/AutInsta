import os
import uuid
from pydantic import BaseModel, Field

# Diretorios base
DIRETORIO_BASE = os.path.dirname(os.path.abspath(__file__))
PASTA_PRINTS = os.path.join(DIRETORIO_BASE, "prints_instagram")
os.makedirs(PASTA_PRINTS, exist_ok=True)

# Gerenciador de Tarefas
gerenciador_tarefas = {}

# Configuration Model
class ConfigBot(BaseModel):
    # Recebe o ID único gerado pelo Frontend para amarrar a barra de progresso
    task_id: str = Field("default", description="ID isolado gerado pelo frontend")
    
    alvo: str = Field(..., description="Target profiles separated by comma (max 3)")
    usuario: str = Field(..., description="Your Instagram username")
    senha: str = Field(..., description="Your Instagram password")
    
    # System Configs
    tempo_espera: int = Field(4, description="Base delay in seconds")
    modo_oculto: bool = Field(False, description="Run in headless mode")
    
    # Action Configs
    seguir_alvo: bool = Field(False, description="Set to True to follow the target")
    
    # Scraping Modules
    coletar_feed: bool = Field(True, description="Set to True to scrape feed posts")
    
    # Configuracoes de Limite
    limite_posts: int = Field(3, ge=1, le=10, description="Number of posts to fetch (Máximo 10)")
    qtd_comentarios: int = Field(0, ge=0, le=10, description="Number of comments to fetch per post (Máximo 10)")
    
    coletar_stories: bool = Field(True, description="Set to True to scrape stories")