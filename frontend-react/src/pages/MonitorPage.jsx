import { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, Crosshair, Users, UserPlus, PlaySquare, LayoutGrid, Layers, MessageSquare, Play, Square, Bot, LayoutDashboard, Info, Calendar, ExternalLink, Pin, Film, Video, Image as ImageIcon, Grid, User, Scan, Heart, MessageCircle, Send, Bookmark, ImageOff } from 'lucide-react';
import { useToast } from '../components/Toast';
import { executarBot, cancelarBot, getStatusTarefa, getConfiguracoes } from '../services/api';
import { getTimestamp } from '../utils/constants';

export default function MonitorPage() {
    const mostrarToast = useToast();

    // Form state
    const [alvo, setAlvo] = useState('');
    const [seguirAlvo, setSeguirAlvo] = useState(false);
    const [coletarStories, setColetarStories] = useState(true);
    const [coletarFeed, setColetarFeed] = useState(true);
    const [limitePosts, setLimitePosts] = useState(3);
    const [qtdComentarios, setQtdComentarios] = useState(2);

    // Execution state
    const [isRunning, setIsRunning] = useState(false);
    const [progresso, setProgresso] = useState(0);
    const [statusMsg, setStatusMsg] = useState('Iniciando...');
    const [resultados, setResultados] = useState(null);
    const [dataAtualizacao, setDataAtualizacao] = useState('Aguardando Dados...');

    const taskIdRef = useRef(null);
    const pollingRef = useRef(null);

    useEffect(() => {
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, []);

    const handleCancelar = async () => {
        if (taskIdRef.current) {
            await cancelarBot(taskIdRef.current);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!alvo.trim()) return;

        setIsRunning(true);
        setResultados(null);
        setProgresso(5);
        setStatusMsg('Conectando ao servidor...');

        const taskId = 'task_' + Math.random().toString(36).substr(2, 9);
        taskIdRef.current = taskId;

        // Load config from DB
        let configDB = {};
        try { configDB = await getConfiguracoes(); } catch { /* silent */ }

        if (!configDB.usuario || !configDB.senha) {
            mostrarToast('⚠️ Configure seu Usuário e Senha na aba de Configurações antes de extrair!', 'aviso');
            setIsRunning(false);
            return;
        }

        const payload = {
            task_id: taskId,
            alvo: alvo,
            usuario: configDB.usuario,
            senha: configDB.senha,
            tempo_espera: configDB.delay_base || 4,
            modo_oculto: configDB.modo_invisivel !== undefined ? configDB.modo_invisivel : true,
            seguir_alvo: seguirAlvo,
            coletar_feed: coletarFeed,
            limite_posts: limitePosts,
            qtd_comentarios: qtdComentarios,
            coletar_stories: coletarStories,
        };

        // Polling
        pollingRef.current = setInterval(async () => {
            try {
                const data = await getStatusTarefa(taskId);
                setProgresso(data.progresso);
                setStatusMsg(data.mensagem);
            } catch { /* silent */ }
        }, 3000);

        try {
            const data = await executarBot(payload);
            clearInterval(pollingRef.current);
            setIsRunning(false);
            setResultados(data.resultados);
            setDataAtualizacao('Atualizado: ' + getTimestamp());
        } catch (err) {
            clearInterval(pollingRef.current);
            setIsRunning(false);
            mostrarToast('Erro ao executar o bot.', 'erro');
        }
    };

    return (
        <main className="max-w-[1400px] mx-auto py-8 px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* SIDEBAR: Parâmetros */}
            <section className="lg:col-span-3">
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 sticky top-36">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-100">
                        <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
                        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Parâmetros</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                                <Crosshair className="w-3.5 h-3.5" /> Perfis Alvo (Separar por vírgula)
                            </label>
                            <div className="relative">
                                <input type="text" value={alvo} onChange={e => setAlvo(e.target.value)} required
                                    className="w-full bg-zinc-50 border border-zinc-200 text-sm font-medium rounded-lg pl-10 pr-4 py-3 focus:ring-1 focus:ring-pink-500 focus:border-pink-500 focus:bg-white outline-none transition-all placeholder:text-zinc-400 shadow-sm"
                                    placeholder="@neymarjr, @anitta" />
                                <Users className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                            </div>
                        </div>

                        <div className="border-t border-zinc-100 pt-5">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">
                                <LayoutGrid className="w-3.5 h-3.5" /> Módulos de Ação
                            </label>
                            <div className="space-y-3">
                                <ToggleSwitch label="Auto-Seguir Alvos" Icon={UserPlus} checked={seguirAlvo} onChange={setSeguirAlvo} />
                                <ToggleSwitch label="Extrair Stories" Icon={PlaySquare} checked={coletarStories} onChange={setColetarStories} />
                                <ToggleSwitch label="Extrair Face Feed" Icon={LayoutGrid} checked={coletarFeed} onChange={setColetarFeed} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 pt-5">
                            <div>
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                                    <Layers className="w-3 h-3" /> Máximo Posts
                                </label>
                                <input type="number" value={limitePosts} onChange={e => setLimitePosts(parseInt(e.target.value) || 1)} min="1" max="10"
                                    className="w-full bg-zinc-50 border border-zinc-200 text-sm font-black text-pink-600 text-center rounded-lg px-3 py-2.5 outline-none focus:bg-white focus:border-pink-500 transition-colors shadow-sm" />
                            </div>
                            <div>
                                <label className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                                    <MessageSquare className="w-3 h-3" /> Comentários
                                </label>
                                <input type="number" value={qtdComentarios} onChange={e => setQtdComentarios(parseInt(e.target.value) || 0)} min="0" max="10"
                                    className="w-full bg-zinc-50 border border-zinc-200 text-sm font-black text-pink-600 text-center rounded-lg px-3 py-2.5 outline-none focus:bg-white focus:border-pink-500 transition-colors shadow-sm" />
                            </div>
                        </div>

                        <div className="pt-4">
                            {!isRunning ? (
                                <button type="submit"
                                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-widest py-3.5 rounded-lg transition-all flex justify-center items-center gap-2 shadow-md hover:shadow-lg">
                                    <Play className="w-4 h-4 fill-current" /> Iniciar Extração
                                </button>
                            ) : (
                                <button type="button" onClick={handleCancelar}
                                    className="w-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-xs font-bold uppercase tracking-widest py-3.5 rounded-lg transition-all flex justify-center items-center gap-2 shadow-sm">
                                    <Square className="w-4 h-4 fill-current" /> Abortar
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </section>

            {/* CONTENT: Workspace */}
            <section className="lg:col-span-9 flex flex-col min-h-[700px]">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-6">
                    <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-zinc-400" /> Workspace Analítico
                    </h2>
                    <div className="text-xs text-zinc-400 font-medium font-mono">{dataAtualizacao}</div>
                </div>

                {isRunning && (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 bg-white rounded-xl border border-zinc-200 border-dashed p-10">
                        <Bot className="w-12 h-12 text-pink-500 mb-6 animate-bounce" />
                        <p className="text-sm font-black text-zinc-900 tracking-wide uppercase mb-8">Robô Extrator em Execução</p>
                        <div className="w-full max-w-lg relative">
                            <div className="flex justify-between text-xs font-bold mb-2">
                                <span className="text-pink-600 uppercase tracking-widest">{statusMsg}</span>
                                <span className="text-zinc-500">{progresso}%</span>
                            </div>
                            <div className="w-full bg-zinc-100 rounded-full h-3 border border-zinc-200 overflow-hidden shadow-inner">
                                <div className="bg-ig-gradient h-3 rounded-full transition-all duration-700 ease-out" style={{ width: `${progresso}%` }} />
                            </div>
                        </div>
                    </div>
                )}

                {!isRunning && !resultados && (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 bg-white rounded-xl border border-zinc-200 border-dashed p-10">
                        <Info className="w-10 h-10 text-zinc-300 mb-4" />
                        <p className="text-sm font-medium text-zinc-500">Configure os parâmetros e inicie uma extração para ver os resultados.</p>
                    </div>
                )}

                {!isRunning && resultados && (
                    <div className="flex-1 space-y-8">
                        <div className="hidden bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800 flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                                <strong>Como ler o Engajamento:</strong> O sistema calcula a força do post dividindo as curtidas pelo número total de seguidores.
                            </div>
                        </div>
                        {resultados.map((res, idx) => (
                            <ResultadoPerfil key={idx} resultado={res} coletarStories={coletarStories} />
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}

function ToggleSwitch({ label, Icon, checked, onChange }) {
    return (
        <label className="flex items-center justify-between p-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg cursor-pointer transition-colors shadow-sm">
            <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-white flex items-center justify-center border border-zinc-200 shadow-sm">
                    <Icon className="w-3.5 h-3.5 text-zinc-600" />
                </div>
                <span className="text-xs font-bold text-zinc-700">{label}</span>
            </div>
            <div className="relative flex items-center">
                <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500 shadow-inner" />
            </div>
        </label>
    );
}

function ResultadoPerfil({ resultado, coletarStories }) {
    const res = resultado;
    return (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            {/* Profile Header */}
            <div className="flex items-center gap-4 border-b border-zinc-100 pb-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-600 p-[2px] shadow-sm">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center border-2 border-white overflow-hidden">
                        <User className="w-5 h-5 text-zinc-300" />
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-black text-zinc-900 tracking-tight">@{res.alvo}</h3>
                    <p className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <Scan className="w-3 h-3" /> Snapshot Concluído
                    </p>
                </div>
            </div>

            {/* Stories */}
            {res.stories && res.stories.length > 0 && (
                <StoriesSection stories={res.stories} />
            )}
            {coletarStories && (!res.stories || res.stories.length === 0) && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 mb-5 shadow-sm flex items-center gap-3 text-zinc-500">
                    <Info className="w-4 h-4" />
                    <p className="text-xs font-medium">Nenhum story disponível ou ativo no momento da extração.</p>
                </div>
            )}

            {/* Feed Posts */}
            {res.feed_posts && res.feed_posts.length > 0 && (
                <>
                    <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-3 mt-6 flex items-center gap-2">
                        <Grid className="w-4 h-4 text-pink-500" /> Publicações do Feed
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {res.feed_posts.map((p, i) => (
                            <FeedPostCard key={i} post={p} seguidores={res.seguidores_matematica} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function StoriesSection({ stories }) {
    const videos = stories.filter(s => s.tipo === 'VIDEO').length;
    const fotos = stories.filter(s => s.tipo !== 'VIDEO').length;

    return (
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 mb-5 shadow-sm">
            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <PlaySquare className="w-4 h-4 text-pink-500" /> Stories Capturados
                <span className="bg-pink-100 text-pink-700 text-[10px] px-2 py-0.5 rounded-full ml-auto">{stories.length} Ativos</span>
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white p-3 rounded border border-zinc-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><Video className="w-4 h-4 text-blue-500" /></div>
                    <div><p className="text-sm font-black text-zinc-800">{videos}</p><p className="text-[10px] text-zinc-400 font-bold uppercase">Vídeos</p></div>
                </div>
                <div className="bg-white p-3 rounded border border-zinc-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-orange-500" /></div>
                    <div><p className="text-sm font-black text-zinc-800">{fotos}</p><p className="text-[10px] text-zinc-400 font-bold uppercase">Fotos</p></div>
                </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {stories.map((s, i) => {
                    const isVideo = s.tipo && s.tipo.toUpperCase() === 'VIDEO';
                    return (
                        <div key={i} className="bg-white rounded-lg border border-zinc-200 overflow-hidden shadow-sm flex flex-col">
                            <div className="relative bg-zinc-100 aspect-[9/16] flex items-center justify-center overflow-hidden">
                                {s.caminho_imagem ? (
                                    <img src={s.caminho_imagem} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center">
                                        {isVideo ? <Video className="w-6 h-6 text-zinc-300 mb-1" /> : <ImageIcon className="w-6 h-6 text-zinc-300 mb-1" />}
                                        <span className="text-[10px] text-zinc-400 font-bold">Sem print</span>
                                    </div>
                                )}
                                <span className={`${isVideo ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'} text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm absolute top-1 right-1 flex items-center gap-0.5`}>
                                    {isVideo ? <Video className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                                    {isVideo ? 'VÍDEO' : 'FOTO'}
                                </span>
                            </div>
                            <div className="p-2 text-center">
                                <span className="text-[10px] font-bold text-zinc-500">{s.tempo || 'N/A'}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function FeedPostCard({ post: p, seguidores }) {
    const eng = seguidores ? ((p.curtidas_matematica / seguidores) * 100).toFixed(2) : "0.00";
    const cor = eng > 3 ? 'green' : (eng > 1 ? 'amber' : 'red');

    const tipoConfig = {
        Reel: { icon: Film, bg: 'bg-pink-600 text-white' },
        Vídeo: { icon: Video, bg: 'bg-blue-600 text-white' },
        Carrossel: { icon: Layers, bg: 'bg-orange-500 text-white' },
    };
    const tc = tipoConfig[p.tipo] || { icon: ImageIcon, bg: 'bg-zinc-800 text-white' };
    const TipoIcon = tc.icon;

    return (
        <div className="bg-white border border-zinc-200 rounded-lg flex flex-col sm:flex-row overflow-hidden shadow-sm hover:border-pink-300 transition-colors">
            <div className="w-full sm:w-48 h-40 sm:h-auto bg-zinc-100 shrink-0 relative flex items-center justify-center">
                {p.print_post ? <img src={p.print_post} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-zinc-300" />}
                {p.fixado && (
                    <span className="bg-blue-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm absolute top-2 right-2 flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" /> Fixado
                    </span>
                )}
                {p.tipo && (
                    <span className={`${tc.bg} text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm absolute bottom-2 left-2 flex items-center gap-1`}>
                        <TipoIcon className="w-2.5 h-2.5" /> {p.tipo}
                    </span>
                )}
            </div>
            <div className="p-4 flex-1 min-w-0 flex flex-col justify-between">
                <div className="flex justify-between items-start text-[10px] font-bold text-zinc-400 mb-2">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {p.data}</span>
                    <a href={p.url_post} target="_blank" rel="noreferrer" className="text-pink-600 hover:text-pink-700 hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> ABRIR
                    </a>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-auto">
                    <div className="bg-zinc-50 border border-zinc-100 p-2.5 rounded text-center">
                        <p className="text-[8px] uppercase text-zinc-400 font-bold mb-0.5">Curtidas</p>
                        <p className="text-sm font-black text-zinc-800 truncate">{p.curtidas}</p>
                    </div>
                    <div className={`${cor === 'green' ? 'bg-green-50 border border-green-100 text-green-700' : cor === 'amber' ? 'bg-amber-50 border border-amber-100 text-amber-700' : 'bg-red-50 border border-red-100 text-red-700'} p-2.5 rounded text-center`}>
                        <p className={`text-[8px] uppercase ${cor === 'green' ? 'text-green-600' : cor === 'amber' ? 'text-amber-600' : 'text-red-600'} font-bold mb-0.5`}>Engajamento</p>
                        <p className="text-sm font-black truncate">{eng}%</p>
                    </div>
                </div>
                {p.comentarios && p.comentarios.length > 0 && (
                    <div className="mt-3 bg-zinc-50 rounded border border-zinc-200 p-3">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> Amostra de Comentários ({p.comentarios.length})
                        </p>
                        <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                            {p.comentarios.map((c, i) => (
                                <div key={i} className="py-2 border-b border-zinc-100 last:border-0">
                                    <span className="text-[10px] font-black text-zinc-700 block">{c.usuario}</span>
                                    <span className="text-xs text-zinc-600 block leading-tight mt-0.5">{c.texto}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
