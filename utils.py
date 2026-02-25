import re
from time import sleep

# Importa o nosso novo cofre de tarefas
from config import gerenciador_tarefas

# --- NOVA FUNÇÃO: O MEGAFONE DA BARRA DE PROGRESSO ---
def atualizar_status(task_id, progresso, mensagem):
    """Atualiza a % e a mensagem que vão aparecer na tela animada do usuário"""
    if task_id in gerenciador_tarefas:
        gerenciador_tarefas[task_id]["progresso"] = progresso
        gerenciador_tarefas[task_id]["mensagem"] = mensagem
        print(f"[{progresso}%] {mensagem}", flush=True)

def sleep_seguro(segundos, task_id="default"):
    """
    Espera o tempo definido, mas checa a cada 0.1s se ESTA TAREFA ESPECÍFICA foi cancelada.
    """
    passos = int(segundos * 10)
    if passos == 0: passos = 1
    
    for _ in range(passos):
        # Acessa o cofre da tarefa atual. Se não existir, assume que é False (não cancelar)
        tarefa_atual = gerenciador_tarefas.get(task_id, {})
        
        if tarefa_atual.get("cancelar", False):
            raise Exception("CANCELADO_PELO_USUARIO")
        
        sleep(0.1)

# =========================================================================
# --- FUNÇÃO DE MATEMÁTICA SUBSTITUÍDA E BLINDADA ---
# =========================================================================
def analisar_curtidas(texto):
    if not texto or texto == "0": 
        return 0, "0"
    
    texto_lower = texto.lower()
    
    # REGRA 1: Tenta extrair numero que esteja colado com palavras-chave reais do Instagram
    # Isso evita pegar numeros aleatórios dentro de arrobas como "@joao123"
    padroes = re.findall(r'([\d\.,]+)\s*(mil|mi|k|bi)?\s*(?:de\s*)?(?:curtidas?|likes?|pessoas?)', texto_lower)
    
    if not padroes:
        # REGRA 2: Se nao achou número claro, verifica se a curtida está oculta
        if "outras" in texto_lower or "others" in texto_lower or "pessoas" in texto_lower:
            return "OCULTO", "Oculto pelo usuário"
            
        # REGRA 3: Fallback generico para tentar salvar a leitura se o Instagram mudar o layout
        padroes = re.findall(r'\b([\d\.,]+)\s*(mil|mi|k|bi)?\b', texto_lower)
        if not padroes:
            return 0, "0"
            
    # Extrai o último número e multiplicador válidos encontrados
    numero_str, multiplicador_str = padroes[-1]
    
    # Aplicação matemática (Corrigido o bug do 'mil' sendo lido como 'mi' de milhões)
    multiplicador = 1
    if multiplicador_str == 'mi': 
        multiplicador = 1_000_000
    elif multiplicador_str == 'mil' or multiplicador_str == 'k': 
        multiplicador = 1_000
    elif multiplicador_str == 'bi': 
        multiplicador = 1_000_000_000
        
    # Limpa a pontuação (Brasil: 5.000 ou 50,3) para que o Python consiga calcular
    numero_str = numero_str.replace(".", "").replace(",", ".")
    
    try:
        # Multiplica e devolve formatado
        valor = int(float(numero_str) * multiplicador)
        valor_fmt = f"{valor:,}".replace(",", ".")
        return valor, f"{valor_fmt}"
    except ValueError:
        return 0, "0"