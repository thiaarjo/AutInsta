import axios from 'axios';

const api = axios.create({
    baseURL: '',
    headers: { 'Content-Type': 'application/json' },
});

const apiCache = {};
const CACHE_TTL_MS = 10000; // 10 seconds cache

const getCached = async (key, fetcher, forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && apiCache[key] && (now - apiCache[key].timestamp < CACHE_TTL_MS)) {
        return apiCache[key].data;
    }
    const data = await fetcher();
    apiCache[key] = { timestamp: now, data };
    return data;
};

// ===== Scraper / Bot =====
export const executarBot = (payload) =>
    api.post('/executar_bot', payload).then(r => r.data);

export const cancelarBot = (taskId) =>
    api.post(`/cancelar_bot/${taskId}`).then(r => r.data);

export const getStatusTarefa = (taskId) =>
    api.get(`/api/status_tarefa/${taskId}`).then(r => r.data);

export const getEstatisticasUltimoLote = () =>
    api.get('/estatisticas/ultimo_lote').then(r => r.data);

// ===== Configurações =====
export const getConfiguracoes = () =>
    api.get('/api/configuracoes').then(r => r.data);

export const salvarConfiguracoes = (formData) =>
    api.post('/api/configuracoes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);

// ===== Perfis / Analytics =====
export const getPerfis = (forceRefresh = false) =>
    getCached('perfis', () => api.get('/api/perfis').then(r => r.data), forceRefresh);

export const getHistoricoGraficos = (forceRefresh = false) =>
    getCached('historico_graficos', () => api.get('/api/historico_graficos').then(r => r.data), forceRefresh);

export const getHistoricoDetalhado = (perfil) =>
    api.get(`/api/historico_detalhado/${perfil}`).then(r => r.data);

export const getRankingHorarios = (perfil) =>
    api.get(`/api/ranking_horarios/${perfil}`).then(r => r.data);

export const getStories = (perfil) =>
    api.get(`/api/stories/${perfil}`).then(r => r.data);

export const limparPerfil = (perfil) =>
    api.post(`/api/limpar_perfil/${perfil}`).then(r => r.data);

export const clearCache = (key) => { if (key) delete apiCache[key]; else Object.keys(apiCache).forEach(k => delete apiCache[k]); };

// ===== Agendamentos =====
export const getAgendamentos = (forceRefresh = false) =>
    getCached('agendamentos', () => api.get('/api/agendamentos', { params: { _: Date.now() } }).then(r => r.data), forceRefresh);

export const criarAgendamento = (formData) => {
    clearCache('agendamentos');
    return api.post('/api/agendar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
};

export const excluirAgendamento = (postId) => {
    clearCache('agendamentos');
    return api.delete(`/api/agendamentos/${postId}`).then(r => r.data);
};

export const atualizarDataAgendamento = (postId, novaData) => {
    clearCache('agendamentos');
    return api.patch(`/api/agendamentos/${postId}/data`, { nova_data: novaData }).then(r => r.data);
};

export const publicarAgora = (formData) => {
    clearCache('agendamentos');
    return api.post('/api/publicar_agora', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
};

export const getLogsPostagem = (postId) =>
    api.get(`/api/logs_postagem/${postId}`).then(r => r.data);

// ===== Lembretes =====
export const getLembretes = (forceRefresh = false) =>
    getCached('lembretes', () => api.get('/api/lembretes', { params: { _: Date.now() } }).then(r => r.data), forceRefresh);

export const criarLembrete = (data, texto, cor = 'yellow') => {
    clearCache('lembretes');
    return api.post('/api/lembretes', { data, texto, cor }).then(r => r.data);
};

export const editarLembrete = (id, texto, cor) => {
    clearCache('lembretes');
    return api.put(`/api/lembretes/${id}`, { texto, cor }).then(r => r.data);
};

export const deletarLembrete = (id) => {
    clearCache('lembretes');
    return api.delete(`/api/lembretes/${id}`).then(r => r.data);
};

export const moverLembrete = (id, novaData) => {
    clearCache('lembretes');
    return api.patch(`/api/lembretes/${id}/mover`, { nova_data: novaData }).then(r => r.data);
};

// ===== CSV =====
export const getExportCSVUrl = () => '/api/exportar_csv';

export default api;
