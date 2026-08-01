import { createPortal } from 'react-dom';
import type { Media } from '../../types';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from '../../contexts/RouterContext';
import { X, Tag, Users, Film, Download, Trash2, Edit3 } from 'lucide-react';

interface ImageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: Media | null;
  onEdit: () => void;
  onDelete: () => void;
}

export const ImageDetailModal: React.FC<ImageDetailModalProps> = ({ isOpen, onClose, image, onEdit, onDelete }) => {
  const { navigate } = useRouter();

  const imageUrl = useMediaUrl(image?.id); // Load original full-resolution URL

  // Fetch linked character & memory
  const relatedChar = useLiveQuery(async () =>
    image?.relatedCharacterId ? await db.characters.get(image.relatedCharacterId) : null
    , [image?.relatedCharacterId]);

  const relatedMem = useLiveQuery(async () =>
    image?.relatedMemoryId ? await db.memories.get(image.relatedMemoryId) : null
    , [image?.relatedMemoryId]);

  const handleDownload = () => {
    if (!image?.blob) return;
    const url = URL.createObjectURL(image.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = image.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCharClick = () => {
    if (image?.relatedCharacterId) {
      onClose();
      navigate({ type: 'character-profile', id: image.relatedCharacterId });
    }
  };

  const handleMemClick = () => {
    if (image?.relatedMemoryId) {
      onClose();
      navigate({ type: 'memory-detail', id: image.relatedMemoryId });
    }
  };

  if (!isOpen || !image) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="w-full max-w-2xl bg-medieval-charcoal grimoire-card border-medieval-gold/30 p-5 md:p-6 relative animate-fade-in max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-medieval-gold/15 pb-2 shrink-0">
          <h3 className="text-xl font-medieval text-medieval-gold uppercase tracking-wider truncate max-w-[80%]">
            {image.title || 'Visual da Campanha'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-medieval-stone text-medieval-silver hover:text-medieval-gold transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 scrollbar-thin space-y-4 my-3 font-serif text-sm">
          {/* Image Display */}
          <div className="w-full h-64 sm:h-80 rounded overflow-hidden border border-medieval-gold/15 bg-medieval-charcoal/80 flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={image.title || image.filename}
                className="w-full h-full object-contain max-h-[400px]"
              />
            ) : (
              <span className="text-medieval-silver/50 font-serif text-xs">Carregando Imagem...</span>
            )}
          </div>

          {/* Details & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Description */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <span className="text-[10px] text-medieval-gold uppercase font-medieval">Descrição da Ilustração</span>
                <p className="text-xs text-medieval-parchment leading-relaxed whitespace-pre-line text-justify mt-1">
                  {image.description || 'Nenhum relato ou detalhe associado a esta arte da campanha.'}
                </p>
              </div>

              {/* Etiquetas */}
              {image.tags && image.tags.length > 0 && (
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-medieval-gold" />
                  <div className="flex flex-wrap gap-1">
                    {image.tags.map(t => (
                      <span key={t} className="text-[10px] text-medieval-silver bg-medieval-stone border border-medieval-gold/5 px-2 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar metadata */}
            <div className="space-y-4 border-t md:border-t-0 md:border-l border-medieval-gold/10 pt-4 md:pt-0 md:pl-4">
              {/* Linked Character */}
              {relatedChar && (
                <div>
                  <span className="block text-[9px] text-medieval-gold uppercase font-medieval">Aventureiro Vinculado</span>
                  <button
                    onClick={handleCharClick}
                    className="text-xs font-semibold text-medieval-brightGold hover:underline mt-0.5 flex items-center"
                  >
                    <Users className="w-3.5 h-3.5 mr-1" />
                    <span>{relatedChar.name}</span>
                  </button>
                </div>
              )}

              {/* Linked Memory */}
              {relatedMem && (
                <div>
                  <span className="block text-[9px] text-medieval-gold uppercase font-medieval">Memória Relacionada</span>
                  <button
                    onClick={handleMemClick}
                    className="text-xs font-semibold text-medieval-brightGold hover:underline mt-0.5 flex items-center text-left"
                  >
                    <Film className="w-3.5 h-3.5 mr-1 shrink-0" />
                    <span className="truncate">{relatedMem.title}</span>
                  </button>
                </div>
              )}

              {/* General dimensions */}
              <div>
                <span className="block text-[9px] text-medieval-gold uppercase font-medieval">Ficha Técnica</span>
                <span className="text-[10px] text-medieval-silver block mt-0.5">
                  Dimensões: {image.width} x {image.height} px
                </span>
                <span className="text-[10px] text-medieval-silver block">
                  Tamanho: {(image.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center border-t border-medieval-gold/15 pt-3 shrink-0">
          <div className="flex space-x-2">
            <button
              onClick={onEdit}
              className="btn-stone py-1.5 px-3 text-xs flex items-center space-x-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
            <button
              onClick={onDelete}
              className="btn-wine py-1.5 px-3 text-xs flex items-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover</span>
            </button>
          </div>
          <button
            onClick={handleDownload}
            className="btn-gold py-1.5 px-4 text-xs flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Original</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
