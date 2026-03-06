import { useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const estilos = {
    sucesso: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', Icon: CheckCircle, iconColor: 'text-green-500' },
    erro: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', Icon: AlertCircle, iconColor: 'text-red-500' },
    aviso: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', Icon: AlertTriangle, iconColor: 'text-amber-500' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', Icon: Info, iconColor: 'text-blue-500' },
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const mostrarToast = useCallback((mensagem, tipo = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, mensagem, tipo }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const fecharToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={mostrarToast}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => {
                    const cfg = estilos[toast.tipo] || estilos.info;
                    return (
                        <div key={toast.id}
                            className={`${cfg.bg} border ${cfg.border} rounded-lg shadow-lg p-4 max-w-sm w-full pointer-events-auto flex items-start gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300`}>
                            <cfg.Icon className={`w-5 h-5 ${cfg.iconColor} shrink-0 mt-0.5`} />
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${cfg.text}`}>{toast.mensagem}</p>
                            </div>
                            <button onClick={() => fecharToast(toast.id)}
                                className="shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors text-zinc-400 hover:text-zinc-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
