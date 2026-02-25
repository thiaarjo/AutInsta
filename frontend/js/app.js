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

// Inicializa a primeira tela como Dashboard
iniciarDashboard();

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

    const configLocal = JSON.parse(localStorage.getItem('ig_config')) || {};

    if (!configLocal.usuario || !configLocal.senha) {
        alert("⚠️ Você precisa configurar seu Usuário e Senha na aba de Configurações antes de extrair os dados!");
        btnCanc.classList.add('hidden'); btnExec.classList.remove('hidden'); resDiv.classList.add('hidden'); load.classList.replace('flex', 'hidden');
        return;
    }

    const payload = {
        task_id: currentTaskId,
        alvo: document.getElementById('alvo').value,
        usuario: configLocal.usuario,
        senha: configLocal.senha,
        tempo_espera: parseInt(document.getElementById('tempo_espera').value) || 4,
        modo_oculto: document.getElementById('modo_oculto').checked,
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
                feedHtml += `
                    <div class="bg-white border border-zinc-200 rounded-lg flex flex-col sm:flex-row overflow-hidden shadow-sm">
                        <div class="w-full sm:w-48 h-40 bg-zinc-50 shrink-0 relative">${p.print_post ? `<img src="${p.print_post}" class="w-full h-full object-cover">` : ''}</div>
                        <div class="p-4 flex-1 min-w-0">
                            <div class="flex justify-between text-[10px] font-bold text-zinc-400 mb-2"><span>📅 ${p.data}</span><a href="${p.url_post}" target="_blank" class="text-blue-500">LINK 🔗</a></div>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="bg-zinc-50 p-3 rounded text-center"><p class="text-[8px] uppercase text-zinc-400 font-bold">Curtidas</p><p class="text-sm font-black truncate">${p.curtidas}</p></div>
                                <div class="bg-${cor}-50 p-3 rounded text-center"><p class="text-[8px] uppercase text-${cor}-600 font-bold">Engajamento</p><p class="text-sm font-black text-${cor}-700 truncate">${eng}%</p></div>
                            </div>
                        </div>
                    </div>`;
            });
            resDiv.innerHTML += `<div class="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm"><h3 class="text-xl font-black mb-4">@${res.alvo}</h3><div class="space-y-4">${feedHtml}</div></div>`;
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
    const data = JSON.parse(localStorage.getItem('ig_config')) || {};
    if (data.usuario) document.getElementById('config-usuario').value = data.usuario;
    if (data.senha) document.getElementById('config-senha').value = data.senha;
}

document.getElementById('btn-salvar-config').onclick = () => {
    const user = document.getElementById('config-usuario').value;
    const pwd = document.getElementById('config-senha').value;
    if (!user || !pwd) { alert("Preencha o usuário e senha."); return; }

    localStorage.setItem('ig_config', JSON.stringify({ usuario: user, senha: pwd }));
    alert("Configurações salvas localmente no navegador! ⚙️");
};
