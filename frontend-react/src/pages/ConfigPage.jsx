import { useState, useEffect } from 'react';
import { Settings, KeyRound, Cpu, Save, Loader2, Image as ImageIcon, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '../components/Toast';
import { getConfiguracoes, salvarConfiguracoes } from '../services/api';

export default function ConfigPage() {
    const mostrarToast = useToast();
    const [usuario, setUsuario] = useState('');
    const [senha, setSenha] = useState('');
    const [delayBase, setDelayBase] = useState(4);
    const [modoInvisivel, setModoInvisivel] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        getConfiguracoes().then(data => {
            if (data.usuario) setUsuario(data.usuario);
            if (data.senha) setSenha(data.senha);
            if (data.delay_base) setDelayBase(data.delay_base);
            if (data.modo_invisivel !== undefined) setModoInvisivel(data.modo_invisivel);
        }).catch(err => console.error("Erro ao carregar configurações:", err));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!usuario || !senha) { mostrarToast("Preencha o usuário e senha.", "aviso"); return; }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("usuario", usuario);
            formData.append("senha", senha);
            formData.append("delay_base", delayBase);
            formData.append("modo_invisivel", modoInvisivel);
            await salvarConfiguracoes(formData);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {
            mostrarToast("Erro ao salvar configurações.", "erro");
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="max-w-[1400px] mx-auto py-16 px-12">
            {/* Header titles */}
            <div className="mb-14">
                <h1 className="text-4xl font-black text-zinc-900 mb-3 tracking-tight">Painel de Controle</h1>
                <p className="text-lg font-medium text-pink-900/60">Configure as credenciais e parâmetros de conexão do sistema.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Side-by-side Cards */}
                <div className="flex flex-col xl:flex-row items-stretch gap-12">

                    {/* LEFT CARD: Credenciais */}
                    <div className="flex-1 bg-white border border-zinc-100 rounded-[32px] p-16 shadow-sm flex flex-col">
                        <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-4 mb-12">
                            <KeyRound className="w-8 h-8 text-pink-600" /> Credenciais de Acesso Instagram
                        </h2>

                        <div className="space-y-8 flex-1">
                            {/* Input: Usuário */}
                            <div>
                                <label className="block text-sm font-bold text-[#1e293b] uppercase tracking-wider mb-3">Usuário Alvo</label>
                                <div className="flex items-center bg-[#fdfafb] border border-pink-100/50 rounded-2xl px-5 py-4 focus-within:ring-2 focus-within:ring-pink-300 transition-all shadow-sm">
                                    <span className="text-zinc-400 font-bold mr-3 text-base">@</span>
                                    <input type="text" value={usuario} onChange={e => setUsuario(e.target.value)} required
                                        className="flex-1 bg-transparent text-base font-semibold outline-none text-zinc-700 placeholder:text-zinc-400"
                                        placeholder="Ex: seu_usuario" />
                                </div>
                            </div>

                            {/* Input: Senha */}
                            <div>
                                <label className="block text-sm font-bold text-[#1e293b] uppercase tracking-wider mb-3">Senha do Agente</label>
                                <div className="flex items-center bg-[#fdfafb] border border-pink-100/50 rounded-2xl px-5 py-4 focus-within:ring-2 focus-within:ring-pink-300 transition-all shadow-sm">
                                    <svg className="w-5 h-5 text-zinc-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required
                                        className="flex-1 bg-transparent text-base font-black tracking-widest outline-none text-zinc-700 placeholder:text-zinc-400"
                                        placeholder="••••••••" />
                                </div>
                            </div>
                        </div>

                        {/* Optional decorative image placeholder from mockup */}
                        <div className="mt-10 h-32 bg-gradient-to-br from-pink-100 to-orange-50 rounded-2xl overflow-hidden relative border border-zinc-100">
                            <div className="absolute inset-x-10 -bottom-6 h-28 bg-white rounded-t-xl shadow-sm border border-zinc-200/50 flex flex-col items-center pt-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px]">
                                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center"><ImageIcon className="w-5 h-5 text-pink-500" /></div>
                                </div>
                                <div className="w-24 h-2 bg-zinc-200 mt-4 rounded-full"></div>
                                <div className="w-36 h-2 bg-zinc-100 mt-2.5 rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT CARD: Parâmetros */}
                    <div className="flex-1 bg-white border border-zinc-100 rounded-[32px] p-16 shadow-sm flex flex-col">
                        <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-4 mb-12">
                            <Cpu className="w-8 h-8 text-pink-600" /> Parâmetros do Robô
                        </h2>

                        <div className="space-y-8 flex-1">
                            {/* Input: Delay */}
                            <div>
                                <label className="block text-sm font-bold text-[#1e293b] uppercase tracking-wider mb-3">Delay Base (Segundos)</label>
                                <div className="flex items-center bg-[#fdfafb] border border-pink-100/50 rounded-2xl px-5 py-4 focus-within:ring-2 focus-within:ring-pink-300 transition-all shadow-sm">
                                    <Clock className="w-5 h-5 text-zinc-400 mr-3 shrink-0" />
                                    <input type="number" value={delayBase} onChange={e => setDelayBase(parseInt(e.target.value) || 1)} min="1" required
                                        className="flex-1 bg-transparent text-base font-semibold outline-none text-zinc-700 placeholder:text-zinc-400" />
                                </div>
                                <p className="text-xs font-medium text-pink-900/50 mt-3 italic pl-1">Intervalo mínimo recomendado: 30s</p>
                            </div>

                            {/* Toggle: Headless */}
                            <label className="flex items-center gap-5 p-6 bg-pink-50/40 border border-pink-100 rounded-2xl cursor-pointer hover:bg-pink-50/70 transition-colors shadow-sm">
                                {/* iOS style toggle */}
                                <div className="relative shrink-0">
                                    <input type="checkbox" className="sr-only peer" checked={modoInvisivel} onChange={e => setModoInvisivel(e.target.checked)} />
                                    <div className="w-12 h-7 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-pink-500"></div>
                                </div>
                                <div className="flex-1">
                                    <span className="text-sm font-black text-zinc-900 uppercase tracking-widest block mb-1.5">Modo Invisível</span>
                                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                                        Operar em segundo plano sem abrir janelas do navegador (Headless).
                                    </p>
                                </div>
                            </label>

                            {/* Warning Box */}
                            <div className="bg-[#fff9e6] border border-yellow-200/50 rounded-2xl p-5 flex gap-4 mt-auto">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-800 font-bold leading-relaxed">
                                    Atenção: Uso de delays muito baixos podem levar a bloqueios ou restrições de ações na plataforma.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Action */}
                <div className="flex items-center justify-end mt-12">
                    <span className={`text-base font-bold text-emerald-600 mr-8 transition-all duration-300 ${saved ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                        Configurações salvas com sucesso!
                    </span>
                    <button type="submit" disabled={saving}
                        className="bg-[#f01e82] hover:bg-[#d81974] text-white text-sm font-black uppercase tracking-widest px-12 py-6 rounded-2xl transition-all shadow-lg shadow-pink-500/25 flex items-center gap-3 disabled:opacity-50 hover:-translate-y-1 hover:shadow-pink-500/40">
                        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                        Salvar Alterações
                    </button>
                </div>
            </form>
        </main>
    );
}
