import './globals.js?v=4.0';
import './toast.js?v=4.0';
import './ui.js?v=5.1';
import './dashboard.js?v=5.0';
import './agendamentos.js?v=6.0';
import './modals.js?v=4.1';
import './lembretes.js?v=4.0';
import './scraper.js?v=4.0';
import './config.js?v=4.0';
import './calendar.js?v=4.0';
import './dragDrop.js?v=4.0';

// Auto-iniciar o layout
document.addEventListener('DOMContentLoaded', () => {
    if (window.inicializarCalendario) window.inicializarCalendario();
});

// Event listeners isolados
document.getElementById('legenda_post').addEventListener('input', function (e) {
    const text = e.target.value;
    const previewEl = document.getElementById('preview-legenda-texto');
    if (!text.trim()) {
        previewEl.innerHTML = 'Sua legenda aparecerá aqui...';
        return;
    }
    let formattedText = text.replace(/\n/g, '<br>');
    formattedText = formattedText.replace(/(#\w+)/g, '<span class="text-blue-500 font-medium hover:underline cursor-pointer">$1</span>');
    formattedText = formattedText.replace(/(@\w+)/g, '<span class="text-blue-500 font-medium hover:underline cursor-pointer">$1</span>');
    previewEl.innerHTML = formattedText;
});

let cropperInstance = null;
window.janelaMidias = []; // Array de objetos { id: int, file: File, type: string, url: string, aspectRatio: number }
window.midiaAtivaIndex = 0;

function atualizarUIBotoesProporcao(aspectRatio) {
    if (aspectRatio === 4 / 5) {
        document.getElementById('btn-crop-4-5').className = "px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white bg-pink-500 rounded flex gap-1 items-center transition-colors";
        document.getElementById('btn-crop-1-1').className = "px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-pink-600 bg-pink-100 hover:bg-pink-200 rounded flex gap-1 items-center transition-colors";
    } else {
        document.getElementById('btn-crop-1-1').className = "px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white bg-pink-500 rounded flex gap-1 items-center transition-colors";
        document.getElementById('btn-crop-4-5').className = "px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-pink-600 bg-pink-100 hover:bg-pink-200 rounded flex gap-1 items-center transition-colors";
    }
}

function processarArquivosSelecionados(files) {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, idx) => {
        const url = URL.createObjectURL(file);
        window.janelaMidias.push({
            id: Date.now() + idx,
            file: file,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            url: url,
            aspectRatio: 4 / 5 // Default novo
        });
    });

    if (window.janelaMidias.length > 0 && document.getElementById('preview_img_wrapper').classList.contains('hidden')) {
        window.midiaAtivaIndex = 0; // Se era o primeiro, foca nele
    } else {
        window.midiaAtivaIndex = window.janelaMidias.length - 1; // Se adicionou mais, vai pro ultimo
    }

    // Limpa os inputs para permitir selecionar a mesma foto dnv
    document.getElementById('foto_upload').value = "";
    document.getElementById('foto_upload_extra').value = "";

    // Ocultar o input overlay para não travar o arraste do Cropper
    document.getElementById('foto_upload').classList.add('hidden');

    window.renderizarCarrossel();
}

document.getElementById('foto_upload').addEventListener('change', (e) => processarArquivosSelecionados(e.target.files));
document.getElementById('foto_upload_extra').addEventListener('change', (e) => processarArquivosSelecionados(e.target.files));

window.renderizarCarrossel = function () {
    const container = document.getElementById('media-container');
    const wrapper = document.getElementById('preview_img_wrapper');
    const btnRemover = document.getElementById('btn-remover-midia');
    const cropperControls = document.getElementById('cropper-controls');

    if (window.janelaMidias.length === 0) {
        window.limparCropper();
        return;
    }

    wrapper.classList.remove('hidden');
    wrapper.classList.add('flex');
    btnRemover.classList.remove('hidden');

    const midiaAtual = window.janelaMidias[window.midiaAtivaIndex];

    // Destruir instância anterior se existir e for imagem
    if (cropperInstance) {
        // Salva recortes anteriores antes de destruir
        // (Isso é uma simplificacao. O ideal é que o cropper sempre exporte ao avançar)
        cropperInstance.destroy();
        cropperInstance = null;
    }

    container.innerHTML = ''; // Limpa o container

    if (midiaAtual.type === 'video') {
        const video = document.createElement('video');
        video.src = midiaAtual.url;
        video.controls = true;
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.className = "w-full h-full object-cover";
        container.appendChild(video);

        cropperControls.classList.add('hidden'); // Video não tem recorte aqui
    } else {
        const img = document.createElement('img');
        img.src = midiaAtual.url;
        img.id = 'preview_img_active';
        img.className = "block max-w-full max-h-full mx-auto object-contain";
        container.appendChild(img);

        cropperControls.classList.remove('hidden');
        atualizarUIBotoesProporcao(midiaAtual.aspectRatio);

        // Aguarda a imagem carregar para iniciar o Cropper
        img.onload = () => {
            cropperInstance = new Cropper(img, {
                aspectRatio: midiaAtual.aspectRatio,
                viewMode: 1,
                dragMode: 'move',
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                minContainerHeight: 350,
                ready: function () {
                    // Restaura os dados se a foto já foi cortada antes
                    if (midiaAtual.cropperData) {
                        cropperInstance.setData(midiaAtual.cropperData);
                    }
                }
            });
        };
    }

    atualizarNavegacaoCarrossel();
};

