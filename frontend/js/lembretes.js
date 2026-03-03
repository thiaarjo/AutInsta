import { converterDataString, getTimestamp, NOMES_DIAS_SEMANA, NOMES_MESES_CURTO, NOMES_MESES } from './globals.js';

// --- LEMBRETES DO MODAL ---
async function popularLembretesDoModal(dataStr) {
    const container = document.getElementById('modal-lembretes-lista');
    if (!container) return;
    container.innerHTML = '';

    if (!dataStr) return;

    try {
        const res = await fetch('/api/lembretes', { cache: 'no-store' });
        const data = await res.json();
        if (!data.lembretes) return;

        const dosDia = data.lembretes.filter(l => l.data === dataStr);

        if (dosDia.length === 0) {
            container.innerHTML = '<p class="text-xs text-zinc-400 text-center py-1">Nenhum lembrete para este dia.</p>';
            return;
        }

        dosDia.forEach(lem => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 group';
            div.id = `modal-lem-${lem.id}`;
            div.innerHTML = `
                <i data-lucide="sticky-note" class="w-3.5 h-3.5 text-amber-500 shrink-0"></i>
                <span class="text-xs font-bold text-amber-800 flex-1 truncate">${lem.texto}</span>
                <button onclick="editarLembreteNoModal(${lem.id}, '${lem.texto.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-amber-200 text-amber-600 transition-all" title="Editar">
                    <i data-lucide="pencil" class="w-3 h-3"></i>
                </button>
                <button onclick="deletarLembreteDoModal(${lem.id})" class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 transition-all" title="Apagar">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        console.error('Erro ao carregar lembretes no modal:', e);
    }
}

async function salvarLembreteDoModal() {
    const input = document.getElementById('modal-lembrete-input');
    if (!input || !input.value.trim() || !window.diaAtualDoModal) return;

    try {
        await fetch('/api/lembretes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: window.diaAtualDoModal, texto: input.value.trim(), cor: 'yellow' })
        });
        input.value = '';
        await popularLembretesDoModal(window.diaAtualDoModal);
        carregarAgendamentos(); // Atualiza grid do calendário também
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.error('Erro ao salvar lembrete:', e);
    }
}

function editarLembreteNoModal(id, textoAtual) {
    const container = document.getElementById(`modal-lem-${id}`);
    if (!container) return;

    container.innerHTML = `
        <input type="text" value="${textoAtual}" maxlength="100"
               class="flex-1 bg-amber-50 border border-amber-400 text-xs font-bold rounded px-2 py-1.5 outline-none text-amber-800 min-w-0 focus:ring-1 focus:ring-amber-300"
               id="modal-lem-edit-${id}"
               onkeydown="if(event.key==='Enter') salvarEdicaoLembreteModal(${id})">
        <button onclick="salvarEdicaoLembreteModal(${id})" class="p-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-700 transition-colors">
            <i data-lucide="check" class="w-3 h-3"></i>
        </button>
        <button onclick="popularLembretesDoModal('${window.diaAtualDoModal}').then(() => { if(window.lucide) lucide.createIcons(); })" class="p-1 rounded hover:bg-red-100 text-red-400 transition-colors">
            <i data-lucide="x" class="w-3 h-3"></i>
        </button>
    `;
    if (window.lucide) lucide.createIcons();
    const inp = document.getElementById(`modal-lem-edit-${id}`);
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
}

async function salvarEdicaoLembreteModal(id) {
    const inp = document.getElementById(`modal-lem-edit-${id}`);
    if (!inp || !inp.value.trim()) return;

    try {
        await fetch(`/api/lembretes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: inp.value.trim() })
        });
        await carregarAgendamentos();
        if (window.diaAtualDoModal) {
            await popularLembretesDoModal(window.diaAtualDoModal);
        }
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.error('Erro ao editar lembrete:', e);
    }
}

async function deletarLembreteDoModal(id) {
    const isConfirmado = await confirmarAcao('Remover este lembrete do dia?');
    if (!isConfirmado) return;
    try {
        await fetch(`/api/lembretes/${id}`, { method: 'DELETE' });
        await carregarAgendamentos();
        if (window.diaAtualDoModal) {
            await popularLembretesDoModal(window.diaAtualDoModal);
        }
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.error('Erro ao deletar lembrete:', e);
    }
}

