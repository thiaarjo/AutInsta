import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, RefreshCw, Lightbulb, CalendarCheck, CheckCircle, Clock, AlertCircle, Trash2, StickyNote, X, Image as ImageIcon, Send as SendIcon, Loader2, Save, Type, Pencil, Check, Eye } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import MediaUploader from '../components/MediaUploader';
import { getAgendamentos, criarAgendamento, excluirAgendamento, atualizarDataAgendamento, publicarAgora as publicarAgoraApi, getLogsPostagem, getLembretes, criarLembrete, editarLembrete, deletarLembrete as deletarLembreteApi, moverLembrete } from '../services/api';
import { NOMES_MESES, NOMES_MESES_CURTO, NOMES_DIAS_SEMANA } from '../utils/constants';

// ========== Caption Preview ==========
function CaptionPreview({ text }) {
    if (!text || !text.trim()) return <p className="text-xs text-zinc-400 italic">Sua legenda aparecerá aqui...</p>;
    let f = text.replace(/\n/g, '<br>');
    f = f.replace(/(#\w+)/g, '<span class="text-blue-500 font-medium">$1</span>');
    f = f.replace(/(@\w+)/g, '<span class="text-blue-500 font-medium">$1</span>');
    return <p className="text-xs text-zinc-700 leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: f }} />;
}

// ========== Mini Calendar (seletor de data compacto) ==========
function MiniCalendar({ selectedDate, onSelectDate, agendamentos, lembretes }) {
    const [viewDate, setViewDate] = useState(new Date());
    const ano = viewDate.getFullYear();
    const mes = viewDate.getMonth();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const diaDaSemanaInicio = new Date(ano, mes, 1).getDay();
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const isMesmo = hoje.getFullYear() === ano && hoje.getMonth() === mes;

    const mudarMes = (d) => setViewDate(prev => { const n = new Date(prev); n.setMonth(n.getMonth() + d); return n; });

    return (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                <button onClick={() => mudarMes(-1)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm font-bold text-zinc-800">{NOMES_MESES_CURTO[mes]} {ano}</span>
                <button onClick={() => mudarMes(1)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
            {/* Days header */}
            <div className="grid grid-cols-7 px-2 pt-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <div key={i} className="text-[10px] font-black text-zinc-400 text-center py-1 uppercase">{d}</div>
                ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7 px-2 pb-2">
                {Array.from({ length: diaDaSemanaInicio }).map((_, i) => <div key={`e-${i}`} className="h-8" />)}
                {Array.from({ length: diasNoMes }).map((_, idx) => {
                    const dia = idx + 1;
                    const dStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                    const isHoje = isMesmo && hoje.getDate() === dia;
                    const isSelected = selectedDate === dStr;
                    const dataDia = new Date(ano, mes, dia); dataDia.setHours(0, 0, 0, 0);
                    const isPassado = dataDia < hoje;
                    const temPosts = agendamentos.some(a => a.data_agendada?.startsWith(dStr));
                    const temLembretes = lembretes.some(l => l.data === dStr);

                    return (
                        <button key={dia} onClick={() => !isPassado && onSelectDate(dStr)}
                            disabled={isPassado}
                            className={`h-8 w-full flex items-center justify-center rounded-lg text-xs font-bold relative transition-all
                ${isSelected ? 'bg-pink-600 text-white shadow-sm' : isHoje ? 'bg-pink-100 text-pink-700' : isPassado ? 'text-zinc-300 cursor-default' : 'text-zinc-600 hover:bg-zinc-100 cursor-pointer'}`}>
                            {dia}
                            {(temPosts || temLembretes) && !isSelected && (
                                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5`}>
                                    {temPosts && <span className="w-1 h-1 rounded-full bg-pink-500" />}
                                    {temLembretes && <span className="w-1 h-1 rounded-full bg-amber-500" />}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ========== Post Card (no feed lateral) ==========
function PostCard({ post, onDelete }) {
    const hora = post.data_agendada?.split('T')[1]?.substring(0, 5) || '';
    const isPub = post.status === 'PUBLICADO';
    const isErr = post.status === 'ERRO';
    const statusColor = isPub ? 'text-green-600' : isErr ? 'text-red-600' : 'text-pink-600';
    const StatusIcon = isPub ? CheckCircle : isErr ? AlertCircle : Clock;

    return (
        <div className={`${isPub ? 'border-l-green-500' : isErr ? 'border-l-red-500' : 'border-l-pink-500'} border-l-[3px] bg-white border border-zinc-200 rounded-lg px-3 py-2.5 flex items-center gap-3 group hover:shadow-md transition-all relative`}>
            {post.arquivo ? (
                <div className="w-10 h-10 rounded-lg shrink-0 bg-zinc-100 overflow-hidden border border-zinc-200">
                    <img src={`/uploads/${post.arquivo}`} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                </div>
            ) : (
                <div className="w-10 h-10 rounded-lg shrink-0 bg-zinc-100 flex items-center justify-center border border-zinc-200">
                    <Type className="w-4 h-4 text-zinc-400" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-black ${statusColor} flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" /> {hora} • {isPub ? 'Publicado' : isErr ? 'Erro' : 'Pendente'}
                </p>
                <p className="text-[10px] text-zinc-500 truncate mt-0.5">{(post.legenda || '').substring(0, 60) || 'Sem legenda'}</p>
            </div>
            <button onClick={() => onDelete(post.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-all shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ========== Lembrete Item ==========
function LembreteItem({ lembrete, onEdit, onDelete, editing, editText, setEditText, onSaveEdit, onCancelEdit }) {
    if (editing) {
        return (
            <div className="flex items-center gap-1.5 bg-amber-50 border-2 border-amber-400 rounded-lg px-3 py-2 shadow-sm">
                <input type="text" value={editText} onChange={e => setEditText(e.target.value)} maxLength={100}
                    onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); else if (e.key === 'Escape') onCancelEdit(); }}
                    autoFocus className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-amber-800 min-w-0" />
                <button onClick={onSaveEdit} className="p-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-700"><Check className="w-3 h-3" /></button>
                <button onClick={onCancelEdit} className="p-1 rounded hover:bg-red-100 text-red-400"><X className="w-3 h-3" /></button>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2 bg-amber-50/80 border border-amber-200 rounded-lg px-3 py-2 group hover:shadow-sm transition-all">
            <StickyNote className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs font-bold text-amber-800 flex-1 truncate">{lembrete.texto}</span>
            <button onClick={() => onEdit(lembrete)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-amber-200 text-amber-600 transition-all"><Pencil className="w-3 h-3" /></button>
            <button onClick={() => onDelete(lembrete.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 transition-all"><Trash2 className="w-3 h-3" /></button>
        </div>
    );
}

// ========== MAIN CalendarPage ==========
export default function CalendarPage() {
    const mostrarToast = useToast();
    const confirmarAcao = useConfirm();

    // Data
    const [agendamentos, setAgendamentos] = useState([]);
    const [lembretes, setLembretes] = useState([]);

    // Selected date
    const hojeStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
    const [selectedDate, setSelectedDate] = useState(hojeStr);

    // Post creation form
    const [legenda, setLegenda] = useState('');
    const [dataAgendada, setDataAgendada] = useState(selectedDate + 'T12:00');
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [publishMsg, setPublishMsg] = useState('');
    const mediaRef = useRef(null);

    // Lembrete
    const [novoLembrete, setNovoLembrete] = useState('');
    const [editingLemId, setEditingLemId] = useState(null);
    const [editingLemText, setEditingLemText] = useState('');

    // Tab
    const [activeTab, setActiveTab] = useState('compor'); // 'compor' | 'dia'

    const loadData = useCallback(async () => {
        try {
            const [agData, lemData] = await Promise.all([getAgendamentos(), getLembretes()]);
            setAgendamentos(agData.agendamentos || []);
            setLembretes(lemData.lembretes || []);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Sync dataAgendada when selectedDate changes
    useEffect(() => {
        setDataAgendada(selectedDate + 'T12:00');
    }, [selectedDate]);

    const handleDeleteAgendamento = async (id) => {
        const ok = await confirmarAcao('Remover post da programação?');
        if (ok) {
            setAgendamentos(prev => prev.filter(a => a.id !== id));
            try { await excluirAgendamento(id); } catch { loadData(); }
        }
    };

    const handleDeleteLembrete = async (id) => {
        const ok = await confirmarAcao('Excluir este lembrete?');
        if (ok) {
            setLembretes(prev => prev.filter(l => l.id !== id));
            try { await deletarLembreteApi(id); } catch { loadData(); }
        }
    };

    // Submit agendamento
    const handleAgendar = async (e) => {
        e.preventDefault();
        if (!mediaRef.current?.hasMidias()) { mostrarToast('Selecione pelo menos uma mídia.', 'erro'); return; }
        if (!dataAgendada) { mostrarToast('Escolha uma data e horário.', 'erro'); return; }

        setSaving(true);
        try {
            const midias = await mediaRef.current.obterMidiasProcessadas();
            const formData = new FormData();
            midias.forEach(m => formData.append('midias', m));
            formData.append('legenda', legenda);
            formData.append('data_agendada', dataAgendada);
            await criarAgendamento(formData);
            setLegenda('');
            mediaRef.current?.limpar();
            mostrarToast('Post agendado com sucesso!', 'sucesso');
            loadData();
        } catch (err) {
            mostrarToast(err.response?.data?.detail || 'Erro ao agendar.', 'erro');
        } finally { setSaving(false); }
    };

    // Publicar Agora
    const handlePublicarAgora = async () => {
        if (!mediaRef.current?.hasMidias()) { mostrarToast('Selecione pelo menos uma mídia.', 'erro'); return; }
        const ok = await confirmarAcao('Publicar agora no Instagram?');
        if (!ok) return;

        setPublishing(true);
        setPublishMsg('Iniciando robô...');
        try {
            const midias = await mediaRef.current.obterMidiasProcessadas();
            const formData = new FormData();
            midias.forEach(m => formData.append('midias', m));
            formData.append('legenda', legenda);
            const data = await publicarAgoraApi(formData);

            if (data.post_id) {
                let attempts = 0;
                const maxAttempts = 100; // ~5 minutos de segurança
                const interval = setInterval(async () => {
                    attempts++;
                    try {
                        const logs = await getLogsPostagem(data.post_id);
                        if (logs?.length > 0) {
                            setPublishMsg(logs[logs.length - 1].mensagem?.substring(0, 40) || 'Processando...');
                            const ended = logs.find(l => l.tipo === 'SUCESSO' || l.tipo === 'ERRO' || l.tipo === 'ERROR');
                            if (ended) {
                                clearInterval(interval);
                                setPublishing(false);
                                setPublishMsg('');
                                if (ended.tipo === 'SUCESSO') {
                                    mostrarToast('Publicado com sucesso no Instagram!', 'sucesso');
                                    setLegenda('');
                                    mediaRef.current?.limpar();
                                    loadData();
                                } else {
                                    mostrarToast('Erro na publicação automática.', 'erro');
                                }
                            }
                        }
                    } catch { /* erro na api de logs, ignora algumas vezes */ }

                    if (attempts > maxAttempts) {
                        clearInterval(interval);
                        setPublishing(false);
                        setPublishMsg('');
                        mostrarToast('Tempo de espera excedido. Verifique o status no painel.', 'erro');
                    }
                }, 3000);
            }
        } catch {
            mostrarToast('Erro ao tentar publicar.', 'erro');
            setPublishing(false);
            setPublishMsg('');
        }
    };

    // Rascunho
    const handleSalvarRascunho = async () => {
        if (!mediaRef.current?.hasMidias() && !legenda.trim()) { mostrarToast('Adicione uma mídia ou legenda.', 'erro'); return; }
        setSaving(true);
        try {
            const formData = new FormData();
            if (mediaRef.current?.hasMidias()) {
                const midias = await mediaRef.current.obterMidiasProcessadas();
                midias.forEach(m => formData.append('midias', m));
            }
            formData.append('legenda', legenda);
            formData.append('data_agendada', '');
            await criarAgendamento(formData);
            setLegenda('');
            mediaRef.current?.limpar();
            mostrarToast('Ideia salva!', 'sucesso');
            loadData();
        } catch (err) {
            mostrarToast(err.response?.data?.detail || 'Erro ao salvar.', 'erro');
        } finally { setSaving(false); }
    };

    // Lembretes
    const handleSalvarLembrete = async () => {
        if (!novoLembrete.trim()) return;
        const textoLocal = novoLembrete.trim();
        const tempId = Date.now();
        setLembretes(prev => [...prev, { id: tempId, data: selectedDate, texto: textoLocal, cor: 'yellow' }]);
        setNovoLembrete('');
        try {
            const res = await criarLembrete(selectedDate, textoLocal);
            // Update tempId with real ID from DB
            setLembretes(prev => prev.map(l => l.id === tempId ? { ...l, id: res.id } : l));
        } catch { loadData(); }
    };

    const startEditLembrete = (lem) => { setEditingLemId(lem.id); setEditingLemText(lem.texto); };
    const saveEditLembrete = async () => {
        if (!editingLemText.trim()) { setEditingLemId(null); return; }
        const textoLocal = editingLemText.trim();
        const targetId = editingLemId;
        setLembretes(prev => prev.map(l => l.id === targetId ? { ...l, texto: textoLocal } : l));
        setEditingLemId(null);
        try { await editarLembrete(targetId, textoLocal, 'yellow'); } catch { loadData(); }
    };

    // Computed data for selected date
    const postsDoDia = agendamentos.filter(a => a.data_agendada?.startsWith(selectedDate) && a.status !== 'RASCUNHO');
    const rascunhos = agendamentos.filter(a => a.status === 'RASCUNHO' || !a.data_agendada);
    const lembretesDoDia = lembretes.filter(l => l.data === selectedDate);

    // Label do dia selecionado  
    const selectedLabel = (() => {
        const p = selectedDate.split('-');
        const dt = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
        return `${NOMES_DIAS_SEMANA[dt.getDay()]}, ${dt.getDate()} de ${NOMES_MESES[dt.getMonth()]}`;
    })();

    return (
        <main className="max-w-[1400px] mx-auto py-6 px-6 min-h-[calc(100vh-80px)] flex flex-col">

            {/* ====== 3-COLUMN LAYOUT ====== */}
            <div className="flex gap-6 items-start flex-1">

                {/* ====== LEFT COLUMN: Controls Panel ====== */}
                <div className="w-[260px] shrink-0 space-y-4">
                    {/* Profile header */}
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2.5 px-4 py-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-amber-500 p-[2px]">
                                <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                                    <img src="/assets/logo-DyFNFi6b.png" className="w-5 h-5 object-contain" alt="" onError={e => { e.target.style.display = 'none'; }} />
                                </div>
                            </div>
                            <span className="text-[13px] font-semibold text-zinc-900 flex-1 min-w-0">seu_perfil</span>
                            <button className="text-zinc-400 hover:text-zinc-600"><span className="text-lg leading-none">···</span></button>
                        </div>

                        {/* Tool buttons */}
                        <div className="grid grid-cols-1 border-t border-zinc-100">
                            <button onClick={() => { mediaRef.current?.limpar(); setLegenda(''); }}
                                className="flex flex-col items-center gap-1 py-3 text-red-500 hover:text-red-600 hover:bg-red-50/50 transition-colors">
                                <Trash2 className="w-4 h-4" />
                                <span className="text-[8px] font-bold uppercase">Clear</span>
                            </button>
                        </div>
                    </div>

                    {/* Legenda */}
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-4">
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Legenda</label>
                        <textarea value={legenda} onChange={e => setLegenda(e.target.value)} rows={4}
                            className="w-full bg-transparent text-[13px] outline-none resize-none placeholder:text-zinc-400 leading-relaxed text-zinc-800 border border-zinc-200 rounded-lg px-3 py-2 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all"
                            placeholder="Escreva sua legenda..." />
                        {legenda.length > 0 && <p className="text-[9px] text-zinc-400 mt-1 text-right">{legenda.length}</p>}
                    </div>

                    {/* Date + Time */}
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-4 space-y-3">
                        <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Data</label>
                            <div className="flex items-center gap-2 border border-zinc-200 rounded-lg px-3 py-2">
                                <CalendarIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <input type="date" value={dataAgendada.split('T')[0]} onChange={e => setDataAgendada(e.target.value + 'T' + (dataAgendada.split('T')[1] || '12:00'))}
                                    className="flex-1 bg-transparent text-xs font-semibold outline-none text-zinc-700" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Hora</label>
                            <div className="flex items-center gap-2 border border-zinc-200 rounded-lg px-3 py-2">
                                <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <input type="time" value={dataAgendada.split('T')[1] || '12:00'} onChange={e => setDataAgendada((dataAgendada.split('T')[0]) + 'T' + e.target.value)}
                                    className="flex-1 bg-transparent text-xs font-semibold outline-none text-zinc-700" />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons (stacked) */}
                    <div className="space-y-2">
                        <button onClick={handleAgendar} disabled={saving || publishing}
                            className="w-full bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all flex justify-center items-center gap-1.5 disabled:opacity-50 shadow-sm">
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarCheck className="w-3.5 h-3.5" />}
                            Agendar
                        </button>
                        <button onClick={handlePublicarAgora} disabled={saving || publishing}
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all flex justify-center items-center gap-1.5 disabled:opacity-50 shadow-sm">
                            {publishing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> <span className="truncate max-w-[100px]">{publishMsg}</span></> : <><SendIcon className="w-3.5 h-3.5" /> Publicar Agora</>}
                        </button>
                    </div>
                </div>

                {/* ====== CENTER COLUMN: Post Preview ====== */}
                <div className="flex-1 min-w-0 flex flex-col items-center">
                    {/* MediaUploader with live caption */}
                    <div className="w-full max-w-[520px]">
                        <MediaUploader ref={mediaRef} caption={legenda} />
                    </div>
                </div>

                {/* ====== RIGHT COLUMN: Calendar + Panels ====== */}
                <div className="w-[280px] shrink-0 space-y-4">
                    {/* Mini Calendar */}
                    <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate}
                        agendamentos={agendamentos} lembretes={lembretes} />

                    {/* Notas / Ideias do Dia */}
                    <div className="bg-white border border-yellow-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-yellow-100 bg-yellow-50/50 flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-800">Notas para o dia</span>
                            <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{lembretesDoDia.length}</span>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex gap-2">
                                <input type="text" value={novoLembrete} onChange={e => setNovoLembrete(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSalvarLembrete()}
                                    placeholder="Ideia rápida..."
                                    className="flex-1 bg-zinc-50 border border-zinc-200 text-[11px] rounded-lg px-3 py-2 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all placeholder:text-zinc-400 font-medium text-zinc-700" />
                                <button onClick={handleSalvarLembrete} disabled={!novoLembrete.trim()}
                                    className="w-8 h-8 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg transition-colors disabled:opacity-50 shrink-0 shadow-sm">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            {lembretesDoDia.length > 0 && (
                                <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                                    {lembretesDoDia.map(l => (
                                        <div key={l.id} className="group flex items-start justify-between gap-2 p-2.5 bg-yellow-50/50 hover:bg-yellow-100/50 rounded-lg border border-yellow-100 transition-colors">
                                            {editingLemId === l.id ? (
                                                <div className="flex-1 flex gap-2">
                                                    <input autoFocus value={editingLemText} onChange={e => setEditingLemText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditLembrete()} className="flex-1 bg-white border border-yellow-300 text-[10px] rounded px-2 py-1 outline-none focus:border-yellow-500 font-medium text-zinc-700" />
                                                    <button onClick={saveEditLembrete} className="text-emerald-500 hover:text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-[11px] font-medium text-zinc-700 leading-normal flex-1 cursor-text" onClick={() => startEditLembrete(l)}>{l.texto}</p>
                                                    <button onClick={() => handleDeleteLembrete(l.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity shrink-0 pt-0.5"><Trash2 className="w-3 h-3" /></button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Próximos Agendamentos */}
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-800">Próximos Agendamentos</span>
                            <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                                {agendamentos.filter(a => a.data_agendada && a.status === 'PENDENTE').length}
                            </span>
                        </div>
                        <div className="p-4 min-h-[120px]">
                            {agendamentos.filter(a => a.data_agendada && a.status === 'PENDENTE').length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-6 text-zinc-400">
                                    <ImageIcon className="w-8 h-8 mb-2 text-zinc-300" />
                                    <p className="text-xs">Nenhum post agendado</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                    {agendamentos.filter(a => a.data_agendada && a.status === 'PENDENTE').sort((a, b) => a.data_agendada.localeCompare(b.data_agendada)).slice(0, 6).map(post => {
                                        const hora = post.data_agendada?.split('T')[1]?.substring(0, 5) || '';
                                        const dateP = post.data_agendada?.split('T')[0]?.split('-') || [];
                                        const dateLabel = dateP.length === 3 ? `${dateP[2]}/${dateP[1]}` : '';
                                        return (
                                            <div key={post.id} className="flex items-center gap-2.5 group">
                                                {post.arquivo ? (
                                                    <div className="w-8 h-8 rounded-lg shrink-0 bg-zinc-100 overflow-hidden border border-zinc-200"><img src={`/uploads/${post.arquivo}`} className="w-full h-full object-cover" /></div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg shrink-0 bg-zinc-100 flex items-center justify-center border border-zinc-200"><Type className="w-3.5 h-3.5 text-zinc-400" /></div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-black text-pink-600 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {dateLabel} às {hora}</p>
                                                    <p className="text-[10px] text-zinc-500 truncate">{(post.legenda || '').substring(0, 35) || 'Sem legenda'}</p>
                                                </div>
                                                <button onClick={() => handleDeleteAgendamento(post.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-500 transition-all shrink-0">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ====== STATUS BAR ====== */}
            <div className="mt-6 pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Conectado: @seu_perfil
                    </span>
                    <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-2.5 h-2.5" />
                        Sincronizado
                    </span>
                </div>
                <span className="font-semibold">Versão Pro 2.4.0</span>
            </div>
        </main>
    );
}
