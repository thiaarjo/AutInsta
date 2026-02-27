import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager

# Config DB
DIRETORIO_BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DIRETORIO_BASE, "banco_dados.db")

@contextmanager
def conectar():
    """Context manager para o DB."""
    conexao = sqlite3.connect(DB_PATH)
    conexao.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conexao
    finally:
        conexao.close()

def criar_tabelas():
    """Inicializa o esquema relacional."""
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

            CREATE TABLE IF NOT EXISTS lembretes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT NOT NULL,
                texto TEXT NOT NULL,
                cor TEXT DEFAULT 'yellow'
            );

            CREATE TABLE IF NOT EXISTS configuracoes_globais (
                id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
                usuario TEXT,
                senha TEXT,
                delay_base INTEGER DEFAULT 4,
                modo_invisivel BOOLEAN DEFAULT 1
            );
        """)
        
        try:
            cursor.execute("ALTER TABLE perfis_extraidos ADD COLUMN seguidores_valor INTEGER DEFAULT 0;")
        except sqlite3.OperationalError:
            pass 

        conexao.commit()

# Insercao

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
            print(f"[DB] Erro: {e}")
            conexao.rollback()

# Agendamento

def agendar_novo_post(caminho_foto, legenda, data_agendada):
    # Validação: impede agendamentos no passado
    try:
        dt_agendada = datetime.strptime(data_agendada, "%Y-%m-%dT%H:%M")
        if dt_agendada < datetime.now():
            raise ValueError("Não é possível agendar para uma data no passado.")
    except ValueError as ve:
        if "passado" in str(ve):
            raise ve
        # Se o formato for diferente, deixa passar
        pass
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

def atualizar_data_agendamento(post_id, nova_data):
    """Atualiza apenas a data de um agendamento (usado no Drag and Drop)."""
    try:
        dt = datetime.strptime(nova_data, "%Y-%m-%dT%H:%M")
        if dt < datetime.now():
            raise ValueError("Não é possível mover para uma data no passado.")
    except ValueError as ve:
        if "passado" in str(ve):
            raise ve
        pass
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("UPDATE postagens_agendadas SET data_agendada = ? WHERE id = ?", (nova_data, post_id))
        conexao.commit()

# Lembretes CRUD

def criar_lembrete(data, texto, cor='yellow'):
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("INSERT INTO lembretes (data, texto, cor) VALUES (?, ?, ?)", (data, texto, cor))
        conexao.commit()
        return cursor.lastrowid

def buscar_lembretes():
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("SELECT id, data, texto, cor FROM lembretes ORDER BY data ASC")
        return [{"id": r[0], "data": r[1], "texto": r[2], "cor": r[3]} for r in cursor.fetchall()]

def atualizar_lembrete(lembrete_id, texto, cor=None):
    with conectar() as conexao:
        cursor = conexao.cursor()
        if cor:
            cursor.execute("UPDATE lembretes SET texto = ?, cor = ? WHERE id = ?", (texto, cor, lembrete_id))
        else:
            cursor.execute("UPDATE lembretes SET texto = ? WHERE id = ?", (texto, lembrete_id))
        conexao.commit()

def excluir_lembrete(lembrete_id):
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("DELETE FROM lembretes WHERE id = ?", (lembrete_id,))
        conexao.commit()

def mover_lembrete(lembrete_id, nova_data):
    """Move um lembrete para uma nova data (usado no Drag and Drop)."""
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("UPDATE lembretes SET data = ? WHERE id = ?", (nova_data, lembrete_id))
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

# Analises

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

        # Visão Geral (agrupada por dia) - para o modo "Todos os Posts"
        cursor.execute("""
            SELECT pe.alvo, substr(pf.data_publicacao, 1, 10) as dia, MAX(pf.curtidas_valor) 
            FROM posts_feed pf 
            JOIN perfis_extraidos pe ON pf.perfil_id = pe.id 
            WHERE pf.curtidas_valor > 0 
            GROUP BY pe.alvo, dia 
            ORDER BY dia ASC
        """)
        posts = [{"perfil": r[0], "data": r[1], "curtidas": r[2]} for r in cursor.fetchall()]

        # Visão por Post (dados brutos com url_post e hora exata) - para o modo "Post Específico"
        cursor.execute("""
            SELECT pe.alvo, pf.url_post, pf.data_publicacao, pf.curtidas_valor, el.data_execucao, pf.caminho_imagem
            FROM posts_feed pf 
            JOIN perfis_extraidos pe ON pf.perfil_id = pe.id 
            JOIN execucoes_lote el ON pe.lote_id = el.id
            WHERE pf.url_post IS NOT NULL
            ORDER BY el.data_execucao ASC
        """)
        posts_brutos = [{"perfil": r[0], "url_post": r[1], "data_pub": r[2], "curtidas": r[3], "data_extracao": r[4], "print": r[5]} for r in cursor.fetchall()]

        return {"seguidores": seguidores, "posts": posts, "posts_brutos": posts_brutos}

def buscar_historico_detalhado(perfil_alvo):
    """Busca todas as execuções de um perfil específico para visualização detalhada hora a hora."""
    with conectar() as conexao:
        cursor = conexao.cursor()
        
        # Últimos 20 registros do histórico do perfil (seguidores e data/hora exata)
        cursor.execute("""
            SELECT el.data_execucao, pe.seguidores, pe.seguidores_valor 
            FROM perfis_extraidos pe 
            JOIN execucoes_lote el ON pe.lote_id = el.id 
            WHERE pe.alvo = ? 
            ORDER BY el.data_execucao DESC LIMIT 20
        """, (perfil_alvo,))
        
        registros = cursor.fetchall()
        historico = []
        for reg in registros:
            historico.append({
                "data_hora": reg[0],
                "seguidores_texto": reg[1],
                "seguidores_valor": reg[2]
            })
            
        return historico

# Melhor Horario
def obter_ranking_horarios(perfil_alvo):
    """Retorna media de curtidas agrupadas por dia da semana."""
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("""
            SELECT pf.data_publicacao, pf.curtidas_valor 
            FROM posts_feed pf
            JOIN perfis_extraidos pe ON pf.perfil_id = pe.id
            WHERE pe.alvo = ? AND pf.curtidas_valor > 0
        """, (perfil_alvo,))
        
        posts = cursor.fetchall()
        if not posts: return []

        # Acumuladores de curtidas [soma, qtd]
        stats = {i: [0, 0] for i in range(7)}
        dias_nomes = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

        for data_str, curtidas in posts:
            try:
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

# Configurações Globais

def salvar_configuracoes(usuario, senha, delay_base, modo_invisivel):
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO configuracoes_globais (id, usuario, senha, delay_base, modo_invisivel)
            VALUES (1, ?, ?, ?, ?)
        """, (usuario, senha, delay_base, int(modo_invisivel)))
        conexao.commit()

def obter_configuracoes():
    with conectar() as conexao:
        cursor = conexao.cursor()
        cursor.execute("SELECT usuario, senha, delay_base, modo_invisivel FROM configuracoes_globais WHERE id = 1")
        linha = cursor.fetchone()
        if linha:
            return {
                "usuario": linha[0] or "",
                "senha": linha[1] or "",
                "delay_base": linha[2],
                "modo_invisivel": bool(linha[3])
            }
        return {"usuario": "", "senha": "", "delay_base": 4, "modo_invisivel": True}

criar_tabelas()