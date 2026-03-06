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
        <main className="flex-1 px-6 py-12 lg:px-20 max-w-5xl mx-auto w-full">
            {/* Page Title Section */}
            <div className="mb-12">
                <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Painel de Controle</h1>
                <p className="text-slate-500 text-lg font-medium">Configure as credenciais e parâmetros de conexão do sistema.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Instagram Credentials Card */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-8 transition-all hover:shadow-2xl hover:shadow-pink-500/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-pink-50 rounded-2xl">
                                <KeyRound className="w-6 h-6 text-[#f4258c]" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Credenciais</h3>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Usuário Alvo</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">@</span>
                                    <input
                                        className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 focus:ring-4 focus:ring-pink-500/10 focus:border-[#f4258c] outline-none transition-all font-semibold"
                                        placeholder="seu_usuario"
                                        type="text"
                                        value={usuario}
                                        onChange={e => setUsuario(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Senha do Agente</label>
                                <div className="relative group">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 focus:ring-4 focus:ring-pink-500/10 focus:border-[#f4258c] outline-none transition-all font-black tracking-widest placeholder:tracking-normal"
                                        placeholder="••••••••"
                                        type="password"
                                        value={senha}
                                        onChange={e => setSenha(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Decorative Placeholder */}
                        <div className="mt-4 h-32 bg-gradient-to-br from-pink-500/5 to-purple-500/5 rounded-2xl overflow-hidden relative border border-slate-100">
                            <div className="absolute inset-x-8 -bottom-8 h-32 bg-white rounded-t-2xl shadow-lg border border-slate-100 flex flex-col items-center pt-6">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[3px]">
                                    <div className="w-full h-full bg-white rounded-[13px] flex items-center justify-center">
                                        <ImageIcon className="w-6 h-6 text-pink-500" />
                                    </div>
                                </div>
                                <div className="w-20 h-2 bg-slate-100 mt-5 rounded-full"></div>
                                <div className="w-32 h-2 bg-slate-50 mt-2.5 rounded-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* Robot Parameters Card */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-8 transition-all hover:shadow-2xl hover:shadow-pink-500/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-pink-50 rounded-2xl">
                                <Cpu className="w-6 h-6 text-[#f4258c]" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Parâmetros</h3>
                        </div>

                        <div className="flex flex-col gap-8 h-full">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Delay Base (segundos)</label>
                                <div className="relative group">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 focus:ring-4 focus:ring-pink-500/10 focus:border-[#f4258c] outline-none transition-all font-bold text-lg"
                                        type="number"
                                        value={delayBase}
                                        onChange={e => setDelayBase(parseInt(e.target.value) || 1)}
                                        min="1"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-slate-400 font-medium pl-1">Mínimo sugerido: 30s para evitar bloqueios.</p>
                            </div>

                            <label className="flex items-center gap-5 p-6 bg-slate-50 border border-slate-100 rounded-3xl cursor-pointer hover:bg-slate-100 transition-all active:scale-[0.98]">
                                <div className="relative shrink-0">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={modoInvisivel}
                                        onChange={e => setModoInvisivel(e.target.checked)}
                                    />
                                    <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#f4258c]"></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">Modo Invisível</span>
                                    <p className="text-xs text-slate-500 leading-normal pt-1">Economiza recursos ocultando o Chrome.</p>
                                </div>
                            </label>

                            <div className="mt-auto bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-4">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                                    Atenção: O Instagram monitora a frequência de ações. Delays baixos podem levar a suspensões.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Action */}
                <div className="mt-12 flex flex-col md:flex-row justify-end items-center gap-6">
                    <div className={`flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-sm font-bold transition-all duration-500 ${saved ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'}`}>
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        Configurações salvas!
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="group flex items-center justify-center gap-3 bg-[#f4258c] hover:bg-[#d81974] text-white font-bold py-5 px-12 rounded-[2rem] transition-all shadow-xl shadow-pink-500/25 hover:shadow-pink-500/40 active:scale-95 disabled:opacity-50 min-w-[280px]"
                    >
                        {saving ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                <span className="tracking-widest text-sm font-black">SALVAR ALTERAÇÕES</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </main>
    );
}
