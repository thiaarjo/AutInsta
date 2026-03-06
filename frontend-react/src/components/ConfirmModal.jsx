import { useState, useCallback, createContext, useContext } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [state, setState] = useState({ show: false, mensagem: '', titulo: 'Atenção', tipo: 'confirm', resolve: null });

    const confirmarAcao = useCallback((mensagem, tipo = 'confirm', titulo = 'Atenção') => {
        return new Promise((resolve) => {
            setState({ show: true, mensagem, titulo, tipo, resolve });
        });
    }, []);

    const close = (result) => {
        if (state.resolve) state.resolve(result);
        setState(s => ({ ...s, show: false, resolve: null }));
    };

    return (
        <ConfirmContext.Provider value={confirmarAcao}>
            {children}
            {state.show && (
                <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-zinc-900 mb-2">{state.titulo}</h3>
                            <p className="text-sm font-medium text-zinc-500">{state.mensagem}</p>
                        </div>
                        <div className="bg-zinc-50 px-6 py-4 flex gap-3">
                            {state.tipo !== 'alert' && (
                                <button onClick={() => close(false)}
                                    className="flex-1 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-sm font-bold py-2.5 rounded-lg transition-colors">
                                    Cancelar
                                </button>
                            )}
                            <button onClick={() => close(true)}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-bold py-2.5 rounded-lg transition-colors shadow-sm">
                                {state.tipo === 'alert' ? 'OK' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
    return ctx;
}
