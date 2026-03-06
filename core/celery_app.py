import os
from celery import Celery

# Redis URL (Pode ser ajustado por variável de ambiente depois)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Cria e configura o app Celery
celery_app = Celery(
    "autinsta_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks.bot_tasks", "tasks.post_tasks"] # Aqui vamos listar os arquivos que contém tarefas @celery.task
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
    # Configurações para garantir que o worker não morra por travamento do Selenium
    worker_max_tasks_per_child=1, 
    task_track_started=True,
    task_time_limit=3600, # Max 1 hora por tarefa 
)
