import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import Cropper from 'react-cropper';
import 'react-cropper/node_modules/cropperjs/dist/cropper.css';
import { ImagePlus, ChevronLeft, ChevronRight, Trash2, RectangleVertical, Square, Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import logoImg from '../assets/logo.png';

/**
 * MediaUploader – Instagram Post Preview com caption live.
 * Crop data is stored in a synchronous ref map (cropDataMap) 
 * to avoid React state batching timing issues.
 */
const MediaUploader = forwardRef(function MediaUploader({ onMediaChange, username, caption }, ref) {
    const [midias, setMidias] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const cropperRef = useRef(null);
    const usr = username || 'seu_perfil';

    // ===== Synchronous ref-based crop data storage =====
    // Key: midia.id  →  Value: { cropperData, croppedCanvas, aspectRatio }
    const cropDataMap = useRef({});

    /** Save current cropper state to the ref map (synchronous, no React batching) */
    const salvarCropAtual = useCallback(() => {
        const cropper = cropperRef.current?.cropper;
        if (!cropper) return;
        const act = midias[activeIndex];
        if (!act || act.type !== 'image') return;

        try {
            const ar = cropDataMap.current[act.id]?.aspectRatio || act.aspectRatio || (4 / 5);
            cropDataMap.current[act.id] = {
                cropperData: cropper.getData(),
                croppedCanvas: cropper.getCroppedCanvas({
                    width: 1080,
                    height: ar === 1 ? 1080 : 1350,
                    fillColor: '#000000',
                }),
                aspectRatio: ar,
            };
        } catch { /* cropper not ready */ }
    }, [midias, activeIndex]);

    /** Restore crop data when switching back to an image */
    const restaurarCrop = useCallback((midia) => {
        if (!midia || midia.type !== 'image') return;
        const saved = cropDataMap.current[midia.id];
        if (saved?.cropperData && cropperRef.current?.cropper) {
            cropperRef.current.cropper.setData(saved.cropperData);
        }
    }, []);

    const processarArquivos = useCallback((files) => {
        if (!files || files.length === 0) return;
        salvarCropAtual();
        const novas = Array.from(files).map((file, idx) => ({
            id: Date.now() + idx, file,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            url: URL.createObjectURL(file),
            aspectRatio: 4 / 5,
        }));
        setMidias(prev => {
            const next = [...prev, ...novas];
            setActiveIndex(prev.length === 0 ? 0 : next.length - 1);
            return next;
        });
        if (onMediaChange) onMediaChange(true);
    }, [salvarCropAtual, onMediaChange]);

    const irPara = useCallback((idx) => {
        salvarCropAtual();
        setActiveIndex(idx);
    }, [salvarCropAtual]);

    const anterior = () => { if (activeIndex > 0) irPara(activeIndex - 1); };
    const proximo = () => { if (activeIndex < midias.length - 1) irPara(activeIndex + 1); };

    const remover = useCallback(() => {
        const act = midias[activeIndex];
        if (act) {
            URL.revokeObjectURL(act.url);
            delete cropDataMap.current[act.id];
        }
        const novas = midias.filter((_, i) => i !== activeIndex);
        setMidias(novas);
        if (activeIndex >= novas.length && activeIndex > 0) setActiveIndex(novas.length - 1);
        if (novas.length === 0) { setActiveIndex(0); if (onMediaChange) onMediaChange(false); }
    }, [midias, activeIndex, onMediaChange]);

    const setAspectRatio = useCallback((ratio) => {
        const act = midias[activeIndex];
        if (!act) return;
        // Save to ref map
        if (cropDataMap.current[act.id]) {
            cropDataMap.current[act.id].aspectRatio = ratio;
        } else {
            cropDataMap.current[act.id] = { cropperData: null, croppedCanvas: null, aspectRatio: ratio };
        }
        // Update state so the UI reflects the change
        setMidias(prev => {
            const updated = [...prev];
            updated[activeIndex] = { ...updated[activeIndex], aspectRatio: ratio };
            return updated;
        });
        if (cropperRef.current?.cropper) cropperRef.current.cropper.setAspectRatio(ratio);
    }, [midias, activeIndex]);

    useImperativeHandle(ref, () => ({
        obterMidiasProcessadas: async () => {
            salvarCropAtual();
            if (midias.length === 0) return [];
            const result = [];
            for (const act of midias) {
                if (act.type === 'image') {
                    const saved = cropDataMap.current[act.id];
                    if (saved?.croppedCanvas) {
                        const blob = await new Promise(res => saved.croppedCanvas.toBlob(res, 'image/jpeg', 0.9));
                        result.push(new File([blob], act.file.name, { type: 'image/jpeg' }));
                    } else {
                        result.push(act.file);
                    }
                } else {
                    result.push(act.file);
                }
            }
            return result;
        },
        limpar: () => {
            midias.forEach(m => URL.revokeObjectURL(m.url));
            cropDataMap.current = {};
            setMidias([]);
            setActiveIndex(0);
            if (onMediaChange) onMediaChange(false);
        },
        hasMidias: () => midias.length > 0,
    }), [midias, salvarCropAtual, onMediaChange]);

    useEffect(() => { return () => { midias.forEach(m => URL.revokeObjectURL(m.url)); }; }, []);

    const midiaAtual = midias[activeIndex];
    const hasMidia = midias.length > 0;

    // Format caption
    const formatCaption = (text) => {
        if (!text || !text.trim()) return null;
        let f = text.replace(/\n/g, '<br>');
        f = f.replace(/(#\w+)/g, '<span class="text-[#00376b]">$1</span>');
        f = f.replace(/(@\w+)/g, '<span class="text-[#00376b]">$1</span>');
        return f;
    };

    return (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm w-full">
            {/* Instagram header */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-zinc-100">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-amber-500 p-[2px]">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                        <img src={logoImg} className="w-5 h-5 object-contain" alt="" />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-zinc-900">{usr}</span>
                </div>
                <MoreHorizontal className="w-5 h-5 text-zinc-500" />
            </div>

            {/* Image area */}
            <div className="relative bg-zinc-950 aspect-[4/5] flex items-center justify-center overflow-hidden">
                {!hasMidia ? (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-900 transition-colors group">
                        <input type="file" accept="image/*,video/*" multiple className="hidden"
                            onChange={e => { processarArquivos(e.target.files); e.target.value = ''; }} />
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-600 group-hover:border-pink-500 flex items-center justify-center transition-colors mb-3">
                            <ImagePlus className="w-8 h-8 text-zinc-600 group-hover:text-pink-500 transition-colors" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-500 group-hover:text-zinc-300 transition-colors">Toque para adicionar</p>
                        <p className="text-[10px] text-zinc-600 mt-1">Fotos e vídeos</p>
                    </label>
                ) : midiaAtual.type === 'video' ? (
                    <video src={midiaAtual.url} controls autoPlay muted loop className="w-full h-full object-contain" />
                ) : (
                    <Cropper
                        key={midiaAtual.id}
                        ref={cropperRef}
                        src={midiaAtual.url}
                        style={{ height: '100%', width: '100%' }}
                        aspectRatio={midiaAtual.aspectRatio}
                        viewMode={1}
                        dragMode="move"
                        restore={false}
                        guides={true}
                        center={true}
                        highlight={false}
                        cropBoxMovable={true}
                        cropBoxResizable={true}
                        toggleDragModeOnDblclick={false}
                        ready={() => {
                            // Restore saved crop position
                            const saved = cropDataMap.current[midiaAtual.id];
                            if (saved?.cropperData && cropperRef.current?.cropper) {
                                cropperRef.current.cropper.setData(saved.cropperData);
                            }
                        }}
                    />
                )}

                {/* Carousel nav */}
                {midias.length > 1 && (
                    <>
                        {activeIndex > 0 && (
                            <button onClick={anterior} className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 backdrop-blur-sm text-zinc-800 rounded-full flex items-center justify-center hover:bg-white transition shadow-md z-20">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        )}
                        {activeIndex < midias.length - 1 && (
                            <button onClick={proximo} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 backdrop-blur-sm text-zinc-800 rounded-full flex items-center justify-center hover:bg-white transition shadow-md z-20">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20">
                            {midias.map((_, idx) => (
                                <div key={idx} onClick={() => idx !== activeIndex && irPara(idx)}
                                    className={`rounded-full transition-all ${idx === activeIndex ? 'bg-blue-500 w-[6px] h-[6px]' : 'bg-white/60 w-[5px] h-[5px] cursor-pointer hover:bg-white/90'}`} />
                            ))}
                        </div>
                    </>
                )}

                {/* Remove + counter */}
                {hasMidia && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
                        {midias.length > 1 && (
                            <span className="text-[10px] font-bold text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">{activeIndex + 1}/{midias.length}</span>
                        )}
                        <button onClick={remover} className="w-6 h-6 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Add more button (bottom-left) */}
                {hasMidia && (
                    <label className="absolute bottom-3 left-3 z-20 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center cursor-pointer hover:bg-white hover:scale-110 transition-all shadow-lg border border-zinc-200">
                        <input type="file" accept="image/*,video/*" multiple className="hidden"
                            onChange={e => { processarArquivos(e.target.files); e.target.value = ''; }} />
                        <ImagePlus className="w-4 h-4 text-zinc-700" />
                    </label>
                )}
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-4">
                    <Heart className="w-[22px] h-[22px] text-zinc-800 hover:text-zinc-500 transition-colors cursor-pointer" />
                    <MessageCircle className="w-[22px] h-[22px] text-zinc-800 hover:text-zinc-500 transition-colors cursor-pointer" />
                    <Send className="w-[22px] h-[22px] text-zinc-800 hover:text-zinc-500 transition-colors cursor-pointer" />
                </div>
                <Bookmark className="w-[22px] h-[22px] text-zinc-800 hover:text-zinc-500 transition-colors cursor-pointer" />
            </div>

            {/* Live caption */}
            <div className="px-3.5 pb-3">
                {caption && caption.trim() ? (
                    <div className="text-[13px] text-zinc-900 leading-[18px]">
                        <span className="font-semibold mr-1">{usr}</span>
                        <span dangerouslySetInnerHTML={{ __html: formatCaption(caption) }} />
                    </div>
                ) : (
                    <p className="text-[13px] text-zinc-400 italic">Adicione uma legenda...</p>
                )}
            </div>

            {/* Controls */}
            {hasMidia && (
                <div className="flex items-center justify-between px-3.5 py-2 border-t border-zinc-100 bg-zinc-50/50">
                    {midiaAtual.type === 'image' ? (
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setAspectRatio(4 / 5)}
                                className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded flex gap-1 items-center transition-colors ${midiaAtual.aspectRatio === 4 / 5 ? 'text-white bg-zinc-800' : 'text-zinc-500 bg-zinc-200 hover:bg-zinc-300'}`}>
                                <RectangleVertical className="w-2.5 h-2.5" /> 4:5
                            </button>
                            <button onClick={() => setAspectRatio(1)}
                                className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded flex gap-1 items-center transition-colors ${midiaAtual.aspectRatio === 1 ? 'text-white bg-zinc-800' : 'text-zinc-500 bg-zinc-200 hover:bg-zinc-300'}`}>
                                <Square className="w-2.5 h-2.5" /> 1:1
                            </button>
                        </div>
                    ) : (
                        <span className="text-[9px] font-bold text-zinc-400 uppercase">Vídeo</span>
                    )}
                    <label className="text-[9px] font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1">
                        <input type="file" accept="image/*,video/*" multiple className="hidden"
                            onChange={e => { processarArquivos(e.target.files); e.target.value = ''; }} />
                        <ImagePlus className="w-3 h-3" /> Mais
                    </label>
                </div>
            )}
        </div>
    );
});

export default MediaUploader;
