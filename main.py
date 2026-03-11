import os
import shutil
import webbrowser
import asyncio
import csv
import io
import glob
from time import sleep
from datetime import datetime
from typing import List
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
import ig_poster_selenium

# Scheduler
from apscheduler.schedulers.background import BackgroundScheduler

# Modulos locais
import database
from config import ConfigBot, DIRETORIO_BASE, PASTA_PRINTS, gerenciador_tarefas

# Celery
from celery.result import AsyncResult
from core.celery_app import celery_app
from tasks.bot_tasks import run_scraper_bot_task
from tasks.post_tasks import run_instagram_poster_task

# Diretorio de uploads
PASTA_UPLOADS = os.path.join(DIRETORIO_BASE, "uploads_postagens")
os.makedirs(PASTA_UPLOADS, exist_ok=True)

# API Config
app = FastAPI(title="API Instagram Monitor V30 (Modularizado)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/fotos", StaticFiles(directory=PASTA_PRINTS), name="fotos")
app.mount("/uploads", StaticFiles(directory=PASTA_UPLOADS), name="uploads")
# Serve o build do React (Vite) 
REACT_DIST = os.path.join(DIRETORIO_BASE, "frontend-react", "dist")
if os.path.isdir(os.path.join(REACT_DIST, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(REACT_DIST, "assets")), name="react-assets")
# Manter mount legado para compatibilidade durante a transição
if os.path.isdir("frontend"):
    app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

# Background Scheduler
def verificar_fila_postagens():
    agora_formatado = datetime.now().strftime('%H:%M:%S')
    pendentes = database.buscar_posts_pendentes()
    
    if pendentes:
        print(f"\n[{agora_formatado}] [SCHEDULER] Encontrei {len(pendentes)} post(s) na fila.", flush=True)
        
        for post in pendentes:
            post_id, caminho_foto, legenda, data_agendada = post
            print(f"[*] Repassando disparo para o Celery -> ID: {post_id} | Data Marcada: {data_agendada}", flush=True)
            
            # Marca como PUBLICANDO para evitar duplo disparo
            database.atualizar_status_post(post_id, 'PUBLICANDO')
            
            # Envia para a Fila do Celery
            run_instagram_poster_task.delay(caminho_foto, legenda, post_id)
            
            print(f"[+] Post {post_id} enviado para o Worker.\n", flush=True)

agendador = BackgroundScheduler()
agendador.add_job(verificar_fila_postagens, 'interval', minutes=1)

# Startup / Shutdown Hooks
@app.on_event("startup")
async def iniciar_painel():
    print("\n[INFO] IG Monitor iniciado.")
    print("[INFO] Painel: http://localhost:8000\n", flush=True)
    
    agendador.start()
    print("[*] Vigia de postagens ativado (Rodando a cada 1 minuto).", flush=True)
    sleep(1.5) 
    webbrowser.open("http://localhost:8000")

@app.on_event("shutdown")
async def desligar_servidor():
    agendador.shutdown()
    print("[*] Vigia de postagens desligado.", flush=True)

