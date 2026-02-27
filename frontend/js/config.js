import { converterDataString, getTimestamp, NOMES_DIAS_SEMANA, NOMES_MESES_CURTO, NOMES_MESES } from './globals.js';

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

        if (!user || !pwd) { window.mostrarToast("Preencha o usuário e senha.", "aviso"); return; }

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
                window.mostrarToast("Erro ao salvar configurações.", "erro");
            }
        } catch (e) {
            console.error(e);
            window.mostrarToast("Falha de rede ao salvar configurações.", "erro");
        } finally {
            if (btnSalvar) {
                btnSalvar.innerHTML = btnTextoOriginal;
                btnSalvar.disabled = false;
            }
        }
    });
}

// --- EXPORTANDO PARA O ESCOPO GLOBAL ---
window.carregarConfigUI = carregarConfigUI;
