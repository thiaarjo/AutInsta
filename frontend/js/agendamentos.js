import { converterDataString, getTimestamp, NOMES_DIAS_SEMANA, NOMES_MESES_CURTO, NOMES_MESES } from './globals.js';

async function carregarAgendamentos() {
    try {
        const res = await fetch('/api/agendamentos', { cache: 'no-store' });
        const data = await res.json();

        // Limpa todos os slots diários correntes e a gaveta de rascunhos
        document.querySelectorAll('[id^="cal-conteudo-"]').forEach(el => el.innerHTML = '');
        const listaRascunhos = document.getElementById('lista-rascunhos');
        if (listaRascunhos) listaRascunhos.innerHTML = '';
        let countRascunhos = 0;

        if (!data.agendamentos || data.agendamentos.length === 0) {
            if (listaRascunhos) listaRascunhos.innerHTML = '<p class="text-xs text-zinc-400 text-center py-4">Nenhuma ideia guardada.</p>';
            popularAgendadosLateral([]); // CLEAR THE TAB!
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
                <div class="${colorBg} border ${colorBorder} rounded px-1.5 py-1.5 flex flex-col gap-1.5 group/card relative shadow-sm cursor-grab hover:shadow-md hover:-translate-y-0.5 transition-all"
                     draggable="true"
                     data-agendamento-id="${item.id}"
                     data-tipo="post"
                     data-legenda="${legendaPreview.replace(/"/g, '&quot;')}"
                     data-imagem="${item.arquivo ? '/uploads/' + item.arquivo : ''}"
                     data-hora="${horaAbreviada}"
                     data-status="${statusLabel}"
                     ondragstart="onDragStartCard(event)"
                     ondragend="onDragEndCard(event)"
                     onmouseenter="mostrarTooltip(event, this)"
                     onmouseleave="esconderTooltip()"
                     onclick="event.stopPropagation()">
                     
                    <!-- Cabeçalho (Hora + Status + Botões) -->
                    <div class="flex items-center justify-between w-full pr-1">
                        <span class="text-[9px] font-black ${txtColor} flex items-center gap-1 leading-none tracking-wide"><i data-lucide="${statusIcon}" class="w-2.5 h-2.5"></i> ${horaAbreviada}</span>
                        <div class="flex gap-1">

                            <button onclick="deletarAgendamento(${item.id}); event.stopPropagation();" class="opacity-0 group-hover/card:opacity-100 rounded text-red-500 hover:text-red-700 transition-colors shrink-0" title="Apagar">
                                <i data-lucide="x" class="w-3 h-3"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Mídia / Ícone Placeholder -->
                    ${item.arquivo ? `
                    <div class="h-10 w-full rounded overflow-hidden bg-white border border-white/40 shadow-sm relative">
                        <img src="/uploads/${item.arquivo}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');">
                        <div class="hidden absolute inset-0 bg-white/50 flex items-center justify-center">
                            <i data-lucide="image-off" class="w-4 h-4 text-zinc-400"></i>
                        </div>
                    </div>` : `
                    <div class="h-10 w-full rounded bg-white/50 border border-white/40 shadow-sm flex items-center justify-center">
                        <i data-lucide="type" class="w-4 h-4 text-zinc-400"></i>
                    </div>`}
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
async function deletarAgendamento(id) {
    const isConfirmado = await confirmarAcao('Remover post da programação?');
    if (isConfirmado) {
        await fetch('/api/agendamentos/' + id, { method: 'DELETE' });
        await carregarAgendamentos();
        if (window.diaAtualDoModal) {
            await popularPostsDoModal(window.diaAtualDoModal);
        }
    }
}

document.getElementById('formAgendamento').addEventListener('submit', async function (event) {
    event.preventDefault(); const btn = document.getElementById('btn-salvar-post'); btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Salvando...';
    if (window.lucide) lucide.createIcons();
    try {
        const midiasFinais = await window.obterMidiasProcessadas();
        if (!midiasFinais || midiasFinais.length === 0) {
            window.mostrarToast('Selecione pelo menos uma imagem ou vídeo para publicar.', 'erro');
            return;
        }

        const dataEscolhida = document.getElementById('data_agendada').value;
        if (!dataEscolhida) {
            window.mostrarToast('Escolha um horário para publicar o post no futuro.', 'erro');
            return;
        }

        const formData = new FormData();
        midiasFinais.forEach(m => formData.append("midias", m));
        formData.append("legenda", document.getElementById('legenda_post').value);
        formData.append("data_agendada", dataEscolhida);

        const res = await fetch('/api/agendar', { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json();
            window.mostrarToast(err.detail || 'Erro ao agendar.', 'erro');
            return;
        }
        document.getElementById('formAgendamento').reset();
        if (window.limparCropper) window.limparCropper();
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

// --- PUBLICAR AGORA (Imediato via Selenium) ---
const btnPublicarAgora = document.getElementById('btn-publicar-agora');
if (btnPublicarAgora) {
    btnPublicarAgora.addEventListener('click', async function () {
        const btn = this;
        const legendaInput = document.getElementById('legenda_post');

        if (!window.janelaMidias || window.janelaMidias.length === 0) {
            window.mostrarToast('Selecione pelo menos uma mídia antes de publicar.', 'erro');
            return;
        }

        const isConfirmado = await window.confirmarAcao('Publicar agora no Instagram? O robô abrirá o navegador e fará o post imediatamente.');
        if (!isConfirmado) return;

        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Publicando...';
        if (window.lucide) lucide.createIcons();

        try {
            const midiasFinais = await window.obterMidiasProcessadas();
            if (!midiasFinais || midiasFinais.length === 0) {
                window.mostrarToast('Erro ao processar as mídias.', 'erro');
                btn.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i> Publicar Agora';
                btn.disabled = false;
                return;
            }

            const formData = new FormData();
            midiasFinais.forEach(m => formData.append("midias", m));
            formData.append("legenda", legendaInput.value);

            const res = await fetch('/api/publicar_agora', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                window.mostrarToast(err.detail || 'Erro ao publicar imediatamente.', 'erro');
                btn.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i> Publicar Agora';
                btn.disabled = false;
                if (window.lucide) lucide.createIcons();
                return;
            }

            const dados = await res.json();

            if (dados.post_id) {
                // Inicia o rastreio via botão
                btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Iniciando robô...';
                if (window.lucide) lucide.createIcons();

                let checkLogs = setInterval(async () => {
                    try {
                        const logsRes = await fetch(`/api/logs_postagem/${dados.post_id}`);
                        if (logsRes.ok) {
                            const logs = await logsRes.json();
                            if (logs && logs.length > 0) {
                                // Pega a ultima mensagem
                                const uLog = logs[logs.length - 1];
                                btn.innerHTML = `<i data-lucide="${uLog.tipo === 'ERRO' || uLog.tipo === 'ERROR' ? 'alert-circle' : 'loader-2'}" class="w-4 h-4 ${uLog.tipo === 'ERRO' || uLog.tipo === 'ERROR' ? 'text-red-500' : 'animate-spin'}"></i> ${uLog.mensagem.substring(0, 30)}...`;
                                if (window.lucide) lucide.createIcons();

                                const hasEnded = logs.find(log => log.tipo === 'SUCESSO' || log.tipo === 'ERRO' || log.tipo === 'ERROR');
                                if (hasEnded) {
                                    clearInterval(checkLogs);

                                    if (hasEnded.tipo === 'SUCESSO') {
                                        window.mostrarToast('Postagem publicada com sucesso no Instagram!', 'sucesso');
                                        document.getElementById('formAgendamento').reset();
                                        if (window.limparCropper) window.limparCropper();
                                        const previewTexto = document.getElementById('preview-legenda-texto');
                                        if (previewTexto) previewTexto.innerHTML = 'Sua legenda aparecerá aqui...';

                                        if (window.diaAtualDoModal) {
                                            document.getElementById('form-agendar-wrapper').classList.add('hidden');
                                            document.getElementById('btn-toggle-form-agendar').classList.remove('hidden');
                                        }
                                        await carregarAgendamentos();
                                    } else {
                                        window.mostrarToast('Erro durante a publicação automática.', 'erro');
                                    }

                                    btn.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i> Publicar Agora';
                                    btn.disabled = false;
                                    if (window.lucide) lucide.createIcons();
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Erro no polling de logs do botao:", e);
                    }
                }, 2000);
            } else {
                throw new Error("ID não retornado pelo servidor");
            }

        } catch (err) {
            console.error('Erro ao publicar:', err);
            window.mostrarToast('Erro interno ao tentar publicar.', 'erro');
            btn.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i> Publicar Agora';
            btn.disabled = false;
            if (window.lucide) lucide.createIcons();
        }
    });
} else {
    console.warn('[agendamentos.js] Botão #btn-publicar-agora não encontrado no DOM.');
}

// --- EXPORTANDO PARA O ESCOPO GLOBAL ---
window.carregarAgendamentos = carregarAgendamentos;
window.deletarAgendamento = deletarAgendamento;
