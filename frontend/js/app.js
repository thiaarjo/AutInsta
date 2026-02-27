lucide.createIcons();

// NAVEGAÇÃO DE ABAS
const btnTabMonitor = document.getElementById('btn-tab-monitor');
const btnTabLista = document.getElementById('btn-tab-lista');
const btnTabComparativo = document.getElementById('btn-tab-comparativo');
const btnTabConfig = document.getElementById('btn-tab-config');

const viewMonitor = document.getElementById('view-monitor');
const viewLista = document.getElementById('view-lista');
const viewComparativo = document.getElementById('view-comparativo');
const viewConfig = document.getElementById('view-config');

function resetarAbas() {
    viewMonitor.classList.add('hidden'); viewMonitor.classList.remove('grid');
    viewLista.classList.add('hidden');
    viewComparativo.classList.add('hidden');
    viewConfig.classList.add('hidden');

    const classeInativa = "pb-3 text-sm font-bold text-zinc-400 hover:text-zinc-800 border-b-2 border-transparent hover:border-zinc-300 flex items-center gap-2 transition-all whitespace-nowrap";
    btnTabMonitor.className = classeInativa;
    btnTabLista.className = classeInativa;
    btnTabComparativo.className = classeInativa;
    btnTabConfig.className = classeInativa + " ml-auto";
}

btnTabComparativo.addEventListener('click', () => { resetarAbas(); viewComparativo.classList.remove('hidden'); btnTabComparativo.className = "pb-3 text-sm font-bold text-pink-600 border-b-2 border-pink-600 flex items-center gap-2 transition-all whitespace-nowrap"; iniciarDashboard(); });
btnTabMonitor.addEventListener('click', () => { resetarAbas(); viewMonitor.classList.remove('hidden'); viewMonitor.classList.add('grid'); btnTabMonitor.className = "pb-3 text-sm font-bold text-pink-600 border-b-2 border-pink-600 flex items-center gap-2 transition-all whitespace-nowrap"; });
btnTabLista.addEventListener('click', () => { resetarAbas(); viewLista.classList.remove('hidden'); btnTabLista.className = "pb-3 text-sm font-bold text-pink-600 border-b-2 border-pink-600 flex items-center gap-2 transition-all whitespace-nowrap"; carregarAgendamentos(); });
btnTabConfig.addEventListener('click', () => { resetarAbas(); viewConfig.classList.remove('hidden'); btnTabConfig.className = "pb-3 text-sm font-bold text-pink-600 border-b-2 border-pink-600 flex items-center gap-2 transition-all whitespace-nowrap ml-auto"; carregarConfigUI(); });

// Inicializa a primeira tela como Extração/Monitor e força a classe CSS correta
btnTabMonitor.click();

// DASHBOARD LOGIC
let dadosHistoricosDB = { seguidores: [], posts: [], posts_brutos: [] };
let chartSeguidores = null; let chartPosts = null;

function converterDataString(dataStr) {
    if (!dataStr || dataStr === "Data N/A") return new Date(0);
    try { let p = dataStr.split(' '); let d = p[0].split('/'); return new Date(d[2], d[1] - 1, d[0]); } catch (e) { return new Date(0); }
}

