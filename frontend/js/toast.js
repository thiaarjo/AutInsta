// Sistema de Notificações Toast Não-Obstrutivas

// Cria o container das notificações se não existir
function garantirContainerToast() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Exibe um toast (notificação flutuante)
 * @param {string} mensagem O texto da notificação
 * @param {string} tipo 'sucesso', 'erro', 'aviso', ou 'info' (default)
 */
export function mostrarToast(mensagem, tipo = 'info') {
    const container = garantirContainerToast();

    // Configurações de estilo por tipo
    const estilos = {
        sucesso: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: 'check-circle', iconColor: 'text-green-500' },
        erro: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'alert-circle', iconColor: 'text-red-500' },
        aviso: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'alert-triangle', iconColor: 'text-amber-500' },
        info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'info', iconColor: 'text-blue-500' }
    };

    const cfg = estilos[tipo] || estilos.info;

    // Cria o elemento Toast
    const toast = document.createElement('div');
    toast.className = `${cfg.bg} border ${cfg.border} rounded-lg shadow-lg p-4 max-w-sm w-full pointer-events-auto transform transition-all duration-300 translate-y-12 opacity-0 flex items-start gap-3`;

    // Conteúdo HTML do Toast
    toast.innerHTML = `
        <i data-lucide="${cfg.icon}" class="w-5 h-5 ${cfg.iconColor} shrink-0 mt-0.5"></i>
        <div class="flex-1 min-w-0">
            <p class="text-sm font-medium ${cfg.text}">${mensagem}</p>
        </div>
        <button class="shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors text-zinc-400 hover:text-zinc-600 focus:outline-none">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
    `;

    // Botão de fechar manualmente
    const btnClose = toast.querySelector('button');
    btnClose.addEventListener('click', () => fecharToast(toast));

    container.appendChild(toast);

    // Renderiza ícone
    if (window.lucide) lucide.createIcons({ root: toast });

    // Animação de entrada (Trigger Next Frame)
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-12', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto-fechar após 4 segundos
    setTimeout(() => {
        if (toast.parentNode) {
            fecharToast(toast);
        }
    }, 4000);
}

function fecharToast(toast) {
    if (!toast || !toast.parentNode) return;

    // Animação de saída
    toast.classList.replace('translate-y-0', 'translate-y-2');
    toast.classList.replace('opacity-100', 'opacity-0');

    // Remove do DOM após animação
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
}

// Expõe globalmente para compatibilidade flexível caso outros scripts não usem Import
window.mostrarToast = mostrarToast;
