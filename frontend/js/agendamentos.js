import { converterDataString, getTimestamp, NOMES_DIAS_SEMANA, NOMES_MESES_CURTO, NOMES_MESES } from './globals.js';

async function carregarAgendamentos() {
    try {
        const res = await fetch('/api/agendamentos');
        const data = await res.json();

        // Limpa todos os slots diários correntes e a gaveta de rascunhos
        document.querySelectorAll('[id^="cal-conteudo-"]').forEach(el => el.innerHTML = '');
        const listaRascunhos = document.getElementById('lista-rascunhos');
        if (listaRascunhos) listaRascunhos.innerHTML = '';
        let countRascunhos = 0;

        if (!data.agendamentos || data.agendamentos.length === 0) {
            if (listaRascunhos) listaRascunhos.innerHTML = '<p class="text-xs text-zinc-400 text-center py-4">Nenhuma ideia guardada.</p>';
            // Ainda carrega lembretes mesmo sem agendamentos
            await carregarLembretes();
            return;
        }

        data.agendamentos.forEach(item => {
            if (item.status === 'RASCUNHO' || !item.data_agendada) {
                // RENDERIZAR NA GAVETA DE RASCUNHOS
                countRascunhos++;
                if (listaRascunhos) {
                    let legendaPreview = (item.legenda || '').substring(0, 80);
                    let rascunhoHtml = `
                        <div class="bg-white border border-amber-200 rounded-lg p-3 shadow-sm cursor-grab hover:shadow-md hover:-translate-y-0.5 transition-all group relative flex gap-3 items-center"
                             draggable="true"
                             data-agendamento-id="${item.id}"
                             data-tipo="post"
                             ondragstart="onDragStartCard(event)"
                             ondragend="onDragEndCard(event)">
                            
                            ${item.arquivo ? `
                            <div class="w-12 h-12 rounded bg-zinc-100 shrink-0 overflow-hidden border border-zinc-200">
                                <img src="/uploads/${item.arquivo}" class="w-full h-full object-cover">
                            </div>` : `
                            <div class="w-12 h-12 rounded bg-amber-50 shrink-0 flex items-center justify-center border border-amber-100 text-amber-400">
                                <i data-lucide="type" class="w-5 h-5"></i>
                            </div>`}
                            
                            <div class="flex-1 min-w-0">
                                <p class="text-xs text-zinc-600 line-clamp-2">${legendaPreview || '<em class="text-zinc-400">Sem texto</em>'}</p>
                            </div>
                            
                            <button onclick="deletarAgendamento(${item.id}); event.stopPropagation();" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-all shrink-0" title="Apagar Ideia">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    `;
                    listaRascunhos.innerHTML += rascunhoHtml;
                }
                return; // Pula a renderização no calendário
            }
            let partesDataStr = item.data_agendada.split('T');
            let diaIdBase = partesDataStr[0];
            let horaAbreviada = partesDataStr[1] ? partesDataStr[1].substring(0, 5) : '';

            let celulaAlvo = document.getElementById(`cal-conteudo-${diaIdBase}`);
            if (!celulaAlvo) return;

            // Ícones e cores por status
            let colorBorder = 'border-pink-200';
            let colorBg = 'bg-pink-50/50';
            let txtColor = 'text-pink-700';
            let statusIcon = 'clock';
            let statusLabel = 'Pendente';

            if (item.status === 'PUBLICADO') {
                colorBorder = 'border-green-300'; colorBg = 'bg-green-50'; txtColor = 'text-green-700';
                statusIcon = 'check-circle'; statusLabel = 'Publicado';
            } else if (item.status === 'ERRO') {
                colorBorder = 'border-red-300'; colorBg = 'bg-red-50'; txtColor = 'text-red-700';
                statusIcon = 'alert-circle'; statusLabel = 'Erro';
            }

            let legendaPreview = (item.legenda || '').substring(0, 60);

            let cardHtml = `
                <div class="${colorBg} border ${colorBorder} rounded px-2 py-1.5 flex items-center gap-2 group/card relative shadow-sm cursor-grab hover:shadow hover:-translate-y-0.5 transition-all"
                     draggable="true"
                     data-agendamento-id="${item.id}"
                     data-tipo="post"
                     data-legenda="${legendaPreview.replace(/"/g, '&quot;')}"
                     data-imagem="/uploads/${item.arquivo}"
                     data-hora="${horaAbreviada}"
                     data-status="${statusLabel}"
                     ondragstart="onDragStartCard(event)"
                     ondragend="onDragEndCard(event)"
                     onmouseenter="mostrarTooltip(event, this)"
                     onmouseleave="esconderTooltip()"
                     onclick="event.stopPropagation()">
                    <div class="w-6 h-6 rounded shrink-0 overflow-hidden bg-white/50 border border-white/40">
                        <img src="/uploads/${item.arquivo}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[10px] font-black ${txtColor} truncate flex items-center gap-1"><i data-lucide="${statusIcon}" class="w-2.5 h-2.5"></i> ${horaAbreviada} • ${statusLabel}</p>
                    </div>
                    <button onclick="deletarAgendamento(${item.id}); event.stopPropagation();" class="absolute top-1 right-1 opacity-0 group-hover/card:opacity-100 p-0.5 rounded text-red-500 hover:bg-red-100 transition-colors">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                </div>
            `;
            celulaAlvo.innerHTML += cardHtml;
        });

        if (countRascunhos === 0 && listaRascunhos) {
            listaRascunhos.innerHTML = '<p class="text-xs text-zinc-400 text-center py-4">Nenhuma ideia guardada.</p>';
        }

        // Carrega lembretes depois dos posts
        await carregarLembretes();

        // Popula a aba lateral de agendados
        popularAgendadosLateral(data.agendamentos);

        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.error("Erro ao popular posts no DB do calendário", e);
    }
}
async function deletarAgendamento(id) { if (confirm('Remover post da programação?')) { await fetch('/api/agendamentos/' + id, { method: 'DELETE' }); carregarAgendamentos(); if (window.diaAtualDoModal) abrirModalAgendamento(window.diaAtualDoModal); } }

