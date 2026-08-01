import React from 'react';
import type { Token } from '../../types';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from '../../contexts/RouterContext';
import { X, Users, Download, Trash2, Edit3 } from 'lucide-react';

interface TokenDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: Token | null;
  onEdit: () => void;
  onDelete: () => void;
}

import { createPortal } from 'react-dom';

interface TokenDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: Token | null;
  onEdit: () => void;
  onDelete: () => void;
}

export const TokenDetailModal: React.FC<TokenDetailModalProps> = ({ isOpen, onClose, token, onEdit, onDelete }) => {
  const { navigate } = useRouter();

  const tokenUrl = useMediaUrl(token?.mediaId); // Load full token image

  // Query media details for size/download
  const mediaRecord = useLiveQuery(() => token?.mediaId ? db.media.get(token.mediaId) : undefined, [token?.mediaId]);

  // Query associated character sheet
  const relatedChar = useLiveQuery(async () => 
    token?.relatedCharacterId ? await db.characters.get(token.relatedCharacterId) : null
  , [token?.relatedCharacterId]);

  const handleDownload = () => {
    if (!mediaRecord?.blob) return;
    const url = URL.createObjectURL(mediaRecord.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mediaRecord.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCharClick = () => {
    if (token?.relatedCharacterId) {
      onClose();
      navigate({ type: 'character-profile', id: token.relatedCharacterId });
    }
  };

  if (!isOpen || !token) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="w-full max-w-sm bg-medieval-charcoal grimoire-card border-medieval-gold/30 p-5 md:p-6 relative animate-fade-in max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-medieval-gold/15 pb-2 shrink-0">
          <h3 className="text-xl font-medieval text-medieval-gold uppercase tracking-wider truncate max-w-[80%]">
            Visual de Token
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
          {/* Large Rounded Combat Token Display */}
          <div className="flex justify-center p-2">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-medieval-gold/50 shadow-gold bg-medieval-stone/90 flex items-center justify-center p-1 bg-cover bg-center">
              {tokenUrl ? (
                <img 
                  src={tokenUrl} 
                  alt={token.name} 
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-medieval-silver/50 font-serif text-xs">Carregando...</span>
              )}
            </div>
          </div>

          {/* Details & Notes */}
          <div className="space-y-3">
            <div className="text-center">
              <h4 className="text-lg font-medieval font-bold text-medieval-brightGold truncate">
                {token.name}
              </h4>
              <span className="text-[10px] text-medieval-gold uppercase tracking-widest font-medieval font-semibold">
                {token.category}
              </span>
            </div>

            <div className="border-t border-medieval-gold/10 pt-3 space-y-3">
              {/* Notes */}
              <div>
                <span className="block text-[9px] text-medieval-gold uppercase font-medieval">Notas de Referência GM</span>
                <p className="text-xs text-medieval-parchment italic bg-medieval-charcoal/40 p-2.5 rounded border border-medieval-gold/5 whitespace-pre-line mt-1">
                  {token.notes || 'Sem anotações rápidas cadastradas para este token.'}
                </p>
              </div>

              {/* Associated Character Sheet link */}
              {relatedChar && (
                <div>
                  <span className="block text-[9px] text-medieval-gold uppercase font-medieval">Ficha Vinculada</span>
                  <button 
                    onClick={handleCharClick}
                    className="text-xs text-medieval-brightGold hover:underline flex items-center mt-1 text-left"
                  >
                    <Users className="w-3.5 h-3.5 mr-1 text-medieval-silver" />
                    <span>{relatedChar.name} ({relatedChar.class})</span>
                  </button>
                </div>
              )}

              {/* technical details */}
              {mediaRecord && (
                <div className="text-[9px] text-medieval-silver/60 flex justify-between">
                  <span>Arquivo: {mediaRecord.filename}</span>
                  <span>Tamanho: {(mediaRecord.size / 1024).toFixed(1)} KB</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col space-y-3 pt-3 border-t border-medieval-gold/15 shrink-0">
          <button 
            onClick={handleDownload}
            className="w-full btn-gold py-1.5 text-xs flex items-center justify-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Token Original</span>
          </button>
          
          <div className="flex space-x-2">
            <button 
              onClick={onEdit}
              className="flex-1 btn-stone py-1.5 text-xs flex items-center justify-center space-x-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
            <button 
              onClick={onDelete}
              className="flex-1 btn-wine py-1.5 text-xs flex items-center justify-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
