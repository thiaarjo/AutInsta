import traceback
from core.celery_app import celery_app
import database
import ig_poster_selenium

@celery_app.task(bind=True, name="run_instagram_poster")
def run_instagram_poster_task(self, string_caminhos: str, legenda: str, post_id: int):
    """
    Executa a publicação de mídia no Instagram via automação Selenium
    em um Worker isolado do Celery, tirando o peso da API FastAPI.
    """
    try:
        # Usamos o task_id do celery apenas para referência futura
        celery_task_id = self.request.id
        self.update_state(state='PROGRESS', meta={'progresso': 10, 'mensagem': f'Iniciando Selenium para o Post {post_id}...'})
        
        # Chama a função de postagem principal
        sucesso = ig_poster_selenium.publicar_no_instagram_local(string_caminhos, legenda, post_id=post_id)
        
        if sucesso:
            database.atualizar_status_post(post_id, 'PUBLICADO')
            self.update_state(state='SUCCESS', meta={'progresso': 100, 'mensagem': 'Post publicado!'})
            return {"status": "success", "post_id": post_id}
        else:
            database.atualizar_status_post(post_id, 'ERRO')
            self.update_state(state='FAILURE', meta={'progresso': 0, 'mensagem': 'Erro ao tentar publicar.'})
            raise Exception(f"Falha na automação do post {post_id}.")
            
    except Exception as e:
        erro_str = traceback.format_exc()
        database.atualizar_status_post(post_id, 'ERRO')
        # Garante que um log de ERRO seja inserido no banco para o frontend parar o loading
        database.inserir_log_postagem(post_id, "ERRO", f"Falha crítica na Task: {str(e)}")
        self.update_state(state="FAILURE", meta={"exc_type": type(e).__name__, "exc_message": str(e), "erro": erro_str})
        raise e