function atualizarNavegacaoCarrossel() {
    const btnPrev = document.getElementById('btn-carousel-prev');
    const btnNext = document.getElementById('btn-carousel-next');
    const dotsContainer = document.getElementById('carousel-dots');

    const maxIdx = window.janelaMidias.length - 1;

    if (maxIdx > 0) {
        btnPrev.classList.remove('hidden');
        btnNext.classList.remove('hidden');
        // Desabiliar se for borda
        btnPrev.style.display = window.midiaAtivaIndex > 0 ? 'flex' : 'none';
        btnNext.style.display = window.midiaAtivaIndex < maxIdx ? 'flex' : 'none';
    } else {
        btnPrev.classList.add('hidden');
        btnNext.classList.add('hidden');
    }

    // Dots
    dotsContainer.innerHTML = '';
    window.janelaMidias.forEach((m, idx) => {
        const dot = document.createElement('div');
        dot.className = `w-1.5 h-1.5 rounded-full transition-all ${idx === window.midiaAtivaIndex ? 'bg-white w-3 mx-0.5' : 'bg-white/50 cursor-pointer'}`;
        if (idx !== window.midiaAtivaIndex) dot.onclick = () => { if (typeof window.salvarDadosCropperAtual === 'function') window.salvarDadosCropperAtual(); window.midiaAtivaIndex = idx; window.renderizarCarrossel(); };
        dotsContainer.appendChild(dot);
    });
}

document.getElementById('btn-carousel-prev').addEventListener('click', () => {
    if (window.midiaAtivaIndex > 0) {
        if (typeof window.salvarDadosCropperAtual === 'function') window.salvarDadosCropperAtual();
        window.midiaAtivaIndex--;
        window.renderizarCarrossel();
    }
});

document.getElementById('btn-carousel-next').addEventListener('click', () => {
    if (window.midiaAtivaIndex < window.janelaMidias.length - 1) {
        if (typeof window.salvarDadosCropperAtual === 'function') window.salvarDadosCropperAtual();
        window.midiaAtivaIndex++;
        window.renderizarCarrossel();
    }
});

document.getElementById('btn-remover-midia').addEventListener('click', () => {
    if (window.janelaMidias.length > 0) {
        if (typeof window.salvarDadosCropperAtual === 'function') window.salvarDadosCropperAtual();
        window.janelaMidias.splice(window.midiaAtivaIndex, 1);
        if (window.midiaAtivaIndex >= window.janelaMidias.length && window.midiaAtivaIndex > 0) {
            window.midiaAtivaIndex--;
        }
        window.renderizarCarrossel();
    }
});

// Controles de proporção do Cropper
document.getElementById('btn-crop-4-5').addEventListener('click', () => {
    if (cropperInstance && window.janelaMidias.length > 0) {
        cropperInstance.setAspectRatio(4 / 5);
        window.janelaMidias[window.midiaAtivaIndex].aspectRatio = 4 / 5;
        atualizarUIBotoesProporcao(4 / 5);
    }
});

document.getElementById('btn-crop-1-1').addEventListener('click', () => {
    if (cropperInstance && window.janelaMidias.length > 0) {
        cropperInstance.setAspectRatio(1 / 1);
        window.janelaMidias[window.midiaAtivaIndex].aspectRatio = 1 / 1;
        atualizarUIBotoesProporcao(1 / 1);
    }
});


// Helper global para pegar TODAS as imagens finais
window.obterMidiasProcessadas = async function () {
    if (window.janelaMidias.length === 0) return [];

    let midias = [];

    // Força o salvamento da tela ativa antes de enviar
    if (typeof window.salvarDadosCropperAtual === 'function') {
        window.salvarDadosCropperAtual();
    }

    for (let i = 0; i < window.janelaMidias.length; i++) {
        let act = window.janelaMidias[i];

        if (act.type === 'image' && act.croppedCanvas) {
            // Converte o canvas salvo da imagem para arquivo
            const blob = await new Promise((res) => {
                act.croppedCanvas.toBlob(res, 'image/jpeg', 0.9);
            });
            midias.push(new File([blob], act.file.name, { type: 'image/jpeg' }));
        } else {
            // Vídeo (sobe o blob original inteiro) ou imagens não editadas
            midias.push(act.file);
        }
    }

    return midias;
};

window.limparCropper = function () {
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    window.janelaMidias = [];
    window.midiaAtivaIndex = 0;

    document.getElementById('media-container').innerHTML = '';
    document.getElementById('cropper-controls').classList.add('hidden');
    document.getElementById('preview_img_wrapper').classList.add('hidden');
    document.getElementById('preview_img_wrapper').classList.remove('flex');

    // Restaurar a área de clique inicial
    document.getElementById('foto_upload').classList.remove('hidden');

    // Resetar botões
    atualizarUIBotoesProporcao(4 / 5);
};

window.salvarDadosCropperAtual = function () {
    if (!cropperInstance || window.janelaMidias.length === 0) return;
    const act = window.janelaMidias[window.midiaAtivaIndex];
    if (act.type === 'image') {
        act.cropperData = cropperInstance.getData();
        act.croppedCanvas = cropperInstance.getCroppedCanvas({
            width: 1080,
            height: act.aspectRatio === 1 ? 1080 : 1350,
            fillColor: '#000000'
        });
    }
};
