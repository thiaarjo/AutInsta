import { converterDataString, getTimestamp, NOMES_DIAS_SEMANA, NOMES_MESES_CURTO, NOMES_MESES } from './globals.js';

async function abrirModalAgendamento(dataPreDefinida = null) {
    const modal = document.getElementById('modal-agendar');
    if (modal) modal.classList.remove('hidden');

    window.diaAtualDoModal = dataPreDefinida;

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
    window.diaAtualDoModal = null;
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

function abrirModalNovoRascunho() {
    // Se o modal de agendamento do dia estiver aberto, esconde ele pra não encavalar
    const modalAgendar = document.getElementById('modal-agendar');
    if (modalAgendar && !modalAgendar.classList.contains('hidden')) {
        modalAgendar.classList.add('hidden');
    }

    const modal = document.getElementById('modal-rascunho');
    if (modal) modal.classList.remove('hidden');

    // Foca no textarea para facilitar digitação
    setTimeout(() => {
        const txtA = document.getElementById('legenda_rascunho');
        if (txtA) txtA.focus();
    }, 100);

    if (window.lucide) lucide.createIcons();
}

function fecharModalRascunho() {
    const modal = document.getElementById('modal-rascunho');
    if (modal) modal.classList.add('hidden');
    const form = document.getElementById('formNovoRascunho');
    if (form) form.reset();
}

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
            window.mostrarToast(err.detail || 'Erro ao salvar rascunho.', 'erro');
            return;
        }

        fecharModalRascunho();
        trocarAbaLateral('ideias'); // Mostra a aba de ideias para ver o novo rascunho
        carregarAgendamentos();  // Atualiza a lista
    } catch (err) {
        console.error('Erro ao salvar rascunho:', err);
        window.mostrarToast('Erro de conexão ao salvar rascunho.', 'erro');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Guardar Ideia';
        if (window.lucide) lucide.createIcons();
    }
});

// --- MODAL DE CONFIRMAÇÃO GLOBAL ---
function fecharModalConfirmacao() {
    const m = document.getElementById('modal-confirmacao');
    if (m) m.classList.add('hidden');
}

function confirmarAcao(mensagem, tipo = 'confirm', titulo = 'Atenção') {
    return new Promise((resolve) => {
        const m = document.getElementById('modal-confirmacao');
        const mTexto = document.getElementById('texto-modal-confirmacao');
        const mTitulo = document.getElementById('titulo-modal-confirmacao');
        const btnConfirma = document.getElementById('btn-modal-confirmar');
        const btnCancelar = document.getElementById('btn-modal-cancelar');

        if (!m || !mTexto || !btnConfirma) {
            console.error('Modal de confirmação não configurado corretamente no HTML.');
            resolve(false);
            return;
        }

        mTexto.innerText = mensagem;
        if (mTitulo) mTitulo.innerText = titulo;

        if (tipo === 'alert') {
            if (btnCancelar) btnCancelar.style.display = 'none';
            btnConfirma.innerText = 'OK';
        } else {
            if (btnCancelar) btnCancelar.style.display = 'block';
            btnConfirma.innerText = 'Confirmar';
        }

        m.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();

        // Remove listeners antigos
        const novoBtnConfirma = btnConfirma.cloneNode(true);
        btnConfirma.parentNode.replaceChild(novoBtnConfirma, btnConfirma);

        novoBtnConfirma.onclick = () => {
            fecharModalConfirmacao();
            resolve(true);
        };

        if (btnCancelar) {
            const novoCancelar = btnCancelar.cloneNode(true);
            btnCancelar.parentNode.replaceChild(novoCancelar, btnCancelar);
            novoCancelar.onclick = () => {
                fecharModalConfirmacao();
                resolve(false);
            };
        }
    });
}

function alertaGeral(mensagem, titulo = 'Aviso') {
    return confirmarAcao(mensagem, 'alert', titulo);
}


// --- EXPORTANDO PARA O ESCOPO GLOBAL ---
window.abrirModalAgendamento = abrirModalAgendamento;
window.fecharModalAgendamento = fecharModalAgendamento;
window.toggleFormAgendamento = toggleFormAgendamento;
window.abrirModalNovoRascunho = abrirModalNovoRascunho;
window.fecharModalRascunho = fecharModalRascunho;
window.fecharModalConfirmacao = fecharModalConfirmacao;
window.confirmarAcao = confirmarAcao;
window.alertaGeral = alertaGeral;