document.getElementById('formAgendamento').addEventListener('submit', async function (event) {
    event.preventDefault(); const btn = document.getElementById('btn-salvar-post'); btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Salvando...';
    if (window.lucide) lucide.createIcons();
    try {
        const formData = new FormData(); formData.append("foto", document.getElementById('foto_upload').files[0]); formData.append("legenda", document.getElementById('legenda_post').value); formData.append("data_agendada", document.getElementById('data_agendada').value);
        const res = await fetch('/api/agendar', { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json();
            window.mostrarToast(err.detail || 'Erro ao agendar.', 'erro');
            return;
        }
        document.getElementById('formAgendamento').reset();
        document.getElementById('preview_img').classList.add('hidden');
        document.getElementById('preview_img').src = '';
        const previewTexto = document.getElementById('preview-legenda-texto');
        if (previewTexto) previewTexto.innerHTML = 'Sua legenda aparecerá aqui...';

        // Refresh in-place: recarrega posts do dia no modal sem fechar
        if (window.diaAtualDoModal) {
            document.getElementById('data_agendada').value = window.diaAtualDoModal + "T12:00";
            await popularPostsDoModal(window.diaAtualDoModal);
            // Esconde form e mostra botão de novo post
            document.getElementById('form-agendar-wrapper').classList.add('hidden');
            document.getElementById('btn-toggle-form-agendar').classList.remove('hidden');
        }
        carregarAgendamentos(); // Refresh grid do calendário
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error('Erro ao agendar:', err);
    } finally {
        btn.innerHTML = '<i data-lucide="calendar-check" class="w-5 h-5"></i> Confirmar Agendamento'; btn.disabled = false;
        if (window.lucide) lucide.createIcons();
    }
});

// --- EXPORTANDO PARA O ESCOPO GLOBAL ---
window.carregarAgendamentos = carregarAgendamentos;
window.deletarAgendamento = deletarAgendamento;
