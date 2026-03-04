import { converterDataString, getTimestamp, NOMES_DIAS_SEMANA, NOMES_MESES_CURTO, NOMES_MESES } from './globals.js';

async function iniciarDashboard() {
    const loading = document.getElementById('loading-graficos');
    const painel = document.getElementById('painel-graficos');
    const seletor = document.getElementById('seletor-perfil');
    const btnSync = document.getElementById('btn-sync-graficos');

    const isSyncClicked = !!btnSync; // true = chamado pelo botão Sync, false = navegação normal da tab
    const perfilSalvo = isSyncClicked ? (seletor.value || '') : ''; // Só restaura no Sync
    const htmlOrigBtn = btnSync ? btnSync.innerHTML : '';

    if (btnSync) {
        btnSync.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Atualizando...`;
        lucide.createIcons();
    } else {
        loading.classList.remove('hidden'); loading.classList.add('flex'); painel.classList.add('hidden');
    }

    try {
        const res = await fetch('/api/historico_graficos'); window.dadosHistoricosDB = await res.json();

        // Busca todos os perfis do banco (não depende de ter posts/seguidores)
        const resPerfis = await fetch('/api/perfis');
        const dataPerfis = await resPerfis.json();
        let perfisUnicos = new Set(dataPerfis.perfis || []);

        seletor.innerHTML = '';

        // Sempre adiciona opção vazia no topo
        let optVazio = document.createElement('option');
        optVazio.value = '';
        optVazio.text = 'Selecione um perfil...';
        seletor.appendChild(optVazio);

        if (perfisUnicos.size === 0) {
            loading.classList.replace('flex', 'hidden');
            if (btnSync) btnSync.innerHTML = htmlOrigBtn;
            return;
        }

        perfisUnicos.forEach(p => { let opt = document.createElement('option'); opt.value = p; opt.text = '@' + p; seletor.appendChild(opt); });

        // Restaura APENAS se veio do Sync (usuário já estava olhando um perfil)
        if (perfilSalvo && perfisUnicos.has(perfilSalvo)) {
            seletor.value = perfilSalvo;
            atualizarGraficosTela(perfilSalvo);
        } else {
            // Se entrou na aba "do zero", garante que a visualização está 100% limpa (sem heranças do browser)
            seletor.value = '';
            limparTelaUI();
        }

        // Se for a primeira vez que entra na tela o evento deve ser atrelado
        if (!seletor.dataset.escutando) {
            seletor.addEventListener('change', (e) => {
                window.postSelecionadoAtual = "";
                if (e.target.value) {
                    atualizarGraficosTela(e.target.value);
                } else {
                    limparTelaUI();
                }
            });
            seletor.dataset.escutando = "true";
        }

        loading.classList.replace('flex', 'hidden'); painel.classList.remove('hidden'); painel.classList.add('flex');
        conectarBotaoLimpar();
    } catch (erro) {
        console.error(erro);
        loading.innerHTML = `<i data-lucide="alert-triangle" class="w-8 h-8 mb-3 text-red-500"></i><p class="font-medium text-sm text-red-600">Erro ao buscar histórico do banco.</p>`; lucide.createIcons();
    } finally {
        if (btnSync) {
            btnSync.innerHTML = htmlOrigBtn;
            if (window.lucide) lucide.createIcons();
        }
    }
}

function limparTelaUI() {
    const seletor = document.getElementById('seletor-perfil');
    if (seletor) seletor.value = '';

    const ids = ['card-total-posts', 'card-media-7', 'card-media-30', 'card-media-geral'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.innerText = '0'; });

    if (window.chartSeguidores) { window.chartSeguidores.destroy(); window.chartSeguidores = null; }
    if (window.chartPosts) { window.chartPosts.destroy(); window.chartPosts = null; }

    ['graficoSeguidores', 'graficoPosts'].forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    });

    const galPosts = document.getElementById('galeria-posts');
    if (galPosts) galPosts.innerHTML = '<p class="col-span-full text-center text-zinc-400 text-sm py-6">Selecione um perfil para ver os posts.</p>';
    const contPosts = document.getElementById('galeria-contador');
    if (contPosts) contPosts.textContent = '0 posts';

    const galStories = document.getElementById('galeria-stories');
    if (galStories) galStories.innerHTML = '<p class="col-span-full text-center text-zinc-400 text-sm py-6">Selecione um perfil para ver os stories.</p>';
    const contStories = document.getElementById('galeria-stories-contador');
    if (contStories) contStories.textContent = '0 stories';

    const tbody = document.getElementById('tabela-historico-detalhado');
    if (tbody) tbody.innerHTML = '<tr><td colspan="2" class="py-8 text-center text-zinc-400 text-sm">Aguardando dados...</td></tr>';

    window.postSelecionadoAtual = "";
}



function popularGaleriaPosts(perfilSelecionado) {
    const galeria = document.getElementById('galeria-posts');
    const contador = document.getElementById('galeria-contador');
    if (!galeria) return;

    const perfilLimpo = perfilSelecionado.replace('@', '').toLowerCase();
    const brutos = (window.dadosHistoricosDB.posts_brutos || []).filter(p => p.perfil.toLowerCase() === perfilLimpo);

    console.log('[DEBUG GALERIA] Perfil Original:', perfilSelecionado, '| Perfil Limpo:', perfilLimpo);
    console.log('[DEBUG GALERIA] Total Brutos:', window.dadosHistoricosDB.posts_brutos?.length, '| Filtrados:', brutos.length);

    // Agrupa por url_post único, contando extrações e pegando dados mais recentes
    const mapaUnico = {};
    brutos.forEach(p => {
        if (!p.url_post) return;
        if (!mapaUnico[p.url_post]) {
            mapaUnico[p.url_post] = {
                ...p,
                vezes_extraido: 1,
                primeira_extracao: p.data_extracao,
                ultima_extracao: p.data_extracao
            };
        } else {
            mapaUnico[p.url_post].vezes_extraido++;
            // Mantém os curtidas mais recentes
            if (p.data_extracao > mapaUnico[p.url_post].ultima_extracao) {
                mapaUnico[p.url_post].curtidas = p.curtidas;
                mapaUnico[p.url_post].ultima_extracao = p.data_extracao;
                if (p.print) mapaUnico[p.url_post].print = p.print;
            }
            if (p.data_extracao < mapaUnico[p.url_post].primeira_extracao) {
                mapaUnico[p.url_post].primeira_extracao = p.data_extracao;
            }
        }
    });

    const postsUnicos = Object.values(mapaUnico);
    if (contador) contador.textContent = postsUnicos.length + ' post' + (postsUnicos.length !== 1 ? 's' : '');

    if (postsUnicos.length === 0) {
        galeria.innerHTML = '<p class="col-span-full text-center text-zinc-400 text-sm py-6">Nenhum post extraído para este perfil.</p>';
        return;
    }

    // Formata data "2026-02-26 15:30:00" -> "26/02 15:30"
    function fmtData(d) {
        if (!d) return 'N/A';
        try {
            const partes = d.split(' ');
            const ymd = partes[0].split('-');
            const hora = partes[1] ? partes[1].substring(0, 5) : '';
            return `${ymd[2]}/${ymd[1]} ${hora}`;
        } catch { return d; }
    }

    // Formata data de publicação "26/02/2026 22:50" -> "26/02/2026"
    function fmtPub(d) {
        if (!d) return 'N/A';
        return d.split(' ')[0];
    }

    // Sort from newest to oldest by original publication date (data_pub)
    postsUnicos.sort((a, b) => {
        const dateA = a.data_pub ? getTimestamp(a.data_pub) : 0;
        const dateB = b.data_pub ? getTimestamp(b.data_pub) : 0;
        return dateB - dateA;
    });

    galeria.innerHTML = '';

    postsUnicos.forEach(p => {
        const imgSrc = p.print || null;

        const card = document.createElement('div');
        card.className = `bg-white rounded-lg border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-pink-400 flex flex-col sm:flex-row border-zinc-200`;
        card.onclick = () => {
            abrirModalAnalyticsPost(p, perfilSelecionado);
        };

        card.innerHTML = `
            <div class="w-full sm:w-28 h-28 bg-zinc-100 shrink-0 flex items-center justify-center overflow-hidden">
                ${imgSrc ? `<img src="${imgSrc}" class="w-full h-full object-cover" onerror="this.style.display='none'">` : '<i data-lucide="image" class="w-6 h-6 text-zinc-300"></i>'}
            </div>
            <div class="p-3 flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[10px] font-bold text-zinc-500 flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> Publicado: ${fmtPub(p.data_pub)}</span>
                    <span class="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">${p.curtidas.toLocaleString('pt-BR')} curtidas</span>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[10px] font-bold text-zinc-400 flex items-center gap-1"><i data-lucide="scan-search" class="w-3 h-3"></i> Ultima extração: ${fmtData(p.ultima_extracao)}</span>
                    <span class="text-[10px] font-bold ${p.vezes_extraido > 1 ? 'text-violet-600 bg-violet-50' : 'text-zinc-500 bg-zinc-100'} px-1.5 py-0.5 rounded">${p.vezes_extraido}x extraído</span>
                </div>
                <a href="${p.url_post}" target="_blank" onclick="event.stopPropagation()" class="text-[10px] font-bold text-blue-500 hover:underline truncate block"><i data-lucide="external-link" class="w-3 h-3 inline"></i> Ver no Instagram</a>
            </div>
        `;
        galeria.appendChild(card);
    });
    lucide.createIcons();
}

function atualizarGraficosTela(perfilSelecionado) {
    const limpo = perfilSelecionado.replace('@', '').toLowerCase();
    let histSeg = window.dadosHistoricosDB.seguidores.filter(s => s.perfil.toLowerCase() === limpo);
    let histPosts = window.dadosHistoricosDB.posts.filter(p => p.perfil.toLowerCase() === limpo);

    const postSelecionado = window.postSelecionadoAtual || '';

    let cardsOrigemDados = histPosts;
    let tituloGrafico = 'Desempenho de Curtidas por Post';
    let labelsBarras = [];
    let dadosBarras = [];

    if (postSelecionado) {
        // MODO: Post Específico
        const brutosFiltrados = (window.dadosHistoricosDB.posts_brutos || []).filter(p => p.perfil.toLowerCase() === limpo && p.url_post === postSelecionado);
        cardsOrigemDados = brutosFiltrados; // Os cards agora usam o histórico das leituras do post atual
        tituloGrafico = 'Evolução de Curtidas (Post Específico)';

        labelsBarras = brutosFiltrados.map(p => {
            try {
                const partes = p.data_extracao.split(' ');
                const d = partes[0].split('-');
                const hora = partes[1] ? partes[1].substring(0, 5) : '';
                return `${d[2]}/${d[1]} ${hora}`;
            } catch (e) { return p.data_extracao; }
        });
        dadosBarras = brutosFiltrados.map(p => p.curtidas);

        document.getElementById('card-texto-qtd').innerHTML = '<i data-lucide="hash" class="w-3 h-3 inline"></i> Total de Leituras Deste Post';
    } else {
        // MODO: Visão Geral Profile
        labelsBarras = histPosts.map(p => p.data.split(' ')[0]);
        dadosBarras = histPosts.map(p => p.curtidas);
        document.getElementById('card-texto-qtd').innerHTML = '<i data-lucide="hash" class="w-3 h-3 inline"></i> Total de Posts Lidos';
    }

    let agora = new Date(); let data7 = new Date(); data7.setDate(agora.getDate() - 7); let data30 = new Date(); data30.setDate(agora.getDate() - 30);
    // Para filtro específico, converterDataString tenta ler "yyyy-mm-dd hh:mm:ss" ou "dd/mm/yyyy hh:mm", precisamos garantir:
    let posts7 = cardsOrigemDados.filter(p => p.data ? converterDataString(p.data) >= data7 : new Date(p.data_extracao) >= data7);
    let posts30 = cardsOrigemDados.filter(p => p.data ? converterDataString(p.data) >= data30 : new Date(p.data_extracao) >= data30);

    const calcMedia = (arr) => arr.length === 0 ? 0 : Math.round(arr.reduce((acc, p) => acc + p.curtidas, 0) / arr.length);

    document.getElementById('card-total-posts').innerText = cardsOrigemDados.length;
    document.getElementById('card-media-geral').innerText = calcMedia(cardsOrigemDados).toLocaleString('pt-BR');
    document.getElementById('card-media-7').innerText = calcMedia(posts7).toLocaleString('pt-BR');
    document.getElementById('card-media-30').innerText = calcMedia(posts30).toLocaleString('pt-BR');

    // Atualiza Gráfico de Seguidores (Sempre geral do perfil)
    if (window.chartSeguidores) window.chartSeguidores.destroy();
    let ctxSeg = document.getElementById('graficoSeguidores').getContext('2d');
    window.chartSeguidores = new Chart(ctxSeg, { type: 'line', data: { labels: histSeg.map(s => s.data.split(' ')[0]), datasets: [{ label: 'Seguidores', data: histSeg.map(s => s.valor), borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderWidth: 3, tension: 0.3, fill: true, pointRadius: 4, pointHoverRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: false } } } });

    // Atualiza Gráfico de Posts
    if (window.chartPosts) window.chartPosts.destroy();
    let ctxPosts = document.getElementById('graficoPosts').getContext('2d');
    window.chartPosts = new Chart(ctxPosts, {
        type: 'bar',
        data: {
            labels: labelsBarras,
            datasets: [{
                label: tituloGrafico,
                data: dadosBarras,
                backgroundColor: postSelecionado ? '#7c3aed' : '#db2777',
                borderWidth: 0,
                borderRadius: 4,
                barThickness: dadosBarras.length <= 3 ? 40 : undefined,
                maxBarThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true }
            },
            layout: { padding: { left: 20, right: 20 } }
        }
    });

    // Galeria visual de Posts
    popularGaleriaPosts(perfilSelecionado);

    // Galeria visual de Stories
    popularGaleriaStories(perfilSelecionado);

    // Tabela Secundária (Chamada de API dedicada)
    carregarTabelaHistorico(perfilSelecionado);
}

// NOVA FUNÇÃO: Busca o histórico cru no backend
async function carregarTabelaHistorico(perfilSelecionado) {
    const tbody = document.getElementById('tabela-historico-detalhado');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="2" class="py-6 text-center text-zinc-500 text-sm"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-pink-500"></i> Buscando histórico detalhado...</td></tr>';
    lucide.createIcons();

    try {
        const res = await fetch(`/api/historico_detalhado/${perfilSelecionado}`);
        const data = await res.json();

        if (!data.historico || data.historico.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="py-6 text-center text-zinc-500 text-sm font-medium">Nenhum histórico detalhado encontrado para este perfil.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.historico.forEach(reg => {
            // reg.data_hora ex: "2024-02-26 14:00:00"
            // Vamos formatar bonitinho
            let dataFormatada = reg.data_hora;
            try {
                const p = reg.data_hora.split(' ');
                const d = p[0].split('-');
                dataFormatada = `${d[2]}/${d[1]}/${d[0]} às ${p[1]}`;
            } catch (e) { }

            const valorTxt = reg.seguidores_texto ? reg.seguidores_texto : (reg.seguidores_valor).toLocaleString('pt-BR');

            // Cria linha
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-zinc-50/80 transition-colors';
            tr.innerHTML = `
                <td class="py-3 px-4 text-sm font-semibold text-zinc-800 whitespace-nowrap"><i data-lucide="calendar-clock" class="w-3.5 h-3.5 text-zinc-400 inline mr-2 align-text-bottom"></i> ${dataFormatada}</td>
                <td class="py-3 px-4 text-sm font-bold text-pink-600 text-right whitespace-nowrap bg-pink-50/20">${valorTxt} <span class="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Seg.</span></td>
            `;
            tbody.appendChild(tr);
        });

        lucide.createIcons();
    } catch (e) {
        console.error("Erro Tabela Histórico", e);
        tbody.innerHTML = '<tr><td colspan="2" class="py-6 text-center text-red-500 text-sm font-bold">Erro ao carregar o detalhamento.</td></tr>';
    }
}

// --- EXPORTANDO PARA O ESCOPO GLOBAL ---
window.iniciarDashboard = iniciarDashboard;
window.carregarTabelaHistorico = carregarTabelaHistorico;
window.popularGaleriaPosts = popularGaleriaPosts;
window.atualizarGraficosTela = atualizarGraficosTela;
window.popularGaleriaStories = popularGaleriaStories;

// --- GALERIA DE STORIES ---
async function popularGaleriaStories(perfilSelecionado) {
    const galeria = document.getElementById('galeria-stories');
    const contador = document.getElementById('galeria-stories-contador');
    if (!galeria) return;

    const perfilLimpo = perfilSelecionado.replace('@', '').toLowerCase();

    galeria.innerHTML = '<p class="col-span-full text-center text-zinc-400 text-sm py-4"><i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-2"></i> Carregando stories...</p>';
    if (window.lucide) lucide.createIcons();

    try {
        const res = await fetch(`/api/stories/${perfilLimpo}`);
        const data = await res.json();
        const stories = data.stories || [];

        if (contador) contador.textContent = stories.length + ' stor' + (stories.length !== 1 ? 'ies únicos' : 'y');

        if (stories.length === 0) {
            galeria.innerHTML = '<p class="col-span-full text-center text-zinc-400 text-sm py-6">Nenhum story extraído para este perfil.</p>';
            return;
        }

        // Formata data "2026-02-26 15:30:00" -> "26/02 15:30"
        function fmtData(d) {
            if (!d) return 'N/A';
            try {
                const partes = d.split(' ');
                const ymd = partes[0].split('-');
                const hora = partes[1] ? partes[1].substring(0, 5) : '';
                return `${ymd[2]}/${ymd[1]} ${hora}`;
            } catch { return d; }
        }

        galeria.innerHTML = '';
        stories.forEach(s => {
            const isVideo = s.tipo && s.tipo.toUpperCase() === 'VIDEO';
            const iconTipo = isVideo ? 'video' : 'image';
            const corTipo = isVideo ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white';
            const labelTipo = isVideo ? 'VÍDEO' : 'FOTO';
            const vezesVisto = s.vezes_visto || 1;

            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg border border-zinc-200 overflow-hidden shadow-sm hover:border-violet-400 hover:shadow-md transition-all flex flex-col w-[160px] shrink-0';
            card.style.scrollSnapAlign = 'start';

            card.innerHTML = `
                <div class="relative bg-zinc-100 aspect-[9/16] flex items-center justify-center overflow-hidden">
                    ${s.print
                    ? `<img src="${s.print}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.parentElement.querySelector('.placeholder-icon').classList.remove('hidden');">
                           <div class="placeholder-icon hidden flex flex-col items-center justify-center absolute inset-0 bg-zinc-100">
                               <i data-lucide="image-off" class="w-8 h-8 text-zinc-300 mb-1"></i>
                               <span class="text-[10px] text-zinc-400 font-bold">Imagem removida</span>
                           </div>`
                    : `<div class="flex flex-col items-center justify-center">
                               <i data-lucide="${iconTipo}" class="w-8 h-8 text-zinc-300 mb-1"></i>
                               <span class="text-[10px] text-zinc-400 font-bold">Sem print</span>
                           </div>`
                }
                    <span class="${corTipo} text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm absolute top-2 right-2 flex items-center gap-1">
                        <i data-lucide="${iconTipo}" class="w-2.5 h-2.5"></i> ${labelTipo}
                    </span>
                    ${vezesVisto > 1 ? `
                    <span class="bg-violet-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm absolute top-2 left-2 flex items-center gap-0.5">
                        <i data-lucide="repeat" class="w-2.5 h-2.5"></i> ${vezesVisto}x visto
                    </span>` : ''}
                </div>
                <div class="p-2.5 space-y-1.5 border-t border-zinc-100">
                    <span class="text-[10px] font-bold text-zinc-600 flex items-center gap-1"><i data-lucide="calendar-clock" class="w-3 h-3 text-violet-500"></i> ${fmtData(s.data_extracao)}</span>
                    <span class="text-[10px] font-medium text-zinc-400 flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> Postado há ${s.tempo || 'N/A'}</span>
                </div>
            `;
            galeria.appendChild(card);
        });
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.error('[STORIES GALERIA] Erro:', e);
        galeria.innerHTML = '<p class="col-span-full text-center text-red-500 text-sm py-6 font-bold">Erro ao carregar stories.</p>';
    }
}

// --- BOTÃO LIMPAR TELA (Reset visual, não apaga do banco) ---
function conectarBotaoLimpar() {
    const btnLimpar = document.getElementById('btn-limpar-perfil');
    if (!btnLimpar || btnLimpar.dataset.conectado) return;
    btnLimpar.dataset.conectado = "true";

    btnLimpar.addEventListener('click', () => {
        limparTelaUI();
        if (window.mostrarToast) window.mostrarToast('🧹 Tela limpa! Selecione outro perfil.', 'sucesso');
    });
}

// --- MODAL ANALYTICS POST ---
function abrirModalAnalyticsPost(postResumo, perfilSelecionado) {
    const modal = document.getElementById('modal-analytics-post');
    if (!modal) return;

    const imgElement = document.getElementById('modal-analytics-img');
    const fallbackElement = document.getElementById('modal-analytics-img-fallback');

    // Reset the display from previous onerror triggers
    imgElement.style.display = '';

    imgElement.src = postResumo.print || '';
    if (!postResumo.print) {
        fallbackElement.classList.remove('hidden');
    } else {
        fallbackElement.classList.add('hidden');
    }

    // Formatar "26/02/2026 22:50" -> "26/02/2026"
    function fmtPub(d) {
        if (!d) return 'N/A';
        return d.split(' ')[0];
    }

    document.getElementById('modal-analytics-data-pub').textContent = fmtPub(postResumo.data_pub);
    document.getElementById('modal-analytics-link').href = postResumo.url_post;

    const limpo = perfilSelecionado.replace('@', '').toLowerCase();
    const brutos = (window.dadosHistoricosDB.posts_brutos || []).filter(p => p.perfil.toLowerCase() === limpo && p.url_post === postResumo.url_post);

    // Ordem cronológica
    brutos.sort((a, b) => (a.data_extracao > b.data_extracao ? 1 : -1));

    let labels = [];
    let dados = [];
    let bgColors = [];

    brutos.forEach(p => {
        let fmtExt = p.data_extracao;
        try {
            const partes = p.data_extracao.split(' ');
            const d = partes[0].split('-');
            const hora = partes[1] ? partes[1].substring(0, 5) : '';
            fmtExt = `${d[2]}/${d[1]} às ${hora}`;
        } catch (e) { }

        labels.push(["EXTRAÍDO", fmtExt]);
        dados.push(p.curtidas);
        bgColors.push('#ec4899'); // Rosa
    });

    if (window.chartAnalyticsPost) window.chartAnalyticsPost.destroy();
    const ctx = document.getElementById('graficoAnalyticsPost').getContext('2d');

    window.chartAnalyticsPost = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Curtidas',
                data: dados,
                backgroundColor: bgColors,
                borderRadius: 4,
                barThickness: 40,
                maxBarThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function (context) {
                            return context[0].label.replace(',', ' - ');
                        },
                        label: function (context) {
                            return ' ' + context.raw.toLocaleString('pt-BR') + ' curtidas extraídas';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 10, weight: 'bold' },
                        color: '#ec4899'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (val) { return val.toLocaleString('pt-BR'); }
                    }
                }
            }
        }
    });

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function fecharModalAnalyticsPost() {
    const modal = document.getElementById('modal-analytics-post');
    if (modal) modal.classList.add('hidden');
}
window.abrirModalAnalyticsPost = abrirModalAnalyticsPost;
window.fecharModalAnalyticsPost = fecharModalAnalyticsPost;
