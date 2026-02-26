lucide.createIcons();

// NAVEGAÇÃO DE ABAS
const btnTabMonitor = document.getElementById('btn-tab-monitor');
const btnTabAgendar = document.getElementById('btn-tab-agendar');
const btnTabLista = document.getElementById('btn-tab-lista');
const btnTabComparativo = document.getElementById('btn-tab-comparativo');
const btnTabConfig = document.getElementById('btn-tab-config');

const viewMonitor = document.getElementById('view-monitor');
const viewAgendar = document.getElementById('view-agendar');
const viewLista = document.getElementById('view-lista');
const viewComparativo = document.getElementById('view-comparativo');
const viewConfig = document.getElementById('view-config');

function resetarAbas() {
    viewMonitor.classList.add('hidden'); viewMonitor.classList.remove('grid');
    viewAgendar.classList.add('hidden');
    viewLista.classList.add('hidden');
    viewComparativo.classList.add('hidden');
    viewConfig.classList.add('hidden');

    const classeInativa = "pb-3 text-sm font-bold text-zinc-400 hover:text-zinc-800 border-b-2 border-transparent hover:border-zinc-300 flex items-center gap-2 transition-all whitespace-nowrap";
    btnTabMonitor.className = classeInativa;
    btnTabAgendar.className = classeInativa;
    btnTabLista.className = classeInativa;
    btnTabComparativo.className = classeInativa;
    btnTabConfig.className = classeInativa + " ml-auto";
}

btnTabComparativo.addEventListener('click', () => { resetarAbas(); viewComparativo.classList.remove('hidden'); btnTabComparativo.className = "pb-3 text-sm font-bold text-pink-600 border-b-2 border-pink-600 flex items-center gap-2 transition-all whitespace-nowrap"; iniciarDashboard(); });
btnTabMonitor.addEventListener('click', () => { resetarAbas(); viewMonitor.classList.remove('hidden'); viewMonitor.classList.add('grid'); btnTabMonitor.className = "pb-3 text-sm font-bold text-pink-600 border-b-2 border-pink-600 flex items-center gap-2 transition-all whitespace-nowrap"; });
btnTabAgendar.addEventListener('click', () => { resetarAbas(); viewAgendar.classList.remove('hidden'); btnTabAgendar.className = "pb-3 text-sm font-bold text-pink-600 border-b-2 border-pink-600 flex items-center gap-2 transition-all whitespace-nowrap"; });
btnTabLista.addEventListener('click', () => { resetarAbas(); viewLista.classList.remove('hidden'); btnTabLista.className = "pb-3 text-sm font-bold text-pink-600 border-b-2 border-pink-600 flex items-center gap-2 transition-all whitespace-nowrap"; carregarAgendamentos(); });
btnTabConfig.addEventListener('click', () => { resetarAbas(); viewConfig.classList.remove('hidden'); btnTabConfig.className = "pb-3 text-sm font-bold text-pink-600 border-b-2 border-pink-600 flex items-center gap-2 transition-all whitespace-nowrap ml-auto"; carregarConfigUI(); });

// Inicializa a primeira tela como Dashboard (Relatórios / Gráficos) e força a classe CSS correta
btnTabComparativo.click();

// DASHBOARD LOGIC
let dadosHistoricosDB = { seguidores: [], posts: [] };
let chartSeguidores = null; let chartPosts = null;

function converterDataString(dataStr) {
    if (!dataStr || dataStr === "Data N/A") return new Date(0);
    try { let p = dataStr.split(' '); let d = p[0].split('/'); return new Date(d[2], d[1] - 1, d[0]); } catch (e) { return new Date(0); }
}

async function iniciarDashboard() {
    const loading = document.getElementById('loading-graficos'); const painel = document.getElementById('painel-graficos');
    loading.classList.remove('hidden'); loading.classList.add('flex'); painel.classList.add('hidden');
    try {
        const res = await fetch('/api/historico_graficos'); dadosHistoricosDB = await res.json();
        let perfisUnicos = new Set([...dadosHistoricosDB.seguidores.map(s => s.perfil), ...dadosHistoricosDB.posts.map(p => p.perfil)]);
        const seletor = document.getElementById('seletor-perfil'); seletor.innerHTML = '';
        if (perfisUnicos.size === 0) { seletor.innerHTML = '<option value="">Nenhum dado no banco</option>'; loading.classList.replace('flex', 'hidden'); return; }
        perfisUnicos.forEach(p => { let opt = document.createElement('option'); opt.value = p; opt.text = '@' + p; seletor.appendChild(opt); });
        atualizarGraficosTela(seletor.value);
        seletor.addEventListener('change', (e) => atualizarGraficosTela(e.target.value));
        loading.classList.replace('flex', 'hidden'); painel.classList.remove('hidden'); painel.classList.add('flex');
    } catch (erro) { loading.innerHTML = `<i data-lucide="alert-triangle" class="w-8 h-8 mb-3 text-red-500"></i><p class="font-medium text-sm text-red-600">Erro ao buscar histórico do banco.</p>`; lucide.createIcons(); }
}

