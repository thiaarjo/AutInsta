import './globals.js?v=3.0';
import './toast.js?v=3.0';
import './ui.js?v=3.0';
import './dashboard.js?v=3.0';
import './agendamentos.js?v=3.0';
import './modals.js?v=3.0';
import './lembretes.js?v=3.0';
import './scraper.js?v=3.0';
import './config.js?v=3.0';
import './calendar.js?v=3.0';
import './dragDrop.js?v=3.0';

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

document.getElementById('foto_upload').addEventListener('change', function (e) {
    if (e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function (evt) {
            document.getElementById('preview_img').src = evt.target.result;
            document.getElementById('preview_img').classList.remove('hidden');
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});
