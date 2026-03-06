import { Activity, Search, Calendar, LineChart, Settings } from 'lucide-react';
import logo from '../assets/logo.png';

const tabs = [
    { id: 'monitor', label: 'Extração de Dados', Icon: Search },
    { id: 'calendario', label: 'Calendário de Posts', Icon: Calendar },
    { id: 'dashboard', label: 'Relatórios & Gráficos', Icon: LineChart },
    { id: 'config', label: 'Configurações Globais', Icon: Settings, mlAuto: true },
];

export default function Header({ activeTab, onTabChange }) {
    return (
        <header className="bg-white border-b border-zinc-200 sticky top-0 z-50 shadow-sm">
            <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                    <img src={logo} alt="IG Monitor Pro" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-zinc-900 leading-none">
                            IG Monitor <span className="font-normal text-zinc-400">Pro</span>
                        </h1>
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mt-1 block">
                            Data Extraction & Publishing Engine
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs px-3 py-1.5 bg-zinc-100 text-zinc-600 rounded-md font-medium border border-zinc-200 transition-all">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Sistema Pronto</span>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 flex gap-6 mt-2 overflow-x-auto">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => onTabChange(tab.id)}
                            className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap border-b-2 ${isActive
                                    ? 'text-pink-600 border-pink-600'
                                    : 'text-zinc-400 hover:text-zinc-800 border-transparent hover:border-zinc-300'
                                } ${tab.mlAuto ? 'ml-auto' : ''}`}>
                            <tab.Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </header>
    );
}