// --- POSTS DO DIA NO MODAL ---
async function popularPostsDoModal(dataStr) {
    const container = document.getElementById('modal-posts-lista');
    const countEl = document.getElementById('modal-posts-count');
    if (!container) return;
    container.innerHTML = '';

    if (!dataStr) {
        container.innerHTML = '<p class="text-xs text-zinc-400 text-center py-3">Selecione um dia para ver as publicações.</p>';
        if (countEl) countEl.textContent = '0';
        return;
    }

    try {
        const res = await fetch('/api/agendamentos', { cache: 'no-store' });
        const data = await res.json();
        if (!data.agendamentos) return;

        // Filtra posts deste dia (compara YYYY-MM-DD)
        const postsDoDia = data.agendamentos.filter(p => p.data_agendada.startsWith(dataStr));

        if (countEl) countEl.textContent = postsDoDia.length;

        if (postsDoDia.length === 0) {
            container.innerHTML = '<p class="text-xs text-zinc-400 text-center py-3">Nenhuma publicação agendada para este dia.</p>';
            return;
        }

        postsDoDia.forEach(post => {
            const hora = post.data_agendada.split('T')[1]?.substring(0, 5) || '';
            let statusColor, statusBg, statusIcon;

            if (post.status === 'PUBLICADO') {
                statusColor = 'text-green-700'; statusBg = 'bg-green-50 border-green-200'; statusIcon = 'check-circle';
            } else if (post.status === 'ERRO') {
                statusColor = 'text-red-700'; statusBg = 'bg-red-50 border-red-200'; statusIcon = 'alert-circle';
            } else {
                statusColor = 'text-pink-700'; statusBg = 'bg-pink-50 border-pink-200'; statusIcon = 'clock';
            }

            const legendaPreview = (post.legenda || '').substring(0, 80);

            const div = document.createElement('div');
            div.className = `${statusBg} border rounded-lg px-3 py-2.5 flex items-center gap-3 group`;
            div.innerHTML = `
                <div class="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 shrink-0 border border-white shadow-sm">
                    <img src="/uploads/${post.arquivo}" class="w-full h-full object-cover" onerror="this.style.display='none'">
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-black ${statusColor} flex items-center gap-1 mb-0.5">
                        <i data-lucide="${statusIcon}" class="w-3 h-3"></i>
                        ${hora} • ${post.status === 'PENDENTE' ? 'Pendente' : post.status}
                    </p>
                    <p class="text-[10px] text-zinc-500 truncate">${legendaPreview || 'Sem legenda'}</p>
                </div>
                <button onclick="deletarAgendamento(${post.id})" class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-all shrink-0" title="Remover">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        console.error('Erro ao popular posts do dia no modal:', e);
    }
}

document.getElementById('modal-lembrete-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); salvarLembreteDoModal(); }
});

async function carregarLembretes() {
    try {
        const res = await fetch('/api/lembretes', { cache: 'no-store' });
        const data = await res.json();
        if (!data.lembretes) return;

        data.lembretes.forEach(lem => {
            const celula = document.getElementById(`cal-conteudo-${lem.data}`);
            if (!celula) return;

            const corMap = {
                yellow: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
                blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500' },
                green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500' },
                red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' },
            };
            const cores = corMap[lem.cor] || corMap.yellow;

            const cardHtml = `
                <div class="${cores.bg} border ${cores.border} rounded px-2 py-1 flex items-center gap-1.5 group/lem relative cursor-pointer hover:shadow-sm transition-all"
                     data-lembrete-id="${lem.id}"
                     data-tipo="lembrete"
                     draggable="true"
                     ondragstart="onDragStartCard(event)"
                     ondragend="onDragEndCard(event)"
                     onclick="event.stopPropagation(); editarLembreteInline(${lem.id}, '${lem.data}', '${lem.texto.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${lem.cor}')">
                    <i data-lucide="sticky-note" class="w-3 h-3 ${cores.icon} shrink-0"></i>
                    <p class="text-[10px] font-bold ${cores.text} truncate flex-1">${lem.texto}</p>
                    <button onclick="event.stopPropagation(); deletarLembrete(${lem.id})" class="opacity-0 group-hover/lem:opacity-100 p-0.5 rounded text-red-500 hover:bg-red-100 transition-colors">
                        <i data-lucide="x" class="w-2.5 h-2.5"></i>
                    </button>
                </div>
            `;
            celula.innerHTML += cardHtml;
        });

        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.error('Erro ao carregar lembretes:', e);
    }
}

function abrirInputLembrete(dataStr) {
    // Remove qualquer input de lembrete já aberto
    document.querySelectorAll('.lembrete-input-box').forEach(el => el.remove());

    const celula = document.getElementById(`cal-conteudo-${dataStr}`);
    if (!celula) return;

    const inputBox = document.createElement('div');
    inputBox.className = 'lembrete-input-box bg-amber-50 border border-amber-300 rounded p-1.5 mt-1 flex items-center gap-1 shadow-sm animate-in fade-in duration-150';
    inputBox.innerHTML = `
        <input type="text" placeholder="Novo lembrete..." maxlength="80"
               class="flex-1 text-[10px] font-bold bg-transparent border-none outline-none text-amber-800 placeholder:text-amber-400 min-w-0"
               onkeydown="if(event.key==='Enter'){salvarNovoLembrete('${dataStr}', this.value); this.closest('.lembrete-input-box').remove();}">
        <button onclick="salvarNovoLembrete('${dataStr}', this.previousElementSibling.value); this.closest('.lembrete-input-box').remove();"
                class="shrink-0 p-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-700 transition-colors">
            <i data-lucide="check" class="w-3 h-3"></i>
        </button>
        <button onclick="this.closest('.lembrete-input-box').remove()"
                class="shrink-0 p-0.5 rounded hover:bg-red-100 text-red-400 transition-colors">
            <i data-lucide="x" class="w-3 h-3"></i>
        </button>
    `;
    celula.appendChild(inputBox);
    if (window.lucide) lucide.createIcons();
    inputBox.querySelector('input').focus();
}

async function salvarNovoLembrete(data, texto) {
    if (!texto || !texto.trim()) return;
    try {
        await fetch('/api/lembretes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: data, texto: texto.trim(), cor: 'yellow' })
        });
        carregarAgendamentos();
    } catch (e) {
        console.error('Erro ao criar lembrete:', e);
    }
}

function editarLembreteInline(id, data, textoAtual, corAtual) {
    document.querySelectorAll('.lembrete-input-box').forEach(el => el.remove());

    const celula = document.getElementById(`cal-conteudo-${data}`);
    if (!celula) return;

    // Encontra e esconde o card original
    const cardOriginal = celula.querySelector(`[data-lembrete-id="${id}"]`);
    if (cardOriginal) cardOriginal.style.display = 'none';

    const editBox = document.createElement('div');
    editBox.className = 'lembrete-input-box bg-amber-50 border-2 border-amber-400 rounded p-1.5 flex items-center gap-1 shadow-md animate-in fade-in duration-150';
    editBox.innerHTML = `
        <input type="text" value="${textoAtual}" maxlength="80"
               class="flex-1 text-[10px] font-bold bg-transparent border-none outline-none text-amber-800 min-w-0"
               onkeydown="if(event.key==='Enter'){atualizarLembrete(${id}, this.value); this.closest('.lembrete-input-box').remove();}">
        <button onclick="atualizarLembrete(${id}, this.previousElementSibling.value); this.closest('.lembrete-input-box').remove();"
                class="shrink-0 p-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-700 transition-colors">
            <i data-lucide="check" class="w-3 h-3"></i>
        </button>
        <button onclick="this.closest('.lembrete-input-box').remove(); document.querySelector('[data-lembrete-id=\"${id}\"]').style.display='flex';"
                class="shrink-0 p-0.5 rounded hover:bg-red-100 text-red-400 transition-colors">
            <i data-lucide="x" class="w-3 h-3"></i>
        </button>
    `;
    celula.appendChild(editBox);
    if (window.lucide) lucide.createIcons();
    const inp = editBox.querySelector('input');
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
}

async function atualizarLembrete(id, texto) {
    if (!texto || !texto.trim()) return;
    try {
        await fetch(`/api/lembretes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: texto.trim() })
        });
        carregarAgendamentos();
    } catch (e) {
        console.error('Erro ao atualizar lembrete:', e);
    }
}

async function deletarLembrete(id) {
    const isConfirmado = await confirmarAcao('Excluir este lembrete do sistema?');
    if (!isConfirmado) return;
    try {
        await fetch(`/api/lembretes/${id}`, { method: 'DELETE' });
        carregarAgendamentos();
    } catch (e) {
        console.error('Erro ao deletar lembrete:', e);
    }
}

// --- EXPORTANDO PARA O ESCOPO GLOBAL ---
window.popularLembretesDoModal = popularLembretesDoModal;
window.salvarLembreteDoModal = salvarLembreteDoModal;
window.salvarEdicaoLembreteModal = salvarEdicaoLembreteModal;
window.deletarLembreteDoModal = deletarLembreteDoModal;
window.popularPostsDoModal = popularPostsDoModal;
window.carregarLembretes = carregarLembretes;
window.salvarNovoLembrete = salvarNovoLembrete;
window.atualizarLembrete = atualizarLembrete;
window.deletarLembrete = deletarLembrete;
window.editarLembreteNoModal = editarLembreteNoModal;
window.abrirInputLembrete = abrirInputLembrete;
window.editarLembreteInline = editarLembreteInline;
