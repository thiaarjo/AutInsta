export const NOMES_DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
export const NOMES_MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function converterDataString(dataStr) {
    if (!dataStr || dataStr === "Data N/A") return new Date(0);
    try {
        const p = dataStr.split(' ');
        const d = p[0].split('/');
        return new Date(d[2], d[1] - 1, d[0]);
    } catch {
        return new Date(0);
    }
}

export function getTimestamp() {
    return new Date().toLocaleTimeString('pt-BR') + ' - ' + new Date().toLocaleDateString('pt-BR');
}

export function fmtDataExtracao(d) {
    if (!d) return 'N/A';
    try {
        const partes = d.split(' ');
        const ymd = partes[0].split('-');
        const hora = partes[1] ? partes[1].substring(0, 5) : '';
        return `${ymd[2]}/${ymd[1]} ${hora}`;
    } catch {
        return d;
    }
}

export function fmtDataPub(d) {
    if (!d) return 'N/A';
    return d.split(' ')[0];
}
