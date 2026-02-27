// Variáveis globais compartilhadas
window.dadosHistoricosDB = { seguidores: [], posts: [], posts_brutos: [] };
window.chartSeguidores = null; 
window.chartPosts = null;
window.diaAtualDoModal = null;
window.dataCalendarioAtual = new Date();
window.currentTaskId = null;
window.pollingInterval = null;
window.tooltipEl = null;

export const NOMES_DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
export const NOMES_MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function converterDataString(dataStr) {
    if (!dataStr || dataStr === "Data N/A") return new Date(0);
    try { let p = dataStr.split(' '); let d = p[0].split('/'); return new Date(d[2], d[1] - 1, d[0]); } catch (e) { return new Date(0); }
}
export function getTimestamp() { return new Date().toLocaleTimeString('pt-BR') + ' - ' + new Date().toLocaleDateString('pt-BR'); }
