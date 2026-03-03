import { converterDataString, getTimestamp, NOMES_DIAS_SEMANA, NOMES_MESES_CURTO, NOMES_MESES } from './globals.js';

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



function criarTooltipEl() {
    if (window.tooltipEl) return;
    window.tooltipEl = document.createElement('div');
    window.tooltipEl.id = 'cal-tooltip';
    window.tooltipEl.className = 'fixed z-[100] pointer-events-none opacity-0 transition-opacity duration-150 bg-white border border-zinc-200 rounded-xl shadow-xl p-3 max-w-[240px] flex flex-col gap-2';
    document.body.appendChild(window.tooltipEl);
}

function mostrarTooltip(e, card) {
    criarTooltipEl();
    const legenda = card.dataset.legenda || '';
    const imagem = card.dataset.imagem || '';
    const hora = card.dataset.hora || '';
    const status = card.dataset.status || '';

    if (!legenda && !imagem) return;

    window.tooltipEl.innerHTML = `
        ${imagem ? `<img src="${imagem}" class="w-full h-28 object-cover rounded-lg border border-zinc-100" onerror="this.style.display='none'">` : ''}
        <div>
            <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5"><i data-lucide="clock" class="w-3 h-3 inline"></i> ${hora} • ${status}</p>
            ${legenda ? `<p class="text-xs text-zinc-600 leading-snug">${legenda}</p>` : '<p class="text-xs text-zinc-400 italic">Sem legenda</p>'}
        </div>
    `;
    if (window.lucide) lucide.createIcons();

    // Posicionamento base inicial
    const rect = card.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left;

    // Dimensões do tooltip (estimativa baseada em classes width)
    const tooltipWidth = 240;
    const tooltipHeight = 220; // Estimativa média

    // Evitar sair da tela pela Direita
    if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 20; // margem real
    }

    // Evitar sair da tela por Baixo (se não couber embaixo, joga pra cima do card)
    if (top + tooltipHeight > window.innerHeight) {
        top = rect.top - tooltipHeight - 8;
        // Se ainda assim vazar pra cima (tela mt pequena), prende na margem
        if (top < 10) top = 10;
    }

    window.tooltipEl.style.top = top + 'px';
    window.tooltipEl.style.left = left + 'px';
    window.tooltipEl.style.opacity = '1';
}

function esconderTooltip() {
    if (window.tooltipEl) window.tooltipEl.style.opacity = '0';
}

// --- EXPORTANDO PARA O ESCOPO GLOBAL ---
window.resetarAbas = resetarAbas;
window.trocarAbaLateral = trocarAbaLateral;
window.popularAgendadosLateral = popularAgendadosLateral;
window.criarTooltipEl = criarTooltipEl;
window.mostrarTooltip = mostrarTooltip;
window.esconderTooltip = esconderTooltip;
