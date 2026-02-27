import { converterDataString, getTimestamp, NOMES_DIAS_SEMANA, NOMES_MESES_CURTO, NOMES_MESES } from './globals.js';

document.getElementById('btn-cancelar').onclick = async () => {
    document.getElementById('btn-cancelar').innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> INTERROMPENDO...`;
    lucide.createIcons();
    if (window.currentTaskId) {
        // AGORA SIM, ELE MANDA CANCELAR A TAREFA CERTA!
        await fetch('/cancelar_bot/' + window.currentTaskId, { method: 'POST' });
    }
};

document.getElementById('bot-form').onsubmit = async (e) => {
    e.preventDefault();
    const btnExec = document.getElementById('btn-executar'), btnCanc = document.getElementById('btn-cancelar');
    const load = document.getElementById('loading-screen'), resDiv = document.getElementById('resultados-conteudo');

    // UI Reset
    btnExec.classList.add('hidden'); btnCanc.classList.remove('hidden'); resDiv.classList.add('hidden'); load.classList.replace('hidden', 'flex');
    document.getElementById('barra-progresso').style.width = '5%';
    document.getElementById('texto-porcentagem').innerText = '5%';
    document.getElementById('texto-status-robo').innerText = 'Conectando ao servidor...';

    // GERA O ID ÚNICO
    window.currentTaskId = 'task_' + Math.random().toString(36).substr(2, 9);

    // CARREGA CONFIGURACOES DIRETAMENTE DO BANCO ANTES DE EXECUTAR
    let configDB = {};
    try {
        const confRes = await fetch('/api/configuracoes');
        configDB = await confRes.json();
    } catch (e) {
        console.error("Falha ao carregar configuracoes globais", e);
    }

    if (!configDB.usuario || !configDB.senha) {
        window.mostrarToast("⚠️ Você precisa configurar seu Usuário e Senha na aba de Configurações antes de extrair os dados!", 'aviso');
        btnCanc.classList.add('hidden'); btnExec.classList.remove('hidden'); resDiv.classList.add('hidden'); load.classList.replace('flex', 'hidden');
        return;
    }

    const payload = {
        task_id: window.currentTaskId,
        alvo: document.getElementById('alvo').value,
        usuario: configDB.usuario,
        senha: configDB.senha,
        tempo_espera: configDB.delay_base || 4,
        modo_oculto: configDB.modo_invisivel !== undefined ? configDB.modo_invisivel : true,
        seguir_alvo: document.getElementById('seguir_alvo').checked,
        coletar_feed: document.getElementById('coletar_feed').checked,
        limite_posts: parseInt(document.getElementById('limite_posts').value) || 3,
        qtd_comentarios: parseInt(document.getElementById('qtd_comentarios').value) || 0,
        coletar_stories: document.getElementById('coletar_stories').checked
    };

    // O ESPIÃO DA BARRA DE PROGRESSO
    window.pollingInterval = setInterval(async () => {
        try {
            let res = await fetch('/api/status_tarefa/' + window.currentTaskId);
            let data = await res.json();
            document.getElementById('barra-progresso').style.width = data.progresso + '%';
            document.getElementById('texto-porcentagem').innerText = data.progresso + '%';
            document.getElementById('texto-status-robo').innerText = data.mensagem;
        } catch (e) { }
    }, 1000);

    try {
        // ENVIA PARA O BACKEND
        const req = await fetch('/executar_bot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await req.json();

        clearInterval(window.pollingInterval); // Para de espiar

        load.classList.replace('flex', 'hidden'); resDiv.classList.remove('hidden'); resDiv.innerHTML = '';
        document.getElementById('data-atualizacao').innerText = 'Atualizado: ' + getTimestamp();

        data.resultados.forEach(res => {
            let feedHtml = '';
            res.feed_posts?.forEach(p => {
                const eng = res.seguidores_matematica ? ((p.curtidas_matematica / res.seguidores_matematica) * 100).toFixed(2) : "0.00";
                const cor = eng > 3 ? 'green' : (eng > 1 ? 'amber' : 'red');
                const isFixado = p.fixado ? `<span class="bg-blue-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm absolute top-2 right-2 flex items-center gap-1"><i data-lucide="pin" class="w-2.5 h-2.5"></i> Fixado</span>` : '';

                let iconTipo = 'image';
                let bgTipo = 'bg-zinc-800 text-white';
                if (p.tipo === 'Reel') { iconTipo = 'film'; bgTipo = 'bg-pink-600 text-white'; }
                else if (p.tipo === 'Vídeo') { iconTipo = 'video'; bgTipo = 'bg-blue-600 text-white'; }
                else if (p.tipo === 'Carrossel') { iconTipo = 'layers'; bgTipo = 'bg-orange-500 text-white'; }

                const tipoBadge = p.tipo ? `<span class="${bgTipo} text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm absolute bottom-2 left-2 flex items-center gap-1"><i data-lucide="${iconTipo}" class="w-2.5 h-2.5"></i> ${p.tipo}</span>` : '';

                let divComentarios = '';
                if (p.comentarios && p.comentarios.length > 0) {
                    let linhasComentarios = p.comentarios.map(c => `
                        <div class="py-2 border-b border-zinc-100 last:border-0">
                            <span class="text-[10px] font-black text-zinc-700 block">${c.usuario}</span>
                            <span class="text-xs text-zinc-600 block leading-tight mt-0.5">${c.texto}</span>
                        </div>
                    `).join('');

                    divComentarios = `
                        <div class="mt-3 bg-zinc-50 rounded border border-zinc-200 p-3">
                            <p class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1"><i data-lucide="message-circle" class="w-3 h-3"></i> Amostra de Comentários (${p.comentarios.length})</p>
                            <div class="max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                ${linhasComentarios}
                            </div>
                        </div>
                    `;
                }

                feedHtml += `
                    <div class="bg-white border border-zinc-200 rounded-lg flex flex-col sm:flex-row overflow-hidden shadow-sm hover:border-pink-300 transition-colors">
                        <div class="w-full sm:w-48 h-40 sm:h-auto bg-zinc-100 shrink-0 relative flex items-center justify-center">
                            ${p.print_post ? `<img src="${p.print_post}" class="w-full h-full object-cover">` : '<i data-lucide="image" class="w-8 h-8 text-zinc-300"></i>'}
                            ${isFixado}
                            ${tipoBadge}
                        </div>
                        <div class="p-4 flex-1 min-w-0 flex flex-col justify-between">
                            <div class="flex justify-between items-start text-[10px] font-bold text-zinc-400 mb-2">
                                <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${p.data}</span>
                                <a href="${p.url_post}" target="_blank" class="text-pink-600 hover:text-pink-700 hover:underline flex items-center gap-1"><i data-lucide="external-link" class="w-3 h-3"></i> ABRIR</a>
                            </div>
                            <div class="grid grid-cols-2 gap-3 mt-auto">
                                <div class="bg-zinc-50 border border-zinc-100 p-2.5 rounded text-center"><p class="text-[8px] uppercase text-zinc-400 font-bold mb-0.5">Curtidas</p><p class="text-sm font-black text-zinc-800 truncate">${p.curtidas}</p></div>
                                <div class="bg-${cor}-50 border border-${cor}-100 p-2.5 rounded text-center"><p class="text-[8px] uppercase text-${cor}-600 font-bold mb-0.5">Engajamento</p><p class="text-sm font-black text-${cor}-700 truncate">${eng}%</p></div>
                            </div>
                            ${divComentarios}
                        </div>
                    </div>`;
            });

            // STORIES LOGIC
            let storiesHtml = '';
            if (res.stories && res.stories.length > 0) {
                const videos = res.stories.filter(s => s.tipo === 'Video').length;
                const fotos = res.stories.filter(s => s.tipo !== 'Video').length;

                storiesHtml = `
                <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-4 mb-5 shadow-sm">
                    <h4 class="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <i data-lucide="play-square" class="w-4 h-4 text-pink-500"></i> Resumo de Stories 
                        <span class="bg-pink-100 text-pink-700 text-[10px] px-2 py-0.5 rounded-full ml-auto">${res.stories.length} Ativos</span>
                    </h4>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-white p-3 rounded border border-zinc-100 flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><i data-lucide="video" class="w-4 h-4 text-blue-500"></i></div>
                            <div><p class="text-sm font-black text-zinc-800">${videos}</p><p class="text-[10px] text-zinc-400 font-bold uppercase">Vídeos</p></div>
                        </div>
                        <div class="bg-white p-3 rounded border border-zinc-100 flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center"><i data-lucide="image" class="w-4 h-4 text-orange-500"></i></div>
                            <div><p class="text-sm font-black text-zinc-800">${fotos}</p><p class="text-[10px] text-zinc-400 font-bold uppercase">Fotos</p></div>
                        </div>
                    </div>
                </div>`;
            } else if (payload.coletar_stories) {
                storiesHtml = `
                <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-4 mb-5 shadow-sm flex items-center gap-3 text-zinc-500">
                    <i data-lucide="info" class="w-4 h-4"></i>
                    <p class="text-xs font-medium">Nenhum story disponivel ou ativo no momento da extração.</p>
                </div>`;
            }

            resDiv.innerHTML += `
                <div class="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                    <h3 class="text-xl font-black mb-4">@${res.alvo}</h3>
                    ${storiesHtml}
                    ${feedHtml ? `<div class="space-y-4">${feedHtml}</div>` : ''}
                </div>`;
        });
        lucide.createIcons();
    } finally {
        clearInterval(window.pollingInterval);
        btnCanc.classList.add('hidden'); btnExec.classList.remove('hidden');
        document.getElementById('btn-cancelar').innerHTML = `<i data-lucide="square" class="w-4 h-4"></i> ABORTAR`;
    }
};

// --- EXPORTANDO PARA O ESCOPO GLOBAL ---
