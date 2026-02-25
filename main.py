import os
import shutil
import webbrowser
import asyncio
import csv
import io
from time import sleep
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse
import meta_api

# --- Importação do Relógio (Scheduler) ---
from apscheduler.schedulers.background import BackgroundScheduler

# --- Nossas importações modulares (ATUALIZADO COM O GERENCIADOR) ---
import database
from config import ConfigBot, DIRETORIO_BASE, PASTA_PRINTS, gerenciador_tarefas
from scraper import rodar_robo

# --- Pasta para guardar as fotos que serão postadas ---
PASTA_UPLOADS = os.path.join(DIRETORIO_BASE, "uploads_postagens")
os.makedirs(PASTA_UPLOADS, exist_ok=True)

# --- API STRUCTURE ---
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

# =========================================================================
# --- O VIGIA (BACKGROUND SCHEDULER) ---
# =========================================================================
def verificar_fila_postagens():
    agora_formatado = datetime.now().strftime('%H:%M:%S')
    pendentes = database.buscar_posts_pendentes()
    
    if pendentes:
        print(f"\n[{agora_formatado}] ⏰ RELÓGIO: Encontrei {len(pendentes)} post(s) na fila para agora!", flush=True)
        
        for post in pendentes:
            post_id, caminho_foto, legenda, data_agendada = post
            print(f"[*] Preparando disparo -> ID: {post_id} | Data Marcada: {data_agendada}", flush=True)
            
            sucesso = meta_api.publicar_no_instagram(caminho_foto, legenda)
            
            if sucesso:
                database.atualizar_status_post(post_id, 'PUBLICADO')
                print(f"[+] Post {post_id} finalizado e marcado como PUBLICADO no banco.\n", flush=True)
            else:
                database.atualizar_status_post(post_id, 'ERRO')
                print(f"[-] Falha no disparo do Post {post_id}. Marcado com ERRO.\n", flush=True)

agendador = BackgroundScheduler()
agendador.add_job(verificar_fila_postagens, 'interval', minutes=1)

# =========================================================================
# --- INICIALIZAÇÃO DO PAINEL E HTML ---
# =========================================================================
@app.on_event("startup")
async def iniciar_painel():
    print("\n=======================================================", flush=True)
    print("🚀 IG MONITOR PRO LIGADO!")
    print("Acesse o painel em: http://localhost:8000")
    print("=======================================================\n", flush=True)
    
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
    caminho_html = os.path.join(DIRETORIO_BASE, "index.html")
    if os.path.exists(caminho_html):
        with open(caminho_html, "r", encoding="utf-8") as arquivo:
            html_conteudo = arquivo.read()
        return HTMLResponse(content=html_conteudo)
    else:
        return HTMLResponse(content=f"<h1>ERRO 404: Arquivo index.html não encontrado!</h1><p>Verifique a pasta: <b>{DIRETORIO_BASE}</b></p>")

# =========================================================================
# --- ROTAS DE AGENDAMENTO E GESTÃO ---
# =========================================================================
@app.post("/api/agendar")
async def receber_agendamento(
    foto: UploadFile = File(...), 
    legenda: str = Form(...),
    data_agendada: str = Form(...)
):
    try:
        print(f"\n[*] Recebendo nova solicitação de agendamento...", flush=True)
        caminho_arquivo = os.path.join(PASTA_UPLOADS, foto.filename)
        with open(caminho_arquivo, "wb") as buffer:
            shutil.copyfileobj(foto.file, buffer)
            
        print(f"[+] Imagem salva com sucesso em: {caminho_arquivo}", flush=True)
        database.agendar_novo_post(caminho_arquivo, legenda, data_agendada)
        return {"status": "Publicação agendada com sucesso!"}
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

# =========================================================================
# --- ROTA DO ESPIÃO DE PROGRESSO (NOVO) ---
# =========================================================================
@app.get("/api/status_tarefa/{task_id}")
async def status_tarefa(task_id: str):
    # O HTML chama essa rota a cada segundo para atualizar a barra animada
    tarefa = gerenciador_tarefas.get(task_id, {"progresso": 0, "mensagem": "Aguardando inicialização..."})
    return {"progresso": tarefa.get("progresso", 0), "mensagem": tarefa.get("mensagem", "")}

# =========================================================================
# --- ROTAS DA API DE EXTRAÇÃO ---
# =========================================================================
@app.post("/executar_bot")
async def executar_bot(request: ConfigBot):
    print("\n🚨 [API] O BOTÃO FOI CLICADO! INICIANDO MOTOR... 🚨", flush=True)
    
    # Registra a tarefa isolada no cofre geral
    task_id = request.task_id
    gerenciador_tarefas[task_id] = {"cancelar": False, "progresso": 5, "mensagem": "Preparando motor de extração...", "pid": None}
    
    alvos_brutos = request.alvo.replace(";", ",").split(",")
    alvos_lista = [a.strip() for a in alvos_brutos if a.strip()][:3]
    
    resultados_em_lote = []
    
    for perfil_atual in alvos_lista:
        if gerenciador_tarefas[task_id]["cancelar"]: break
        print(f"\n=========================================", flush=True)
        print(f"[*] INICIANDO PERFIL LOTE: {perfil_atual}", flush=True)
        print(f"=========================================\n", flush=True)
        
        request.alvo = perfil_atual
        
        # Envia o robô para rodar em uma "Thread" separada para não travar a API
        try:
            resultado = await asyncio.to_thread(rodar_robo, request)
            resultados_em_lote.append(resultado)
        except Exception as e:
            print(f"[!] ERRO CRITICO AO EXECUTAR O ROBO EM {perfil_atual}: {e}", flush=True)
            
        if gerenciador_tarefas[task_id]["cancelar"]: break
            
    database.salvar_lote(resultados_em_lote)
    print("\n✅ [API] Lote de perfis salvo no Banco de Dados!", flush=True)
    
    # Limpa a tarefa do cofre ao finalizar para não vazar memória
    if task_id in gerenciador_tarefas:
        del gerenciador_tarefas[task_id]
        
    return {"resultados": resultados_em_lote}

@app.post("/cancelar_bot/{task_id}")
async def cancelar_bot(task_id: str):
    # Cancela APENAS o robô do usuário que clicou, deixando os outros ilesos
    if task_id in gerenciador_tarefas:
        gerenciador_tarefas[task_id]["cancelar"] = True
    return {"status": "Cancelamento solicitado!"}

@app.get("/estatisticas/ultimo_lote")
async def estatisticas_ultimo_lote():
    dados = database.buscar_ultimo_lote_com_engajamento()
    if not dados:
        return {"erro": "Nenhum dado encontrado no banco."}
    return {"dados": dados}

# =========================================================================
# --- ROTAS DO DASHBOARD E RELATÓRIOS ---
# =========================================================================
@app.get("/api/historico_graficos")
async def historico_graficos():
    try:
        dados = database.buscar_historico_graficos()
        return dados
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ranking_horarios/{perfil}")
async def ranking_horarios(perfil: str):
    try:
        # Puxa o cálculo inteligente do database.py
        dados = database.obter_ranking_horarios(perfil)
        return {"ranking": dados}
    except Exception as e:
        print(f"[!] Erro ao buscar ranking de horários: {e}", flush=True)
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