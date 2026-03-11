import os
import traceback
from core.celery_app import celery_app
from config import ConfigBot, gerenciador_tarefas
from scraper import rodar_robo
import database

@celery_app.task(bind=True, name="run_scraper_bot")
def run_scraper_bot_task(self, alvo: str, senha: str, usuario: str, limites: dict):
    """
    Wrapper assíncrono para rodar_robo via Celery.
    Isola a execução do Selenium em um Processo/Thread do Worker.
    """
    task_id = self.request.id
    
    # Criamos o objeto de configuração que o bot espera
    config = ConfigBot(
        usuario=usuario,
        senha=senha,
        alvo=alvo,
        task_id=task_id,
        tempo_espera=limites.get("delay", 4),
        limite_posts=limites.get("posts", 5),
        limite_seguidores=limites.get("seguidores", 20),
        coletar_feed=limites.get("coletar_feed", True),
        coletar_stories=limites.get("coletar_stories", True),
        seguir_alvo=limites.get("seguir_alvo", True),
        modo_oculto=limites.get("modo_invisivel", True),
        qtd_comentarios=limites.get("qtd_comentarios", 0)
    )

    # O `atualizar_status` nativo agora aceita `celery_task` e grava via self.update_state no Redis.
        
    try:
        # Iniciamos o dicionário da tarefa para compatibilidade local também
        gerenciador_tarefas[task_id] = {"cancelar": False, "pid": None, "progresso": 0, "mensagem": "Iniciando Celery..."}
        
        # Passamos `self` (a task do Celery) para que o scraper consiga gravar progresso no Redis
        resultado = rodar_robo(config, celery_task=self)
        
        # Salva os dados extraídos no banco de dados SQLite
        # para que apareçam na aba de Relatórios & Gráficos
        if resultado and resultado.get("status") != "Interrompido manualmente":
            database.salvar_lote([resultado])
            print(f"[DB] Dados do perfil @{alvo} salvos no banco com sucesso.", flush=True)
        
        return {"status": "success", "resultado": resultado}
    
    except Exception as e:
        erro_str = traceback.format_exc()
        # Caso ocorra erro ou seja cancelado
        self.update_state(state="FAILURE", meta={"exc_type": type(e).__name__, "exc_message": str(e), "erro": erro_str})
        raise e
