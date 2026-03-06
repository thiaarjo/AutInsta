import { useState, useEffect, useCallback } from 'react';
import { Users, Hash, Calendar as CalendarIcon, CalendarDays, Infinity, Clock, ExternalLink, Repeat, Image as ImageIcon, Video, CalendarClock, Loader2, AlertTriangle, FileSpreadsheet, Eraser, TrendingUp, TrendingDown, BarChart3, PlaySquare, History, Grid3x3, RefreshCw } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useToast } from '../components/Toast';
import { getPerfis, getHistoricoGraficos, getHistoricoDetalhado, getStories, getExportCSVUrl } from '../services/api';
import { converterDataString, fmtDataExtracao, fmtDataPub } from '../utils/constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// ========== Metric Card (white, pink icon) ==========
function MetricCard({ icon: Icon, label, value, trend, trendLabel }) {
    const isPositive = trend === undefined || trend >= 0;
    const isLongValue = value && String(value).length > 8;
    return (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-3">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 truncate">{label}</p>
                    <p className={`${isLongValue ? 'text-2xl' : 'text-3xl'} font-black text-zinc-900 tracking-tight truncate`} title={value}>{value}</p>
                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 mt-2 text-[11px] font-bold ${isPositive ? 'text-pink-600' : 'text-red-500'} truncate`}>
                            {isPositive ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                            <span className="truncate">{trendLabel || `${isPositive ? '+' : ''}${trend}%`}</span>
                        </div>
                    )}
                </div>
                <div className="w-11 h-11 rounded-full bg-pink-50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-pink-600" />
                </div>
            </div>
        </div>
    );
}

// ========== MAIN ==========
export default function DashboardPage() {
    const mostrarToast = useToast();
    const [loading, setLoading] = useState(true);
    const [perfis, setPerfis] = useState([]);
    const [perfilSelecionado, setPerfilSelecionado] = useState('');
    const [dadosDB, setDadosDB] = useState({ seguidores: [], posts: [], posts_brutos: [] });
    const [error, setError] = useState(null);

    const [totalPosts, setTotalPosts] = useState(0);
    const [media7, setMedia7] = useState(0);
    const [media30, setMedia30] = useState(0);
    const [mediaGeral, setMediaGeral] = useState(0);
    const [ultimoSeg, setUltimoSeg] = useState(null);

    const [segChartData, setSegChartData] = useState(null);
    const [postsChartData, setPostsChartData] = useState(null);

    const [postsGaleria, setPostsGaleria] = useState([]);
    const [storiesGaleria, setStoriesGaleria] = useState([]);
    const [storiesLoading, setStoriesLoading] = useState(false);

    const [historico, setHistorico] = useState([]);
    const [historicoLoading, setHistoricoLoading] = useState(false);

    const carregarDados = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const [resHistorico, resPerfis] = await Promise.all([getHistoricoGraficos(forceRefresh), getPerfis(forceRefresh)]);
            setDadosDB(resHistorico);
            setPerfis(resPerfis.perfis || []);
        } catch {
            setError('Erro ao buscar histórico do banco.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { carregarDados(); }, [carregarDados]);

    const atualizarGraficos = useCallback(async (perfil) => {
        if (!perfil) return limparTela();
        const limpo = perfil.replace('@', '').toLowerCase();

        const histSeg = dadosDB.seguidores.filter(s => s.perfil.toLowerCase() === limpo);
        const histPosts = dadosDB.posts.filter(p => p.perfil.toLowerCase() === limpo);

        const agora = new Date();
        const data7 = new Date(); data7.setDate(agora.getDate() - 7);
        const data30 = new Date(); data30.setDate(agora.getDate() - 30);
        const posts7 = histPosts.filter(p => p.data ? converterDataString(p.data) >= data7 : false);
        const posts30 = histPosts.filter(p => p.data ? converterDataString(p.data) >= data30 : false);
        const calcMedia = (arr) => arr.length === 0 ? 0 : Math.round(arr.reduce((a, p) => a + p.curtidas, 0) / arr.length);

        setTotalPosts(histPosts.length);
        setMediaGeral(calcMedia(histPosts));
        setMedia7(calcMedia(posts7));
        setMedia30(calcMedia(posts30));
        setUltimoSeg(histSeg.length > 0 ? histSeg[histSeg.length - 1].valor : null);

        setSegChartData({
            labels: histSeg.map(s => s.data.split(' ')[0]),
            datasets: [{
                label: 'Seguidores', data: histSeg.map(s => s.valor),
                borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.08)',
                borderWidth: 2.5, tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 5,
                pointBackgroundColor: '#ec4899'
            }]
        });

        setPostsChartData({
            labels: histPosts.map((_, i) => `P${i + 1}`),
            datasets: [{
                label: 'Curtidas', data: histPosts.map(p => p.curtidas),
                backgroundColor: 'rgba(236,72,153,0.25)', hoverBackgroundColor: 'rgba(236,72,153,0.6)',
                borderWidth: 0, borderRadius: 6,
                barThickness: histPosts.length <= 3 ? 40 : undefined, maxBarThickness: 50
            }]
        });

        const brutos = (dadosDB.posts_brutos || []).filter(p => p.perfil.toLowerCase() === limpo);
        const mapaUnico = {};
        brutos.forEach(p => {
            if (!p.url_post) return;
            if (!mapaUnico[p.url_post]) {
                mapaUnico[p.url_post] = { ...p, vezes_extraido: 1, primeira_extracao: p.data_extracao, ultima_extracao: p.data_extracao };
            } else {
                mapaUnico[p.url_post].vezes_extraido++;
                if (p.data_extracao > mapaUnico[p.url_post].ultima_extracao) {
                    mapaUnico[p.url_post].curtidas = p.curtidas;
                    mapaUnico[p.url_post].ultima_extracao = p.data_extracao;
                    if (p.print) mapaUnico[p.url_post].print = p.print;
                }
            }
        });
        setPostsGaleria(Object.values(mapaUnico));

        setStoriesLoading(true);
        try { const d = await getStories(limpo); setStoriesGaleria(d.stories || []); } catch { setStoriesGaleria([]); }
        setStoriesLoading(false);

        setHistoricoLoading(true);
        try { const d = await getHistoricoDetalhado(perfil); setHistorico(d.historico || []); } catch { setHistorico([]); }
        setHistoricoLoading(false);
    }, [dadosDB]);

    const limparTela = () => {
        setPerfilSelecionado('');
        setTotalPosts(0); setMedia7(0); setMedia30(0); setMediaGeral(0); setUltimoSeg(null);
        setSegChartData(null); setPostsChartData(null);
        setPostsGaleria([]); setStoriesGaleria([]); setHistorico([]);
        mostrarToast('🧹 Tela limpa! Selecione outro perfil.', 'sucesso');
    };

    const handlePerfilChange = (val) => {
        setPerfilSelecionado(val);
        if (val) atualizarGraficos(val);
        else limparTela();
    };

    const chartOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#18181b', titleFont: { size: 11 }, bodyFont: { size: 12 }, cornerRadius: 8, padding: 10 } },
        scales: { x: { grid: { display: false }, ticks: { font: { size: 10, weight: 600 }, color: '#a1a1aa' } }, y: { display: false, beginAtZero: false, grid: { display: false } } }
    };
    const barOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#18181b', titleFont: { size: 11 }, bodyFont: { size: 12 }, cornerRadius: 8, padding: 10 } },
        scales: { x: { grid: { display: false }, ticks: { font: { size: 10, weight: 600 }, color: '#a1a1aa' } }, y: { display: false, beginAtZero: true, grid: { display: false } } }
    };

    if (loading) return (
        <main className="max-w-[1320px] mx-auto py-12 px-6">
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="font-medium text-sm">Processando histórico...</p>
            </div>
        </main>
    );

    if (error) return (
        <main className="max-w-[1320px] mx-auto py-12 px-6">
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <AlertTriangle className="w-8 h-8 mb-3 text-red-500" />
                <p className="font-medium text-sm text-red-600">{error}</p>
            </div>
        </main>
    );

    // Compute subtitle for follower chart
    const segSubtitle = (() => {
        if (!segChartData || segChartData.datasets[0].data.length < 2) return '';
        const d = segChartData.datasets[0].data;
        const diff = d[d.length - 1] - d[0];
        return `${diff >= 0 ? '+' : ''}${diff.toLocaleString('pt-BR')} no período coletado`;
    })();

    // Compute avg likes subtitle
    const avgLikes = postsChartData && postsChartData.datasets[0].data.length > 0
        ? Math.round(postsChartData.datasets[0].data.reduce((a, b) => a + b, 0) / postsChartData.datasets[0].data.length)
        : 0;

    return (
        <main className="max-w-[1320px] mx-auto py-8 px-6">
            {/* Header row with profile selector */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <select value={perfilSelecionado} onChange={e => handlePerfilChange(e.target.value)}
                        className="bg-white border border-zinc-200 text-xs font-bold text-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-pink-500 shadow-sm cursor-pointer min-w-[180px]">
                        <option value="">Selecione um perfil...</option>
                        {perfis.map(p => <option key={p} value={p}>@{p}</option>)}
                    </select>
                    <a href={getExportCSVUrl()} download
                        className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg flex items-center gap-1 transition shadow-sm shrink-0">
                        <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                    </a>
                    <button onClick={limparTela}
                        className="text-[10px] font-bold bg-zinc-50 hover:bg-zinc-100 text-zinc-500 border border-zinc-200 px-3 py-2 rounded-lg flex items-center gap-1 transition shadow-sm shrink-0">
                        <Eraser className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ====== 3-COLUMN LAYOUT ====== */}
            <div className="flex gap-5 items-start">

                {/* ====== LEFT COLUMN: Metric Cards ====== */}
                <div className="w-[240px] shrink-0 space-y-4">
                    <MetricCard icon={Users} label="Seguidores" value={ultimoSeg ? ultimoSeg.toLocaleString('pt-BR') : '—'} />
                    <MetricCard icon={Hash} label="Posts Lidos" value={totalPosts.toLocaleString('pt-BR')} />
                    <MetricCard icon={CalendarIcon} label="7D Average" value={media7.toLocaleString('pt-BR')} />
                    <MetricCard icon={CalendarDays} label="30D Average" value={media30.toLocaleString('pt-BR')} />
                    <MetricCard icon={BarChart3} label="General Average" value={mediaGeral.toLocaleString('pt-BR')} />
                </div>

                {/* ====== CENTER COLUMN: Charts ====== */}
                <div className="flex-1 min-w-0 space-y-5">
                    {/* Follower Growth */}
                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-lg font-bold text-zinc-900">Follower Growth</h3>
                        </div>
                        <p className="text-xs text-zinc-400 mb-4">{segSubtitle || 'Selecione um perfil'}</p>
                        <div style={{ height: 220 }}>
                            {segChartData ? <Line data={segChartData} options={chartOpts} /> : <EmptyChart />}
                        </div>
                    </div>

                    {/* Likes per Post */}
                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-1">
                            <div>
                                <h3 className="text-lg font-bold text-zinc-900">Likes per Post</h3>
                                <p className="text-xs text-zinc-400">Avg. {avgLikes.toLocaleString('pt-BR')} likes per update</p>
                            </div>
                            {postsChartData && (
                                <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full">{postsChartData.datasets[0].data.length} POSTS</span>
                            )}
                        </div>
                        <div style={{ height: 220 }} className="mt-4">
                            {postsChartData ? <Bar data={postsChartData} options={barOpts} /> : <EmptyChart />}
                        </div>
                    </div>
                </div>

                {/* ====== RIGHT COLUMN: Stories + History + Posts ====== */}
                <div className="w-[280px] shrink-0 space-y-4">

                    {/* Extracted Stories */}
                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-zinc-100">
                            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                                <PlaySquare className="w-4 h-4 text-pink-600" /> Extracted Stories
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {storiesLoading ? (
                                <div className="flex items-center justify-center py-6 text-zinc-400">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-xs">Carregando...</span>
                                </div>
                            ) : storiesGaleria.length === 0 ? (
                                <p className="text-xs text-zinc-400 text-center py-4">Selecione um perfil</p>
                            ) : storiesGaleria.slice(0, 4).map((s, i) => {
                                const isVideo = s.tipo && s.tipo.toUpperCase() === 'VIDEO';
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isVideo ? 'bg-red-50' : 'bg-orange-50'}`}>
                                            {isVideo ? <Video className="w-4 h-4 text-red-500" /> : <ImageIcon className="w-4 h-4 text-orange-500" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-zinc-800 truncate">{isVideo ? 'Story Vídeo' : 'Story Foto'}</p>
                                            <p className="text-[10px] text-zinc-400">Extraído {fmtDataExtracao(s.data_extracao)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent History */}
                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-zinc-100">
                            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                                <History className="w-4 h-4 text-pink-600" /> Recent History
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {historicoLoading ? (
                                <div className="flex items-center justify-center py-4 text-zinc-400">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-xs">Buscando...</span>
                                </div>
                            ) : historico.length === 0 ? (
                                <p className="text-xs text-zinc-400 text-center py-4">Aguardando dados...</p>
                            ) : historico.slice(0, 5).map((reg, i) => {
                                let df = reg.data_hora;
                                try { const p = reg.data_hora.split(' '); const d = p[0].split('-'); df = `${d[2]}/${d[1]} ${p[1]?.substring(0, 5) || ''}`; } catch { }
                                const val = reg.seguidores_texto || (reg.seguidores_valor || 0).toLocaleString('pt-BR');
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${i === 0 ? 'bg-pink-500' : 'bg-zinc-300'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-zinc-800">{val} seguidores</p>
                                            <p className="text-[10px] text-zinc-400">{df}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Extracted Posts (pink card) */}
                    <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10" />
                        <div className="relative z-10">
                            <h3 className="text-base font-bold">Extracted Posts</h3>
                            <p className="text-xs text-white/70 mt-0.5">
                                {postsGaleria.length > 0 ? `${postsGaleria.length} posts coletados` : 'Selecione um perfil'}
                            </p>
                            {postsGaleria.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-3">
                                    {postsGaleria.slice(0, 3).map((p, i) => (
                                        <div key={i} className="w-8 h-8 rounded-lg bg-white/20 overflow-hidden">
                                            {p.print && <img src={p.print} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />}
                                        </div>
                                    ))}
                                    {postsGaleria.length > 3 && (
                                        <span className="text-[10px] font-bold text-white/60 ml-1">+{postsGaleria.length - 3}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ====== FULL GALLERIES (below main layout) ====== */}

            {/* Posts Gallery */}
            {postsGaleria.length > 0 && (
                <div className="mt-6 bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                            <Grid3x3 className="w-4 h-4 text-pink-600" /> Posts Extraídos
                        </h3>
                        <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full">{postsGaleria.length} posts</span>
                    </div>
                    <div className="p-5">
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                            {postsGaleria.map((p, i) => (
                                <div key={i} className="bg-white rounded-xl border border-zinc-200 overflow-hidden hover:shadow-lg hover:border-pink-300 transition-all group">
                                    <div className="aspect-square bg-zinc-100 relative overflow-hidden">
                                        {p.print ? (
                                            <img src={p.print} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { e.target.style.display = 'none'; }} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-zinc-300" /></div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">❤ {(p.curtidas || 0).toLocaleString('pt-BR')}</span>
                                        </div>
                                        {p.vezes_extraido > 1 && (
                                            <span className="absolute top-2 left-2 bg-violet-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow">{p.vezes_extraido}x</span>
                                        )}
                                    </div>
                                    <div className="p-2.5 space-y-1">
                                        <p className="text-[10px] font-semibold text-zinc-500"><CalendarIcon className="w-3 h-3 inline mr-1" />{fmtDataPub(p.data_pub)}</p>
                                        <a href={p.url_post} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-0.5">
                                            <ExternalLink className="w-3 h-3" /> Ver post
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Stories Gallery */}
            {storiesGaleria.length > 0 && (
                <div className="mt-4 bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                            <PlaySquare className="w-4 h-4 text-pink-600" /> Stories Extraídos
                        </h3>
                        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">{storiesGaleria.length} stories</span>
                    </div>
                    <div className="p-5">
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
                            {storiesGaleria.map((s, i) => {
                                const isVideo = s.tipo && s.tipo.toUpperCase() === 'VIDEO';
                                return (
                                    <div key={i} className="bg-white rounded-xl border border-zinc-200 overflow-hidden hover:border-violet-400 hover:shadow-md transition-all w-[140px] shrink-0" style={{ scrollSnapAlign: 'start' }}>
                                        <div className="relative bg-zinc-100 aspect-[9/16] overflow-hidden">
                                            {s.print ? (
                                                <img src={s.print} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center">
                                                    {isVideo ? <Video className="w-7 h-7 text-zinc-300 mb-1" /> : <ImageIcon className="w-7 h-7 text-zinc-300 mb-1" />}
                                                    <span className="text-[9px] text-zinc-400 font-bold">Sem print</span>
                                                </div>
                                            )}
                                            <span className={`absolute top-2 right-2 text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow ${isVideo ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'}`}>
                                                {isVideo ? 'Vídeo' : 'Foto'}
                                            </span>
                                            {s.vezes_visto > 1 && (
                                                <span className="absolute top-2 left-2 bg-violet-600 text-white text-[7px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                                                    <Repeat className="w-2 h-2" /> {s.vezes_visto}x
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-2 space-y-0.5 border-t border-zinc-100">
                                            <p className="text-[9px] font-bold text-zinc-600 flex items-center gap-1"><CalendarClock className="w-2.5 h-2.5 text-violet-500" /> {fmtDataExtracao(s.data_extracao)}</p>
                                            <p className="text-[9px] text-zinc-400"><Clock className="w-2.5 h-2.5 inline mr-0.5" /> {s.tempo || 'N/A'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

function EmptyChart() {
    return <div className="flex items-center justify-center h-full text-zinc-300 text-xs font-medium">Selecione um perfil</div>;
}
