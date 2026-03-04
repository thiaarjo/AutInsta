import { converterDataString, getTimestamp, NOMES_DIAS_SEMANA, NOMES_MESES_CURTO, NOMES_MESES } from './globals.js';

function inicializarCalendario() {
    document.getElementById('btn-mes-anterior')?.addEventListener('click', () => mudarMesCalendario(-1));
    document.getElementById('btn-mes-proximo')?.addEventListener('click', () => mudarMesCalendario(1));
    renderizarGradeCalendario();
}

function mudarMesCalendario(delta) {
    window.dataCalendarioAtual.setMonth(window.dataCalendarioAtual.getMonth() + delta);
    renderizarGradeCalendario();
    carregarAgendamentos();
}

function renderizarGradeCalendario() {
    const ano = window.dataCalendarioAtual.getFullYear();
    const mes = window.dataCalendarioAtual.getMonth();

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
            ${isPassado ? '' : `<div class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                <button onclick="event.stopPropagation(); abrirInputLembrete('${dataFormatada}')" title="Adicionar lembrete">
                    <i data-lucide="sticky-note" class="w-4 h-4 text-amber-500 hover:text-amber-600"></i>
                </button>
                <i data-lucide="plus-circle" class="w-4 h-4 text-zinc-400 hover:text-pink-500"></i>
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

// --- EXPORTANDO PARA O ESCOPO GLOBAL ---
window.inicializarCalendario = inicializarCalendario;
window.mudarMesCalendario = mudarMesCalendario;
window.renderizarGradeCalendario = renderizarGradeCalendario;