function atualizarGraficosTela(perfilSelecionado) {
    let histSeg = dadosHistoricosDB.seguidores.filter(s => s.perfil === perfilSelecionado); let histPosts = dadosHistoricosDB.posts.filter(p => p.perfil === perfilSelecionado);
    let agora = new Date(); let data7 = new Date(); data7.setDate(agora.getDate() - 7); let data30 = new Date(); data30.setDate(agora.getDate() - 30);
    let posts7 = histPosts.filter(p => converterDataString(p.data) >= data7); let posts30 = histPosts.filter(p => converterDataString(p.data) >= data30);
    const calcMedia = (arr) => arr.length === 0 ? 0 : Math.round(arr.reduce((acc, p) => acc + p.curtidas, 0) / arr.length);
    document.getElementById('card-total-posts').innerText = histPosts.length; document.getElementById('card-media-geral').innerText = calcMedia(histPosts).toLocaleString('pt-BR');
    document.getElementById('card-media-7').innerText = calcMedia(posts7).toLocaleString('pt-BR'); document.getElementById('card-media-30').innerText = calcMedia(posts30).toLocaleString('pt-BR');
    if (chartSeguidores) chartSeguidores.destroy(); if (chartPosts) chartPosts.destroy();
    let ctxSeg = document.getElementById('graficoSeguidores').getContext('2d');
    chartSeguidores = new Chart(ctxSeg, { type: 'line', data: { labels: histSeg.map(s => s.data.split(' ')[0]), datasets: [{ label: 'Seguidores', data: histSeg.map(s => s.valor), borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderWidth: 3, tension: 0.3, fill: true, pointRadius: 4, pointHoverRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: false } } } });
    let ctxPosts = document.getElementById('graficoPosts').getContext('2d');
    chartPosts = new Chart(ctxPosts, { type: 'bar', data: { labels: histPosts.map(p => p.data.split(' ')[0]), datasets: [{ label: 'Curtidas no Post', data: histPosts.map(p => p.curtidas), backgroundColor: '#db2777', borderWidth: 0, borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } } });
}

// AGENDAMENTO LOGIC
async function carregarAgendamentos() {
    const grid = document.getElementById('grid-agendamentos'); grid.innerHTML = '<div class="col-span-full flex flex-col items-center justify-center py-12 text-zinc-400"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mb-3"></i>Carregando...</div>'; lucide.createIcons();
    try {
        const res = await fetch('/api/agendamentos'); const data = await res.json();
        if (data.agendamentos.length === 0) { grid.innerHTML = '<div class="col-span-full text-center py-16 text-zinc-400 border-2 border-dashed border-zinc-200 rounded-xl bg-white"><p>Nenhum post agendado.</p></div>'; return; }
        grid.innerHTML = '';
        data.agendamentos.forEach(item => {
            let stClass = item.status === 'PUBLICADO' ? 'bg-green-100 text-green-700' : (item.status === 'ERRO' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700');
            grid.innerHTML += `<div class="bg-white border border-zinc-200 rounded-xl p-4 flex gap-4"><div class="w-20 h-20 bg-zinc-100 rounded overflow-hidden shrink-0"><img src="/uploads/${item.arquivo}" class="w-full h-full object-cover"></div><div class="flex-1"><div class="flex justify-between"><span class="text-[9px] font-bold px-2 py-0.5 rounded ${stClass}">${item.status}</span><button onclick="deletarAgendamento(${item.id})" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div><p class="text-xs text-zinc-500 mt-2 font-bold">${item.data_agendada.replace('T', ' às ')}</p></div></div>`;
        }); lucide.createIcons();
    } catch (e) { }
}
async function deletarAgendamento(id) { if (confirm('Cancelar?')) { await fetch('/api/agendamentos/' + id, { method: 'DELETE' }); carregarAgendamentos(); } }

document.getElementById('foto_upload').addEventListener('change', function (e) { if (e.target.files[0]) { const reader = new FileReader(); reader.onload = function (evt) { document.getElementById('preview_img').src = evt.target.result; document.getElementById('preview_img').classList.remove('hidden'); }; reader.readAsDataURL(e.target.files[0]); } });

document.getElementById('formAgendamento').addEventListener('submit', async function (event) {
    event.preventDefault(); const btn = document.getElementById('btn-salvar-post'); btn.disabled = true; btn.innerHTML = 'Salvando...';
    const formData = new FormData(); formData.append("foto", document.getElementById('foto_upload').files[0]); formData.append("legenda", document.getElementById('legenda_post').value); formData.append("data_agendada", document.getElementById('data_agendada').value);
    await fetch('/api/agendar', { method: 'POST', body: formData });
    document.getElementById('formAgendamento').reset(); document.getElementById('preview_img').classList.add('hidden');
    btn.innerHTML = 'Confirmar Agendamento'; btn.disabled = false; alert("Agendado!");
});

// ==========================================
// 🚀 O NOVO CÉREBRO DA EXTRAÇÃO (COM PROGRESSO REAL E ID ÚNICO)
// ==========================================
function getTimestamp() { return new Date().toLocaleTimeString('pt-BR') + ' - ' + new Date().toLocaleDateString('pt-BR'); }

let currentTaskId = null; // Guarda o ID da tarefa atual para poder cancelar
let pollingInterval = null; // Guarda o loop do espião

document.getElementById('btn-cancelar').onclick = async () => {
    document.getElementById('btn-cancelar').innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> INTERROMPENDO...`;
    lucide.createIcons();
    if (currentTaskId) {
        // AGORA SIM, ELE MANDA CANCELAR A TAREFA CERTA!
        await fetch('/cancelar_bot/' + currentTaskId, { method: 'POST' });
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
    currentTaskId = 'task_' + Math.random().toString(36).substr(2, 9);

    // CARREGA CONFIGURACOES DIRETAMENTE DO BANCO ANTES DE EXECUTAR
    let configDB = {};
    try {
        const confRes = await fetch('/api/configuracoes');
        configDB = await confRes.json();
    } catch (e) {
        console.error("Falha ao carregar configuracoes globais", e);
    }

    if (!configDB.usuario || !configDB.senha) {
        alert("⚠️ Você precisa configurar seu Usuário e Senha na aba de Configurações antes de extrair os dados!");
        btnCanc.classList.add('hidden'); btnExec.classList.remove('hidden'); resDiv.classList.add('hidden'); load.classList.replace('flex', 'hidden');
        return;
    }

    const payload = {
        task_id: currentTaskId,
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
    pollingInterval = setInterval(async () => {
        try {
            let res = await fetch('/api/status_tarefa/' + currentTaskId);
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

        clearInterval(pollingInterval); // Para de espiar

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

                feedHtml += `
                    <div class="bg-white border border-zinc-200 rounded-lg flex flex-col sm:flex-row overflow-hidden shadow-sm hover:border-pink-300 transition-colors">
                        <div class="w-full sm:w-48 h-40 bg-zinc-100 shrink-0 relative flex items-center justify-center">
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
        clearInterval(pollingInterval);
        btnCanc.classList.add('hidden'); btnExec.classList.remove('hidden');
        document.getElementById('btn-cancelar').innerHTML = `<i data-lucide="square" class="w-4 h-4"></i> ABORTAR`;
    }
};

// ==========================================
// 🚀 CONFIGURAÇÕES PÚBLICAS
// ==========================================

function carregarConfigUI() {
    fetch('/api/configuracoes')
        .then(res => res.json())
        .then(data => {
            const elUsr = document.getElementById('config_usuario') || document.getElementById('config-usuario');
            const elSen = document.getElementById('config_senha') || document.getElementById('config-senha');
            const elDel = document.getElementById('config_delay') || document.getElementById('tempo_espera'); // Fallback map
            const elHid = document.getElementById('config_headless') || document.getElementById('modo_oculto');

            if (elUsr) elUsr.value = data.usuario || "";
            if (elSen) elSen.value = data.senha || "";
            if (elDel && data.delay_base) elDel.value = data.delay_base;
            if (elHid && data.modo_invisivel !== undefined) elHid.checked = data.modo_invisivel;
        })
        .catch(err => console.error("Erro ao carregar configuracoes:", err));
}

const formConfig = document.getElementById('formConfig');
if (formConfig) {
    formConfig.addEventListener('submit', async (e) => {
        // ESSENCIAL: Impede o form de dar reload na página (o que causa o sumiço do flex e desalinha o layout)
        e.preventDefault();

        const btnSalvar = formConfig.querySelector('button[type="submit"]');
        const btnTextoOriginal = btnSalvar ? btnSalvar.innerHTML : "Salvar Alterações";

        const elUsr = document.getElementById('config_usuario') || document.getElementById('config-usuario');
        const elSen = document.getElementById('config_senha') || document.getElementById('config-senha');
        const elDel = document.getElementById('config_delay') || document.getElementById('tempo_espera');
        const elHid = document.getElementById('config_headless') || document.getElementById('modo_oculto');

        const user = elUsr ? elUsr.value : '';
        const pwd = elSen ? elSen.value : '';
        const delay = elDel ? parseInt(elDel.value) : 4;
        const invisivel = elHid ? elHid.checked : true;

        if (!user || !pwd) { alert("Preencha o usuário e senha."); return; }

        if (btnSalvar) {
            btnSalvar.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Salvando...`;
            lucide.createIcons();
            btnSalvar.disabled = true;
        }

        try {
            const formData = new FormData();
            formData.append("usuario", user);
            formData.append("senha", pwd);
            formData.append("delay_base", delay);
            formData.append("modo_invisivel", invisivel);

            const response = await fetch('/api/configuracoes', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const msg = document.getElementById('config-salvo-msg');
                if (msg) {
                    msg.style.opacity = '1';
                    setTimeout(() => msg.style.opacity = '0', 3000);
                }
            } else {
                alert("Erro ao salvar configurações.");
            }
        } catch (e) {
            console.error(e);
            alert("Falha de rede ao salvar configurações.");
        } finally {
            if (btnSalvar) {
                btnSalvar.innerHTML = btnTextoOriginal;
                btnSalvar.disabled = false;
            }
        }
    });
}