async function iniciarDashboard() {
    const loading = document.getElementById('loading-graficos');
    const painel = document.getElementById('painel-graficos');
    const seletor = document.getElementById('seletor-perfil');
    const btnSync = document.getElementById('btn-sync-graficos');

    const perfilSalvo = seletor.value || ''; // Salva qual perfil o usuário estava olhando
    const htmlOrigBtn = btnSync ? btnSync.innerHTML : '';

    if (btnSync) {
        btnSync.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Atualizando...`;
        lucide.createIcons();
    } else {
        loading.classList.remove('hidden'); loading.classList.add('flex'); painel.classList.add('hidden');
    }

    try {
        const res = await fetch('/api/historico_graficos'); dadosHistoricosDB = await res.json();
        let perfisUnicos = new Set([...dadosHistoricosDB.seguidores.map(s => s.perfil), ...dadosHistoricosDB.posts.map(p => p.perfil)]);

        seletor.innerHTML = '';
        if (perfisUnicos.size === 0) {
            seletor.innerHTML = '<option value="">Nenhum dado no banco</option>';
            loading.classList.replace('flex', 'hidden');
            if (btnSync) btnSync.innerHTML = htmlOrigBtn;
            return;
        }

        perfisUnicos.forEach(p => { let opt = document.createElement('option'); opt.value = p; opt.text = '@' + p; seletor.appendChild(opt); });

        // Restaura a visualização que ele estava
        if (perfilSalvo && perfisUnicos.has(perfilSalvo)) {
            seletor.value = perfilSalvo;
        }

        // Não limpamos postSelecionadoAtual ao dar Sync
        atualizarGraficosTela(seletor.value);

        // Se for a primeira vez que entra na tela o evento deve ser atrelado
        if (!seletor.dataset.escutando) {
            seletor.addEventListener('change', (e) => {
                window.postSelecionadoAtual = "";
                atualizarGraficosTela(e.target.value);
            });
            seletor.dataset.escutando = "true";
        }

        loading.classList.replace('flex', 'hidden'); painel.classList.remove('hidden'); painel.classList.add('flex');
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



function popularGaleriaPosts(perfilSelecionado) {
    const galeria = document.getElementById('galeria-posts');
    const contador = document.getElementById('galeria-contador');
    if (!galeria) return;

    const perfilLimpo = perfilSelecionado.replace('@', '').toLowerCase();
    const brutos = (dadosHistoricosDB.posts_brutos || []).filter(p => p.perfil.toLowerCase() === perfilLimpo);

    console.log('[DEBUG GALERIA] Perfil Original:', perfilSelecionado, '| Perfil Limpo:', perfilLimpo);
    console.log('[DEBUG GALERIA] Total Brutos:', dadosHistoricosDB.posts_brutos?.length, '| Filtrados:', brutos.length);

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

    galeria.innerHTML = '';

    postsUnicos.forEach(p => {
        const imgSrc = p.print || null;
        const isAtivo = window.postSelecionadoAtual === p.url_post;

        const card = document.createElement('div');
        card.className = `bg-white rounded-lg border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md hover:border-pink-400 flex flex-col sm:flex-row ${isAtivo ? 'border-pink-500 ring-2 ring-pink-200' : 'border-zinc-200'}`;
        card.onclick = () => {
            if (window.postSelecionadoAtual === p.url_post) {
                window.postSelecionadoAtual = ""; // Toggle OFF
            } else {
                window.postSelecionadoAtual = p.url_post; // Toggle ON
            }
            atualizarGraficosTela(perfilSelecionado);
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
    let histSeg = dadosHistoricosDB.seguidores.filter(s => s.perfil.toLowerCase() === limpo);
    let histPosts = dadosHistoricosDB.posts.filter(p => p.perfil.toLowerCase() === limpo);

    const postSelecionado = window.postSelecionadoAtual || '';

    let cardsOrigemDados = histPosts;
    let tituloGrafico = 'Desempenho de Curtidas por Post';
    let labelsBarras = [];
    let dadosBarras = [];

    if (postSelecionado) {
        // MODO: Post Específico
        const brutosFiltrados = (dadosHistoricosDB.posts_brutos || []).filter(p => p.perfil.toLowerCase() === limpo && p.url_post === postSelecionado);
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
    if (chartSeguidores) chartSeguidores.destroy();
    let ctxSeg = document.getElementById('graficoSeguidores').getContext('2d');
    chartSeguidores = new Chart(ctxSeg, { type: 'line', data: { labels: histSeg.map(s => s.data.split(' ')[0]), datasets: [{ label: 'Seguidores', data: histSeg.map(s => s.valor), borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderWidth: 3, tension: 0.3, fill: true, pointRadius: 4, pointHoverRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: false } } } });

    // Atualiza Gráfico de Posts
    if (chartPosts) chartPosts.destroy();
    let ctxPosts = document.getElementById('graficoPosts').getContext('2d');
    chartPosts = new Chart(ctxPosts, {
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

// AGENDAMENTO LOGIC
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
async function deletarAgendamento(id) { if (confirm('Remover post da programação?')) { await fetch('/api/agendamentos/' + id, { method: 'DELETE' }); carregarAgendamentos(); if (diaAtualDoModal) abrirModalAgendamento(diaAtualDoModal); } }

// ==========================================
// 📋 HUB DO DIA (MODAL CENTRAL)
// ==========================================
let diaAtualDoModal = null; // Data YYYY-MM-DD do dia aberto no modal

const NOMES_DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const NOMES_MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

async function abrirModalAgendamento(dataPreDefinida = null) {
    const modal = document.getElementById('modal-agendar');
    if (modal) modal.classList.remove('hidden');

    diaAtualDoModal = dataPreDefinida;

    // Reset form visibility - form já aberto por padrão
    const formWrapper = document.getElementById('form-agendar-wrapper');
    if (formWrapper) formWrapper.classList.remove('hidden');
    const btnToggle = document.getElementById('btn-toggle-form-agendar');
    if (btnToggle) btnToggle.classList.add('hidden');

    // Header do dia
    if (dataPreDefinida) {
        const parts = dataPreDefinida.split('-');
        const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const diaSemana = NOMES_DIAS_SEMANA[dt.getDay()];
        const dia = dt.getDate();
        const mes = NOMES_MESES_CURTO[dt.getMonth()];
        const ano = dt.getFullYear();

        document.getElementById('modal-titulo-dia').textContent = `${diaSemana}, ${dia} de ${mes} de ${ano}`;
        document.getElementById('modal-subtitulo-dia').textContent = 'Gerencie lembretes e publicações deste dia';
        document.getElementById('data_agendada').value = dataPreDefinida + "T12:00";
    } else {
        document.getElementById('modal-titulo-dia').textContent = 'Hub do Dia';
        document.getElementById('modal-subtitulo-dia').textContent = 'Gerencie lembretes e publicações';
    }

    // Popula lembretes e posts do dia
    await popularLembretesDoModal(dataPreDefinida);
    await popularPostsDoModal(dataPreDefinida);

    if (window.lucide) lucide.createIcons();
}

function fecharModalAgendamento() {
    const modal = document.getElementById('modal-agendar');
    if (modal) modal.classList.add('hidden');
    diaAtualDoModal = null;
    // Reset form
    const form = document.getElementById('formAgendamento');
    if (form) form.reset();
    const previewImg = document.getElementById('preview_img');
    if (previewImg) { previewImg.classList.add('hidden'); previewImg.src = ''; }
    const previewTexto = document.getElementById('preview-legenda-texto');
    if (previewTexto) previewTexto.innerHTML = 'Sua legenda aparecerá aqui...';
}

function toggleFormAgendamento() {
    const wrapper = document.getElementById('form-agendar-wrapper');
    const btn = document.getElementById('btn-toggle-form-agendar');
    if (wrapper) {
        wrapper.classList.toggle('hidden');
        if (!wrapper.classList.contains('hidden')) {
            btn.classList.add('hidden');
        } else {
            btn.classList.remove('hidden');
        }
    }
}

// ==========================================
// 💡 PAINEL LATERAL (IDEIAS + AGENDADOS)
// ==========================================

function trocarAbaLateral(aba) {
    const tabIdeias = document.getElementById('tab-ideias');
    const tabAgendados = document.getElementById('tab-agendados');
    const painelIdeias = document.getElementById('painel-ideias');
    const painelAgendados = document.getElementById('painel-agendados');

    if (aba === 'ideias') {
        tabIdeias.className = 'flex-1 text-xs font-black uppercase tracking-widest py-3 text-center transition-colors text-amber-600 border-b-2 border-amber-500 bg-white';
        tabAgendados.className = 'flex-1 text-xs font-black uppercase tracking-widest py-3 text-center transition-colors text-zinc-400 border-b-2 border-transparent hover:text-zinc-600';
        painelIdeias.classList.remove('hidden');
        painelAgendados.classList.add('hidden');
    } else {
        tabAgendados.className = 'flex-1 text-xs font-black uppercase tracking-widest py-3 text-center transition-colors text-pink-600 border-b-2 border-pink-500 bg-white';
        tabIdeias.className = 'flex-1 text-xs font-black uppercase tracking-widest py-3 text-center transition-colors text-zinc-400 border-b-2 border-transparent hover:text-zinc-600';
        painelAgendados.classList.remove('hidden');
        painelIdeias.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
}

function popularAgendadosLateral(agendamentos) {
    const container = document.getElementById('lista-agendados-lateral');
    if (!container) return;
    container.innerHTML = '';

    // Filtra apenas os agendados (não rascunhos)
    const agendados = agendamentos.filter(p => p.data_agendada && p.status !== 'RASCUNHO');
    if (agendados.length === 0) {
        container.innerHTML = '<p class="text-xs text-zinc-400 text-center py-4">Nenhum post agendado.</p>';
        return;
    }

    // Agrupa por data (YYYY-MM-DD)
    const grupos = {};
    agendados.forEach(p => {
        const dia = p.data_agendada.split('T')[0];
        if (!grupos[dia]) grupos[dia] = [];
        grupos[dia].push(p);
    });

    // Ordena as datas
    const datasOrdenadas = Object.keys(grupos).sort();

    const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    datasOrdenadas.forEach(dataStr => {
        const parts = dataStr.split('-');
        const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const labelDia = `${dt.getDate()} ${MESES[dt.getMonth()]}`;

        let headerHtml = `<div class="text-[10px] font-black text-zinc-400 uppercase tracking-widest pt-3 pb-1 px-1 border-b border-zinc-100 mb-1.5">${labelDia}</div>`;
        container.innerHTML += headerHtml;

        grupos[dataStr].forEach(post => {
            const hora = post.data_agendada.split('T')[1]?.substring(0, 5) || '';
            let statusColor = 'text-pink-600', statusBg = 'bg-pink-50', border = 'border-pink-200';
            if (post.status === 'PUBLICADO') { statusColor = 'text-green-600'; statusBg = 'bg-green-50'; border = 'border-green-200'; }
            else if (post.status === 'ERRO') { statusColor = 'text-red-600'; statusBg = 'bg-red-50'; border = 'border-red-200'; }

            const legendaPreview = (post.legenda || '').substring(0, 50);
            container.innerHTML += `
                <div class="${statusBg} border ${border} rounded-lg px-2.5 py-2 flex items-center gap-2 mb-1.5">
                    ${post.arquivo ? `<div class="w-8 h-8 rounded shrink-0 bg-white border overflow-hidden"><img src="/uploads/${post.arquivo}" class="w-full h-full object-cover"></div>` : ''}
                    <div class="min-w-0 flex-1">
                        <p class="text-[10px] font-black ${statusColor} flex items-center gap-1"><i data-lucide="clock" class="w-2.5 h-2.5"></i> ${hora} • ${post.status}</p>
                        <p class="text-[10px] text-zinc-500 truncate">${legendaPreview || 'Sem legenda'}</p>
                    </div>
                </div>
            `;
        });
    });
}

function abrirModalNovoRascunho() {
    const modal = document.getElementById('modal-rascunho');
    if (modal) modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function fecharModalRascunho() {
    const modal = document.getElementById('modal-rascunho');
    if (modal) modal.classList.add('hidden');
    const form = document.getElementById('formNovoRascunho');
    if (form) form.reset();
}

// --- LEMBRETES DO MODAL ---
async function popularLembretesDoModal(dataStr) {
    const container = document.getElementById('modal-lembretes-lista');
    if (!container) return;
    container.innerHTML = '';

    if (!dataStr) return;

    try {
        const res = await fetch('/api/lembretes');
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
    if (!input || !input.value.trim() || !diaAtualDoModal) return;

    try {
        await fetch('/api/lembretes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: diaAtualDoModal, texto: input.value.trim(), cor: 'yellow' })
        });
        input.value = '';
        await popularLembretesDoModal(diaAtualDoModal);
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
        <button onclick="popularLembretesDoModal('${diaAtualDoModal}').then(() => { if(window.lucide) lucide.createIcons(); })" class="p-1 rounded hover:bg-red-100 text-red-400 transition-colors">
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
        await popularLembretesDoModal(diaAtualDoModal);
        carregarAgendamentos();
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.error('Erro ao editar lembrete:', e);
    }
}

async function deletarLembreteDoModal(id) {
    try {
        await fetch(`/api/lembretes/${id}`, { method: 'DELETE' });
        await popularLembretesDoModal(diaAtualDoModal);
        carregarAgendamentos();
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
        const res = await fetch('/api/agendamentos');
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

// --- LISTENERS ---
document.getElementById('legenda_post').addEventListener('input', function (e) {
    const text = e.target.value;
    const previewEl = document.getElementById('preview-legenda-texto');
    if (!text.trim()) {
        previewEl.innerHTML = 'Sua legenda aparecerá aqui...';
        return;
    }
    // Formata quebras de linha e pinta hashtags/menções de azul (estilo Instagram)
    let formattedText = text.replace(/\n/g, '<br>');
    formattedText = formattedText.replace(/(#\w+)/g, '<span class="text-blue-500 font-medium hover:underline cursor-pointer">$1</span>');
    formattedText = formattedText.replace(/(@\w+)/g, '<span class="text-blue-500 font-medium hover:underline cursor-pointer">$1</span>');
    previewEl.innerHTML = formattedText;
});

document.getElementById('foto_upload').addEventListener('change', function (e) { if (e.target.files[0]) { const reader = new FileReader(); reader.onload = function (evt) { document.getElementById('preview_img').src = evt.target.result; document.getElementById('preview_img').classList.remove('hidden'); }; reader.readAsDataURL(e.target.files[0]); } });

document.getElementById('modal-lembrete-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); salvarLembreteDoModal(); }
});

document.getElementById('formAgendamento').addEventListener('submit', async function (event) {
    event.preventDefault(); const btn = document.getElementById('btn-salvar-post'); btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Salvando...';
    if (window.lucide) lucide.createIcons();
    try {
        const formData = new FormData(); formData.append("foto", document.getElementById('foto_upload').files[0]); formData.append("legenda", document.getElementById('legenda_post').value); formData.append("data_agendada", document.getElementById('data_agendada').value);
        const res = await fetch('/api/agendar', { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json();
            alert(err.detail || 'Erro ao agendar.');
            return;
        }
        document.getElementById('formAgendamento').reset();
        document.getElementById('preview_img').classList.add('hidden');
        document.getElementById('preview_img').src = '';
        const previewTexto = document.getElementById('preview-legenda-texto');
        if (previewTexto) previewTexto.innerHTML = 'Sua legenda aparecerá aqui...';

        // Refresh in-place: recarrega posts do dia no modal sem fechar
        if (diaAtualDoModal) {
            document.getElementById('data_agendada').value = diaAtualDoModal + "T12:00";
            await popularPostsDoModal(diaAtualDoModal);
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

// ==========================================
// 📅 MÓDULO CALENDÁRIO PROFISSIONAL
// ==========================================
let dataCalendarioAtual = new Date();
const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function inicializarCalendario() {
    document.getElementById('btn-mes-anterior')?.addEventListener('click', () => mudarMesCalendario(-1));
    document.getElementById('btn-mes-proximo')?.addEventListener('click', () => mudarMesCalendario(1));
    renderizarGradeCalendario();
}

function mudarMesCalendario(delta) {
    dataCalendarioAtual.setMonth(dataCalendarioAtual.getMonth() + delta);
    renderizarGradeCalendario();
    carregarAgendamentos();
}

function renderizarGradeCalendario() {
    const ano = dataCalendarioAtual.getFullYear();
    const mes = dataCalendarioAtual.getMonth();

    const labelMesAno = document.getElementById('label-mes-ano');
    if (labelMesAno) labelMesAno.innerText = `${NOMES_MESES[mes]} ${ano}`;

    const grid = document.getElementById('grid-calendario');
    if (!grid) return;
    grid.innerHTML = '';

    const primeiroDiaMes = new Date(ano, mes, 1);
    const ultimoDiaMes = new Date(ano, mes + 1, 0);
    const diasNoMes = ultimoDiaMes.getDate();
    const diaDaSemanaInicio = primeiroDiaMes.getDay();

    const hojeReal = new Date();
    hojeReal.setHours(0, 0, 0, 0);
    const isMesmoMesAno = hojeReal.getFullYear() === ano && hojeReal.getMonth() === mes;

    // Células vazias do mês anterior
    for (let i = 0; i < diaDaSemanaInicio; i++) {
        const divMorta = document.createElement('div');
        divMorta.className = "bg-zinc-50 min-h-[130px] p-2 border-r border-b border-zinc-200";
        grid.appendChild(divMorta);
    }

    // Células reais dos dias
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const divDia = document.createElement('div');
        const dataDoDia = new Date(ano, mes, dia);
        dataDoDia.setHours(0, 0, 0, 0);
        const isHoje = isMesmoMesAno && hojeReal.getDate() === dia;
        const isPassado = dataDoDia < hojeReal;

        const dataFormatada = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

        // ---- ESTILOS CONDICIONAIS ----
        let headerClass, bgClass;

        if (isHoje) {
            headerClass = "w-7 h-7 flex items-center justify-center bg-pink-600 text-white rounded-full font-bold text-sm mx-auto shadow-sm";
            bgClass = "bg-pink-50/30 ring-2 ring-pink-300 ring-inset";
        } else if (isPassado) {
            headerClass = "text-zinc-300 font-bold text-sm text-center mt-1";
            bgClass = "bg-zinc-50/80";
        } else {
            headerClass = "text-zinc-500 font-bold text-sm text-center mt-1";
            bgClass = "bg-white hover:bg-zinc-50 transition-colors";
        }

        divDia.className = `${bgClass} min-h-[85px] p-1.5 border-r border-b border-zinc-200 flex flex-col ${isPassado ? 'cursor-default' : 'cursor-pointer'} relative group`;
        divDia.id = `cal-dia-${dataFormatada}`;
        divDia.dataset.calData = dataFormatada;

        // Drag and Drop: aceitar soltura apenas em dias de hoje ou futuro
        if (!isPassado) {
            divDia.addEventListener('dragover', (e) => { e.preventDefault(); divDia.classList.add('ring-2', 'ring-pink-400', 'ring-inset', 'bg-pink-50/40'); });
            divDia.addEventListener('dragleave', () => { divDia.classList.remove('ring-2', 'ring-pink-400', 'ring-inset', 'bg-pink-50/40'); });
            divDia.addEventListener('drop', (e) => onDropCard(e, dataFormatada, divDia));
            divDia.onclick = () => abrirModalAgendamento(dataFormatada);
        }

        divDia.innerHTML = `
            <div class="${headerClass}">${dia}</div>
            <div class="flex-1 mt-1.5 space-y-1 overflow-y-auto custom-scrollbar" id="cal-conteudo-${dataFormatada}">
                <!-- Mini cards -->
            </div>
            ${isPassado ? '' : `<div class="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <button onclick="event.stopPropagation(); abrirInputLembrete('${dataFormatada}')" title="Adicionar lembrete">
                    <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400 hover:text-amber-500"></i>
                </button>
                <i data-lucide="plus-circle" class="w-4 h-4 text-zinc-300 hover:text-pink-500"></i>
            </div>`}
        `;

        grid.appendChild(divDia);
    }

    // Células vazias para completar a grade (SEMPRE 6 linhas = 42 células para altura fixa)
    const celulasTotais = diaDaSemanaInicio + diasNoMes;
    const celulasFaltantes = 42 - celulasTotais;
    for (let i = 0; i < celulasFaltantes; i++) {
        const divMorta = document.createElement('div');
        divMorta.className = "bg-zinc-50 min-h-[85px] p-1.5 border-r border-b border-zinc-200";
        grid.appendChild(divMorta);
    }

    if (window.lucide) lucide.createIcons();
}

// ==========================================
// 📌 SISTEMA DE LEMBRETES
// ==========================================
async function carregarLembretes() {
    try {
        const res = await fetch('/api/lembretes');
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
    try {
        await fetch(`/api/lembretes/${id}`, { method: 'DELETE' });
        carregarAgendamentos();
    } catch (e) {
        console.error('Erro ao deletar lembrete:', e);
    }
}

// ==========================================
// 🔄 DRAG AND DROP
// ==========================================
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
            const novaDataCompleta = `${novaDataStr}T${payload.hora}`;
            const res = await fetch(`/api/agendamentos/${payload.id}/data`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nova_data: novaDataCompleta })
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.detail || 'Erro ao mover post.');
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
                alert(err.detail || 'Erro ao mover lembrete.');
                return;
            }
        }

        carregarAgendamentos();
    } catch (err) {
        console.error('Erro no drag and drop:', err);
    }
}

// ==========================================
// 💬 TOOLTIP FLUTUANTE
// ==========================================
let tooltipEl = null;

function criarTooltipEl() {
    if (tooltipEl) return;
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'cal-tooltip';
    tooltipEl.className = 'fixed z-[100] pointer-events-none opacity-0 transition-opacity duration-150 bg-white border border-zinc-200 rounded-xl shadow-xl p-3 max-w-[240px] flex flex-col gap-2';
    document.body.appendChild(tooltipEl);
}

function mostrarTooltip(e, card) {
    criarTooltipEl();
    const legenda = card.dataset.legenda || '';
    const imagem = card.dataset.imagem || '';
    const hora = card.dataset.hora || '';
    const status = card.dataset.status || '';

    if (!legenda && !imagem) return;

    tooltipEl.innerHTML = `
        ${imagem ? `<img src="${imagem}" class="w-full h-28 object-cover rounded-lg border border-zinc-100" onerror="this.style.display='none'">` : ''}
        <div>
            <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5"><i data-lucide="clock" class="w-3 h-3 inline"></i> ${hora} • ${status}</p>
            ${legenda ? `<p class="text-xs text-zinc-600 leading-snug">${legenda}</p>` : '<p class="text-xs text-zinc-400 italic">Sem legenda</p>'}
        </div>
    `;
    if (window.lucide) lucide.createIcons();

    // Posicionamento
    const rect = card.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;

    // Evitar sair da tela
    if (top + 200 > window.innerHeight) top = rect.top - 180;
    if (left + 240 > window.innerWidth) left = window.innerWidth - 260;

    tooltipEl.style.top = top + 'px';
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.opacity = '1';
}

function esconderTooltip() {
    if (tooltipEl) tooltipEl.style.opacity = '0';
}

// ==========================================
// 🚀 EVENT LISTENERS DE FORMULÁRIOS ADICIONAIS
// ==========================================
document.getElementById('formNovoRascunho').addEventListener('submit', async function (event) {
    event.preventDefault();
    const btn = document.getElementById('btn-salvar-rascunho');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Salvando...';
    if (window.lucide) lucide.createIcons();

    try {
        const formData = new FormData();
        const fotoInput = document.getElementById('foto_rascunho');
        if (fotoInput.files.length > 0) {
            formData.append("foto", fotoInput.files[0]);
        }
        formData.append("legenda", document.getElementById('legenda_rascunho').value);
        formData.append("data_agendada", ""); // Vazio para RASCUNHO

        const res = await fetch('/api/agendar', { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json();
            alert(err.detail || 'Erro ao salvar rascunho.');
            return;
        }

        fecharModalRascunho();
        trocarAbaLateral('ideias'); // Mostra a aba de ideias para ver o novo rascunho
        carregarAgendamentos();  // Atualiza a lista
    } catch (err) {
        console.error('Erro ao salvar rascunho:', err);
        alert('Erro de conexão ao salvar rascunho.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Guardar Ideia';
        if (window.lucide) lucide.createIcons();
    }
});

// Auto-iniciar o layout
document.addEventListener('DOMContentLoaded', () => {
    inicializarCalendario();
});
