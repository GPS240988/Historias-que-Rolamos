import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSync } from '../../contexts/SyncContext';
import { ShieldAlert, X, RefreshCw } from 'lucide-react';
import type { SyncOutbox } from '../../types';

interface SyncConflictResolverProps {
  onClose: () => void;
}

export const SyncConflictResolver: React.FC<SyncConflictResolverProps> = ({ onClose }) => {
  const { conflicts, resolveConflict, syncNow } = useSync();
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const getEntityDisplayName = (item: SyncOutbox) => {
    const typeNames: Record<string, string> = {
      campaign: 'Grimório/Campanha',
      character: 'Herói/Aliado',
      memory: 'Crônica/Memória',
      token: 'Token de Combate',
      media: 'Anexo de Mídia',
      memoryCharacter: 'Associação de Nível'
    };

    const entityName = item.payload?.name || item.payload?.title || item.payload?.filename || item.entityId;
    return `${typeNames[item.entityType] || item.entityType}: "${entityName}"`;
  };

  const handleResolve = async (id: number, resolution: 'keep_mine' | 'discard' | 'copy_as_new') => {
    setResolvingId(id);
    try {
      await resolveConflict(id, resolution);
    } catch (e) {
      console.error('Failed to resolve conflict:', e);
    } finally {
      setResolvingId(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-[#000000]/85 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="w-full max-w-lg bg-medieval-charcoal grimoire-card border-medieval-gold/30 p-5 md:p-6 relative animate-fade-in text-sm font-serif max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-medieval-gold/15 pb-3 mb-4 shrink-0">
          <h4 className="text-sm font-medieval text-medieval-gold uppercase tracking-wider flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4 text-medieval-gold" />
            <span>Resolução de Conflitos</span>
          </h4>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-medieval-stone text-medieval-silver hover:text-medieval-gold transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Box */}
        <p className="text-xs text-medieval-silver leading-relaxed mb-4 shrink-0">
          Enquanto você estava offline ou com conexões fracas, outros aventureiros fizeram atualizações que entram em conflito com os seus manuscritos locais. Escolha como fundir as histórias:
        </p>

        {/* Conflicts List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {conflicts.length === 0 ? (
            <div className="py-6 text-center text-medieval-silver italic text-xs">
              Todos os registros foram fundidos perfeitamente com a nuvem!
            </div>
          ) : (
            conflicts.map((item) => {
              const isDeletedOnServer = !item.serverPayload;
              return (
                <div key={item.id} className="p-4 bg-medieval-stone/20 rounded border border-medieval-gold/10 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-medieval text-xs text-medieval-brightGold block">
                      {getEntityDisplayName(item)}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest bg-red-900/30 text-red-300 border border-red-500/20 px-1.5 py-0.5 rounded">
                      {isDeletedOnServer ? 'Deletado no Servidor' : 'Editado em Paralelo'}
                    </span>
                  </div>

                  <div className="text-[11px] text-medieval-parchment/90 leading-relaxed bg-medieval-charcoal/40 p-2.5 rounded border border-medieval-gold/5">
                    {isDeletedOnServer ? (
                      <p>Você editou este pergaminho localmente, mas ele foi **excluído** no servidor por outro jogador. Deseja re-enviar, descartar ou salvá-lo como um novo registro?</p>
                    ) : (
                      <p>
                        A versão do servidor é a **v{item.serverVersion}** (suas edições locais foram baseadas na **v{item.baseVersion}**).
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1.5 justify-end">
                    <button
                      disabled={resolvingId === item.id}
                      onClick={() => handleResolve(item.id!, 'discard')}
                      className="px-3 py-1.5 text-[10px] btn-stone text-red-200 hover:text-white border border-medieval-wine/30 bg-medieval-wine/20"
                    >
                      {isDeletedOnServer ? 'Descartar Minhas Edições' : 'Aceitar Versão da Nuvem'}
                    </button>

                    <button
                      disabled={resolvingId === item.id}
                      onClick={() => handleResolve(item.id!, 'copy_as_new')}
                      className="px-3 py-1.5 text-[10px] btn-stone"
                    >
                      Duplicar como Novo
                    </button>

                    <button
                      disabled={resolvingId === item.id}
                      onClick={() => handleResolve(item.id!, 'keep_mine')}
                      className="px-3 py-1.5 text-[10px] btn-gold"
                    >
                      Sobrescrever com a Minha
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-medieval-gold/15 pt-3 mt-4 shrink-0 flex justify-between items-center text-[10px] text-medieval-silver">
          <span>{conflicts.length} conflito(s) restante(s)</span>
          <button
            onClick={() => syncNow()}
            className="flex items-center space-x-1 hover:text-medieval-gold transition-colors duration-200 font-medieval uppercase tracking-wider"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sincronizar</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
