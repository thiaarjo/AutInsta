import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager

# --- CONFIGURAÇÃO DO BANCO DE DADOS ---
DIRETORIO_BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DIRETORIO_BASE, "banco_dados.db")

@contextmanager
def conectar():
    """
    Gerenciador de contexto para o banco de dados.
    Garante a abertura e fechamento seguro da conexao e ativa a checagem de chaves estrangeiras.
    """
    conexao = sqlite3.connect(DB_PATH)
    conexao.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conexao
    finally:
        conexao.close()

def criar_tabelas():
    """Inicializa o esquema relacional do banco de dados (se não existir)."""
    with conectar() as conexao:
        cursor = conexao.cursor()

        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS execucoes_lote (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data_execucao TEXT NOT NULL,
                qtd_alvos INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS perfis_extraidos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lote_id INTEGER NOT NULL,
                alvo TEXT NOT NULL,
                seguidores TEXT,
                seguidores_valor INTEGER DEFAULT 0,
                conta_privada BOOLEAN,
                status_execucao TEXT,
                status_seguir TEXT,
                FOREIGN KEY (lote_id) REFERENCES execucoes_lote (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS posts_feed (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                perfil_id INTEGER NOT NULL,
                posicao_grade INTEGER,
                url_post TEXT,
                tipo_midia TEXT,
                fixado BOOLEAN,
                data_publicacao TEXT,
                curtidas_texto TEXT,
                curtidas_valor INTEGER,
                texto_referencia TEXT,
                caminho_imagem TEXT,
                FOREIGN KEY (perfil_id) REFERENCES perfis_extraidos (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS comentarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                usuario_autor TEXT,
                texto_comentario TEXT,
                FOREIGN KEY (post_id) REFERENCES posts_feed (id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS stories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                perfil_id INTEGER NOT NULL,
                ordem INTEGER,
                tipo_midia TEXT,
                tempo_publicacao TEXT,
                FOREIGN KEY (perfil_id) REFERENCES perfis_extraidos (id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS postagens_agendadas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                caminho_foto TEXT,
                legenda TEXT,
                data_agendada TEXT,
                status TEXT DEFAULT 'PENDENTE'
            );
        """)
        
        try:
            cursor.execute("ALTER TABLE perfis_extraidos ADD COLUMN seguidores_valor INTEGER DEFAULT 0;")
        except sqlite3.OperationalError:
            pass 

        conexao.commit()

# --- FUNÇÕES DE INSERÇÃO ---

def _inserir_comentarios(cursor, post_id, comentarios):
    if not comentarios: return
    valores = [(post_id, c.get("usuario"), c.get("texto")) for c in comentarios]
    cursor.executemany("INSERT INTO comentarios (post_id, usuario_autor, texto_comentario) VALUES (?, ?, ?)", valores)

def _inserir_stories(cursor, perfil_id, stories):
    if not stories: return
    valores = [(perfil_id, s.get("numero"), s.get("tipo"), s.get("tempo")) for s in stories]
    cursor.executemany("INSERT INTO stories (perfil_id, ordem, tipo_midia, tempo_publicacao) VALUES (?, ?, ?, ?)", valores)

def salvar_lote(resultados_em_lote):
    if not resultados_em_lote: return
    with conectar() as conexao:
        cursor = conexao.cursor()
        try:
            data_atual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("INSERT INTO execucoes_lote (data_execucao, qtd_alvos) VALUES (?, ?)", (data_atual, len(resultados_em_lote)))
            lote_id = cursor.lastrowid
            for perfil in resultados_em_lote:
                cursor.execute("""
                    INSERT INTO perfis_extraidos (lote_id, alvo, seguidores, seguidores_valor, conta_privada, status_execucao, status_seguir) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (lote_id, perfil.get("alvo"), perfil.get("seguidores"), perfil.get("seguidores_matematica", 0), perfil.get("privado"), perfil.get("status"), perfil.get("status_seguir")))
                perfil_id = cursor.lastrowid
                for post in perfil.get("feed_posts", []):
                    cursor.execute("""
                        INSERT INTO posts_feed (perfil_id, posicao_grade, url_post, tipo_midia, fixado, data_publicacao, curtidas_texto, curtidas_valor, texto_referencia, caminho_imagem) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (perfil_id, post.get("posicao"), post.get("url_post"), post.get("tipo"), post.get("fixado"), post.get("data"), post.get("curtidas"), post.get("curtidas_matematica", 0), post.get("texto_original"), post.get("print_post")))
                    post_id = cursor.lastrowid
                    _inserir_comentarios(cursor, post_id, post.get("comentarios"))
                _inserir_stories(cursor, perfil_id, perfil.get("stories"))
            conexao.commit()
        except Exception as e:
            print(f"ERRO CRITICO DE BANCO DE DADOS: {e}")
            conexao.rollback()

# --- FUNÇÕES DE AGENDAMENTO ---

def agendar_novo_post(caminho_foto, legenda, data_agendada):
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("INSERT INTO postagens_agendadas (caminho_foto, legenda, data_agendada, status) VALUES (?, ?, ?, 'PENDENTE')", (caminho_foto, legenda, data_agendada))
        conexao.commit()

def buscar_todos_agendamentos():
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("SELECT id, caminho_foto, legenda, data_agendada, status FROM postagens_agendadas ORDER BY data_agendada DESC")
        return [{"id": l[0], "arquivo": os.path.basename(l[1]), "legenda": l[2], "data_agendada": l[3], "status": l[4]} for l in cursor.fetchall()]

def excluir_agendamento(post_id):
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("DELETE FROM postagens_agendadas WHERE id = ?", (post_id,))
        conexao.commit()

def buscar_posts_pendentes():
    with conectar() as conexao:
        cursor = conexao.cursor()
        agora = datetime.now().strftime("%Y-%m-%dT%H:%M")
        cursor.execute("SELECT id, caminho_foto, legenda, data_agendada FROM postagens_agendadas WHERE status = 'PENDENTE' AND data_agendada <= ?", (agora,))
        return cursor.fetchall()

def atualizar_status_post(post_id, novo_status):
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("UPDATE postagens_agendadas SET status = ? WHERE id = ?", (novo_status, post_id))
        conexao.commit()

# --- FUNÇÕES ANALÍTICAS ---

def buscar_ultimo_lote_com_engajamento():
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("SELECT id FROM execucoes_lote ORDER BY data_execucao DESC LIMIT 1")
        ultimo_lote = cursor.fetchone()
        if not ultimo_lote: return None
        lote_id = ultimo_lote[0]
        query = """
        SELECT p.alvo, p.seguidores, pf.url_post, pf.data_publicacao, pf.curtidas_texto, pf.curtidas_valor, pf.caminho_imagem, p.seguidores_valor
        FROM perfis_extraidos p JOIN posts_feed pf ON pf.perfil_id = p.id
        WHERE p.lote_id = ? ORDER BY p.alvo, pf.posicao_grade
        """
        cursor.execute(query, (lote_id,))
        resultados = cursor.fetchall()
        dados = []
        for l in resultados:
            eng = round((l[5] / l[7]) * 100, 2) if l[7] > 0 and l[5] else 0
            dados.append({"perfil": l[0], "seguidores": l[1], "url": l[2], "data": l[3], "curtidas": l[4], "engajamento_percentual": eng, "print": l[6]})
        return dados

def buscar_historico_graficos():
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("SELECT pe.alvo, el.data_execucao, pe.seguidores_valor FROM perfis_extraidos pe JOIN execucoes_lote el ON pe.lote_id = el.id WHERE pe.seguidores_valor > 0 ORDER BY el.data_execucao ASC")
        seguidores = [{"perfil": r[0], "data": r[1], "valor": r[2]} for r in cursor.fetchall()]
        cursor.execute("SELECT pe.alvo, pf.data_publicacao, pf.curtidas_valor FROM posts_feed pf JOIN perfis_extraidos pe ON pf.perfil_id = pe.id WHERE pf.curtidas_valor > 0 ORDER BY pf.data_publicacao ASC")
        posts = [{"perfil": r[0], "data": r[1], "curtidas": r[2]} for r in cursor.fetchall()]
        return {"seguidores": seguidores, "posts": posts}

# =========================================================================
# 🚀 NOVA FUNÇÃO: O CÉREBRO DO MELHOR HORÁRIO (SAAS STYLE)
# =========================================================================
def obter_ranking_horarios(perfil_alvo):
    """
    Analisa todos os posts de um perfil e retorna a média de curtidas
    agrupada por dia da semana.
    """
    with conectar() as conexao:
        cursor = conexao.cursor()
        # Seleciona data e curtidas de todos os posts deste perfil
        cursor.execute("""
            SELECT pf.data_publicacao, pf.curtidas_valor 
            FROM posts_feed pf
            JOIN perfis_extraidos pe ON pf.perfil_id = pe.id
            WHERE pe.alvo = ? AND pf.curtidas_valor > 0
        """, (perfil_alvo,))
        
        posts = cursor.fetchall()
        if not posts: return []

        # Dicionário para acumular [soma_curtidas, quantidade_posts]
        # 0=Segunda, 1=Terça... 6=Domingo
        stats = {i: [0, 0] for i in range(7)}
        dias_nomes = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

        for data_str, curtidas in posts:
            try:
                # Converte string "17/02/2026 22:25" para objeto datetime
                dt = datetime.strptime(data_str, "%d/%m/%Y %H:%M")
                dia_semana = dt.weekday() 
                stats[dia_semana][0] += curtidas
                stats[dia_semana][1] += 1
            except: continue

        ranking = []
        for i in range(7):
            soma, qtd = stats[i]
            media = round(soma / qtd) if qtd > 0 else 0
            ranking.append({"dia": dias_nomes[i], "media_curtidas": media})
        
        return ranking

criar_tabelas()