import { converterDataString, getTimestamp, NOMES_DIAS_SEMANA, NOMES_MESES_CURTO, NOMES_MESES } from './globals.js';

function onDragStartCard(e) {
    const card = e.target.closest('[draggable]');
    if (!card) return;

    const tipo = card.dataset.tipo; // 'post' ou 'lembrete'
    const id = tipo === 'post' ? card.dataset.agendamentoId : card.dataset.lembreteId;
    const horaOriginal = card.dataset.hora || '12:00';

    e.dataTransfer.setData('text/plain', JSON.stringify({ tipo, id, hora: horaOriginal }));
    e.dataTransfer.effectAllowed = 'move';

    card.style.opacity = '0.4';
    setTimeout(() => { card.style.opacity = '1'; }, 300);

    // Permite soltar no calendário mesmo se a gaveta escura ("overlay") estiver por cima
    const overlay = document.getElementById('drawer-overlay');
    if (overlay) overlay.style.pointerEvents = 'none';
}

function onDragEndCard(e) {
    const overlay = document.getElementById('drawer-overlay');
    if (overlay) overlay.style.pointerEvents = 'auto';
}

async function onDropCard(e, novaDataStr, divDia) {
    e.preventDefault();
    divDia.classList.remove('ring-2', 'ring-pink-400', 'ring-inset', 'bg-pink-50/40');

    try {
        const payload = JSON.parse(e.dataTransfer.getData('text/plain'));

        if (payload.tipo === 'post') {
            // Garante que o formato retorne os segundos (ex: T12:00:00) para o backend não reclamar
            const horaPadrao = payload.hora.length === 5 ? `${payload.hora}:00` : payload.hora;
            const novaDataCompleta = `${novaDataStr}T${horaPadrao}`;
            const res = await fetch(`/api/agendamentos/${payload.id}/data`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nova_data: novaDataCompleta })
            });
            if (!res.ok) {
                const err = await res.json();
                window.mostrarToast(err.detail || 'Erro ao mover post.', 'erro');
                return;
            }
        } else if (payload.tipo === 'lembrete') {
            const res = await fetch(`/api/lembretes/${payload.id}/mover`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nova_data: novaDataStr })
            });
            if (!res.ok) {
                const err = await res.json();
                window.mostrarToast(err.detail || 'Erro ao mover lembrete.', 'erro');
                return;
            }
        }

        carregarAgendamentos();
    } catch (err) {
        console.error('Erro no drag and drop:', err);
    }
}

// --- EXPORTANDO PARA O ESCOPO GLOBAL ---
window.onDropCard = onDropCard;
window.onDragStartCard = onDragStartCard;
window.onDragEndCard = onDragEndCard;