@app.get("/")
async def painel_html():
    # Primeiro tenta servir o build React
    caminho_react = os.path.join(REACT_DIST, "index.html")
    # Fallback para o index.html legado
    caminho_legado = os.path.join(DIRETORIO_BASE, "index.html")
    
    caminho_html = caminho_react if os.path.exists(caminho_react) else caminho_legado
    
    if os.path.exists(caminho_html):
        with open(caminho_html, "r", encoding="utf-8") as arquivo:
            html_conteudo = arquivo.read()
        return HTMLResponse(
            content=html_conteudo, 
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    else:
        return HTMLResponse(content=f"<h1>ERRO 404: index.html não encontrado!</h1><p>Execute 'npm run build' dentro de frontend-react/ ou verifique a pasta: <b>{DIRETORIO_BASE}</b></p>")

# Rota de Publicação Imediata (Selenium via Celery)
@app.post("/api/publicar_agora")
async def publicar_agora(
    midias: List[UploadFile] = File(...),
    legenda: str = Form("")
):
    try:
        print(f"\n[*] Solicitação de PUBLICAÇÃO IMEDIATA recebida. Repassando ao Celery Worker...", flush=True)
        
        if not midias or len(midias) == 0:
            raise HTTPException(status_code=400, detail="Nenhuma imagem enviada.")
        
        caminhos_salvos = []
        for index, midia in enumerate(midias):
            if midia and midia.filename:
                # Add index to avoid name collision Se o autor da foto subir 2 iguais
                nome_seguro = f"{int(datetime.now().timestamp())}_{index}_{midia.filename}"
                caminho_arquivo = os.path.join(PASTA_UPLOADS, nome_seguro)
                with open(caminho_arquivo, "wb") as buffer:
                    shutil.copyfileobj(midia.file, buffer)
                caminhos_salvos.append(caminho_arquivo)
                print(f"[+] Imagem/Vídeo {index+1} salvo localmente: {caminho_arquivo}", flush=True)
        
        string_caminhos = ",".join(caminhos_salvos)

        # Registra no BD como 'PUBLICANDO' para ter onde atrelar os logs
        data_agora = datetime.now().strftime("%Y-%m-%dT%H:%M")
        post_id = database.agendar_novo_post(string_caminhos, legenda, data_agora)
        database.atualizar_status_post(post_id, 'PUBLICANDO')
        
        # Cria e Executa a Tarefa Assíncrona via Celery
        run_instagram_poster_task.delay(string_caminhos, legenda, post_id)
        
        return {"status": "Publicação enfileirada no Worker! Acompanhe os logs.", "sucesso": True, "post_id": post_id}
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"[!] Erro ao enfileirar publicação imediata: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

# Rotas de Agendamento
@app.post("/api/agendar")
async def receber_agendamento(
    midias: List[UploadFile] = File(None), 
    legenda: str = Form(""),
    data_agendada: str = Form("")
):
    try:
        print(f"\n[*] Recebendo nova solicitação de agendamento/rascunho...", flush=True)
        
        # Validação de data no passado
        if data_agendada:
            try:
                dt = datetime.strptime(data_agendada, "%Y-%m-%dT%H:%M")
                if dt < datetime.now().replace(second=0, microsecond=0):
                    raise HTTPException(status_code=400, detail="Não é possível agendar para uma data no passado.")
            except ValueError:
                pass
        
        caminhos_salvos = []
        if midias:
            for index, midia in enumerate(midias):
                if midia and midia.filename:
                    nome_seguro = f"{int(datetime.now().timestamp())}_{index}_{midia.filename}"
                    caminho_arquivo = os.path.join(PASTA_UPLOADS, nome_seguro)
                    with open(caminho_arquivo, "wb") as buffer:
                        shutil.copyfileobj(midia.file, buffer)
                    caminhos_salvos.append(caminho_arquivo)
                    print(f"[+] Imagem/Vídeo {index+1} salvo em: {caminho_arquivo}", flush=True)
            
        string_caminhos = ",".join(caminhos_salvos)
            
        database.agendar_novo_post(string_caminhos, legenda, data_agendada if data_agendada else None)
        return {"status": "Postagem agendada/salva como rascunho com sucesso!"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[!] Erro ao processar agendamento: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agendamentos")
async def listar_agendamentos():
    try:
        dados = database.buscar_todos_agendamentos()
        return {"agendamentos": dados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/agendamentos/{post_id}")
async def excluir_agendamento(post_id: int):
    try:
        database.excluir_agendamento(post_id)
        return {"status": "Agendamento cancelado com sucesso."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs_postagem/{post_id}")
async def listar_logs_postagem(post_id: int):
    try:
        logs = database.buscar_logs_postagem(post_id)
        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rota de Drag and Drop (Atualizar data)
class AtualizarDataRequest(BaseModel):
    nova_data: str

@app.patch("/api/agendamentos/{post_id}/data")
async def atualizar_data_post(post_id: int, body: AtualizarDataRequest):
    try:
        database.atualizar_data_agendamento(post_id, body.nova_data)
        return {"status": "Data atualizada com sucesso!"}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rotas de Lembretes
class LembreteRequest(BaseModel):
    data: str
    texto: str
    cor: str = 'yellow'

class LembreteUpdateRequest(BaseModel):
    texto: str
    cor: str = None

@app.get("/api/lembretes")
async def listar_lembretes():
    try:
        return {"lembretes": database.buscar_lembretes()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/lembretes")
async def criar_lembrete(body: LembreteRequest):
    try:
        novo_id = database.criar_lembrete(body.data, body.texto, body.cor)
        return {"status": "Lembrete criado!", "id": novo_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/lembretes/{lembrete_id}")
async def editar_lembrete(lembrete_id: int, body: LembreteUpdateRequest):
    try:
        database.atualizar_lembrete(lembrete_id, body.texto, body.cor)
        return {"status": "Lembrete atualizado!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/lembretes/{lembrete_id}")
async def deletar_lembrete(lembrete_id: int):
    try:
        database.excluir_lembrete(lembrete_id)
        return {"status": "Lembrete removido!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class MoverLembreteRequest(BaseModel):
    nova_data: str

@app.patch("/api/lembretes/{lembrete_id}/mover")
async def mover_lembrete(lembrete_id: int, body: MoverLembreteRequest):
    try:
        database.mover_lembrete(lembrete_id, body.nova_data)
        return {"status": "Lembrete movido!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Status Tracker
@app.get("/api/status_tarefa/{task_id}")
async def status_tarefa(task_id: str):
    # Consulta o status da tarefa diretamente no Broker do Celery (Redis)
    resultado = AsyncResult(task_id, app=celery_app)
    
    # Valores padroes
    progresso = 0
    mensagem = "Aguardando fila de processamento..."
    status = resultado.state

    if status == 'PENDING':
        mensagem = "Na fila aguardando um Worker disponível..."
    elif status == 'PROGRESS':
        progresso = resultado.info.get('progresso', 0) if resultado.info else 0
        mensagem = resultado.info.get('mensagem', '') if resultado.info else "Em andamento..."
    elif status == 'SUCCESS':
        progresso = 100
        mensagem = "Tarefa finalizada com sucesso."
    elif status == 'FAILURE':
        mensagem = f"Erro fatal no bot: {resultado.info.get('exc_message', 'Falha desconhecida')}" if resultado.info else "Erro na execução."
    
    resposta = {"progresso": progresso, "mensagem": mensagem, "status": status}
    
    # Quando a tarefa terminou, inclui o resultado completo para o frontend exibir
    if status == 'SUCCESS' and resultado.result:
        resposta["resultado"] = resultado.result
        
    return resposta

# Rotas de Extracao
@app.post("/executar_bot")
async def executar_bot(request: ConfigBot):
    print(f"\n[API] Execucao assíncrona do bot solicitada. O Celery assumirá.", flush=True)
    
    task_id = request.task_id
    
    # Vamos buscar as credenciais reais no banco para passar por parâmetro para o Celery
    try:
        cfg = database.obter_configuracoes()
        usuario_real = cfg.get("usuario", "")
        senha_real = cfg.get("senha", "")
        if not usuario_real or not senha_real:
            raise HTTPException(status_code=400, detail="Credenciais não configuradas. Vá ao Painel de Controle.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao ler configs: {str(e)}")

    alvos_brutos = request.alvo.replace(";", ",").split(",")
    alvo_principal = alvos_brutos[0].strip() if alvos_brutos else ""
    
    limites = {
        "delay": request.tempo_espera,
        "posts": request.limite_posts,
        "seguidores": request.limite_seguidores,
        "coletar_feed": request.coletar_feed,
        "coletar_stories": request.coletar_stories,
        "seguir_alvo": request.seguir_alvo,
        "modo_invisivel": request.modo_oculto,
        "qtd_comentarios": request.qtd_comentarios
    }
    
    # Envia a ordem para o Celery via Message Broker (Redis) apontando para o task_id especifico
    # O comando .apply_async permite forcar o task_id
    run_scraper_bot_task.apply_async(
        args=[alvo_principal, senha_real, usuario_real, limites],
        task_id=task_id
    )
        
    return {"status": "accepted", "mensagem": "Tarefa enviada à fila de processamento", "task_id": task_id}

@app.post("/cancelar_bot/{task_id}")
async def cancelar_bot(task_id: str):
    # Envia um sinal SIGTERM para o worker que esta processando esta tarefa via Celery Control
    celery_app.control.revoke(task_id, terminate=True, signal='SIGTERM')
    return {"status": "Sinal de cancelamento (Revoke) enviado para a Fila."}

@app.get("/estatisticas/ultimo_lote")
async def estatisticas_ultimo_lote():
    dados = database.buscar_ultimo_lote_com_engajamento()
    if not dados:
        return {"erro": "Nenhum dado encontrado no banco."}
    return {"dados": dados}

# Rotas Analiticas


@app.get("/api/perfis")
async def listar_perfis():
    try:
        perfis = database.buscar_todos_perfis()
        return {"perfis": perfis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/extracoes_historico")
async def listar_extracoes_historico(perfil: str = None):
    try:
        dados = database.buscar_extracoes_historico(perfil_filtro=perfil)
        return {"extracoes": dados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/historico_graficos")
async def historico_graficos():
    try:
        dados = database.buscar_historico_graficos()
        return dados
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/historico_detalhado/{perfil}")
async def historico_detalhado_perfil(perfil: str):
    try:
        dados = database.buscar_historico_detalhado(perfil)
        return {"historico": dados}
    except Exception as e:
        print(f"[!] Erro ao buscar histórico detalhado: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ranking_horarios/{perfil}")
async def ranking_horarios(perfil: str):
    try:
        dados = database.obter_ranking_horarios(perfil)
        return {"ranking": dados}
    except Exception as e:
        print(f"[!] Erro ao buscar ranking de horários: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stories/{perfil}")
async def buscar_stories(perfil: str):
    try:
        dados = database.buscar_stories_por_perfil(perfil)
        return {"stories": dados}
    except Exception as e:
        print(f"[!] Erro ao buscar stories: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/limpar_perfil/{perfil}")
async def limpar_perfil(perfil: str):
    try:
        qtd = database.limpar_dados_perfil(perfil)
        return {"status": f"Dados limpos com sucesso ({qtd} registros afetados)."}
    except Exception as e:
        print(f"[!] Erro ao limpar dados do perfil: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

# Rotas de Configuracao
@app.get("/api/configuracoes")
async def obter_configuracoes():
    try:
        return database.obter_configuracoes()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/configuracoes")
async def salvar_configuracoes(
    usuario: str = Form(""),
    senha: str = Form(""),
    delay_base: int = Form(4),
    modo_invisivel: bool = Form(True)
):
    try:
        database.salvar_configuracoes(usuario, senha, delay_base, modo_invisivel)
        return {"status": "Configurações salvas no banco de dados com sucesso!"}
    except Exception as e:
        print(f"[!] Erro ao salvar configurações: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/exportar_csv")
async def exportar_csv():
    dados = database.buscar_ultimo_lote_com_engajamento()
    if not dados:
        raise HTTPException(status_code=404, detail="Nenhum dado encontrado para exportação.")
    
    output = io.StringIO()
    escritor_csv = csv.writer(output, delimiter=';', lineterminator='\n')
    escritor_csv.writerow(['Perfil', 'Data', 'Link', 'Seguidores', 'Curtidas', 'Engajamento (%)'])
    
    for linha in dados:
        engajamento_br = str(linha.get('engajamento_percentual', 0)).replace('.', ',')
        escritor_csv.writerow([
            linha.get('perfil', ''),
            linha.get('data', ''),
            linha.get('url', ''),
            linha.get('seguidores', ''),
            linha.get('curtidas', ''),
            f"{engajamento_br}%"
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=Relatorio_Performance_IG.csv"}
    )