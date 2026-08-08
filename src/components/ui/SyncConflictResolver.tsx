import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSync } from '../../contexts/SyncContext';
import { ShieldAlert, X, RefreshCw, Info } from 'lucide-react';
import type { SyncOutbox } from '../../types';

interface SyncConflictResolverProps {
  onClose: () => void;
}

export const SyncConflictResolver: React.FC<SyncConflictResolverProps> = ({ onClose }) => {
  const { conflicts, resolveConflict, syncNow } = useSync();
  const [selectedResolutions, setSelectedResolutions] = useState<Record<number, 'keep_mine' | 'discard' | 'copy_as_new'>>({});
  const [activeInfo, setActiveInfo] = useState<Record<string, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleSyncAll = async () => {
    setIsProcessing(true);
    try {
      for (const [outboxIdStr, resolution] of Object.entries(selectedResolutions)) {
        const outboxId = parseInt(outboxIdStr, 10);
        if (!isNaN(outboxId)) {
          await resolveConflict(outboxId, resolution);
        }
      }
      await syncNow();
      onClose();
    } catch (e) {
      console.error('Failed to sync all conflicts:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const hasSelection = Object.keys(selectedResolutions).length > 0;

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
            disabled={isProcessing}
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
              const isFailed = item.status === 'failed';
              const isDeletedOnServer = !isFailed && !item.serverPayload;
              return (
                <div key={item.id} className="p-4 bg-medieval-stone/20 rounded border border-medieval-gold/10 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="font-medieval text-xs text-medieval-brightGold block">
                      {getEntityDisplayName(item)}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest bg-red-900/30 text-red-300 border border-red-500/20 px-1.5 py-0.5 rounded flex-shrink-0">
                      {isFailed ? 'Erro de Envio' : isDeletedOnServer ? 'Deletado no Servidor' : 'Editado em Paralelo'}
                    </span>
                  </div>
 
                  <div className="text-[11px] text-medieval-parchment/90 leading-relaxed bg-medieval-charcoal/40 p-2.5 rounded border border-medieval-gold/5">
                    {isFailed ? (
                      <p className="text-red-400">
                        Falha ao salvar na nuvem: <strong>{item.errorMessage || 'Erro desconhecido.'}</strong> Deseja re-enviar, descartar ou salvá-lo como um novo registro?
                      </p>
                    ) : isDeletedOnServer ? (
                      <p>Você editou este pergaminho localmente, mas ele foi **excluído** no servidor por outro jogador. Deseja re-enviar, descartar ou salvá-lo como um novo registro?</p>
                    ) : (
                      <p>
                        A versão do servidor é a **v{item.serverVersion}** (suas edições locais foram baseadas na **v{item.baseVersion}**).
                      </p>
                    )}
                  </div>
 
                  {/* Selectable Options */}
                  <div className="space-y-2 pt-1">
                    {[
                      {
                        key: 'discard' as const,
                        title: isFailed ? 'Descartar Edições Locais' : isDeletedOnServer ? 'Descartar Minhas Edições' : 'Aceitar Versão da Nuvem',
                        desc: isFailed
                          ? 'Descarta suas alterações locais para este item, removendo-o da fila de sincronização.'
                          : isDeletedOnServer
                          ? 'Remove suas alterações locais deste item já que ele foi excluído no servidor por outro jogador.'
                          : 'Substitui seu rascunho local pela versão salva no servidor na nuvem.'
                      },
                      {
                        key: 'copy_as_new' as const,
                        title: 'Duplicar como Novo',
                        desc: isFailed
                          ? 'Gera uma cópia local independente deste item e remove o original da fila de sincronização.'
                          : 'Mantém a versão atual que está no servidor e cria uma cópia separada com as suas edições locais.'
                      },
                      {
                        key: 'keep_mine' as const,
                        title: isFailed ? 'Tentar Re-enviar' : 'Sobrescrever com a Minha',
                        desc: isFailed
                          ? 'Tenta enviar novamente as suas edições locais para o servidor.'
                          : 'Sobrescreve as edições da nuvem com as suas alterações locais atuais.'
                      }
                    ].map((opt) => {
                      const isSelected = selectedResolutions[item.id!] === opt.key;
                      const infoKey = `${item.id}-${opt.key}`;
                      const showInfo = !!activeInfo[infoKey];
 
                      return (
                        <div key={opt.key} className="space-y-1">
                          <div
                            onClick={() => {
                              if (!isProcessing) {
                                setSelectedResolutions(prev => ({ ...prev, [item.id!]: opt.key }));
                              }
                            }}
                            className={`flex items-center justify-between p-2.5 rounded border transition-all duration-300 cursor-pointer ${
                              isSelected
                                ? 'bg-medieval-gold/10 border-medieval-gold shadow-glow text-medieval-brightGold font-bold'
                                : 'bg-medieval-charcoal/50 border-medieval-border/50 text-medieval-parchment hover:border-medieval-gold/40 hover:bg-medieval-stone/10'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 select-none">
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                                isSelected ? 'border-medieval-gold bg-medieval-gold/25' : 'border-medieval-silver/50'
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-medieval-gold" />}
                              </div>
                              <span className="font-medieval text-[11px] uppercase tracking-wider">{opt.title}</span>
                            </div>
 
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveInfo(prev => ({ ...prev, [infoKey]: !prev[infoKey] }));
                              }}
                              className={`p-1 rounded text-medieval-silver hover:text-medieval-gold hover:bg-medieval-stone/30 transition-colors duration-200 ${
                                showInfo ? 'text-medieval-gold bg-medieval-stone/20' : ''
                              }`}
                              title="Mais informações"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          </div>
 
                          {/* Info panel */}
                          {showInfo && (
                            <div className="p-2 bg-medieval-stone/30 rounded border border-medieval-gold/10 text-[10px] text-medieval-silver leading-relaxed animate-fade-in font-serif italic">
                              {opt.desc}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
 
        {/* Footer */}
        <div className="border-t border-medieval-gold/15 pt-3 mt-4 shrink-0 flex justify-between items-center text-[10px] text-medieval-silver">
          <span>{conflicts.length} pendência(s) restante(s)</span>
          
          <button
            disabled={!hasSelection || isProcessing}
            onClick={handleSyncAll}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition-all duration-300 font-medieval uppercase tracking-wider border ${
              hasSelection && !isProcessing
                ? 'bg-medieval-gold/20 border-medieval-gold text-medieval-brightGold cursor-pointer hover:shadow-glow hover:bg-medieval-gold/30'
                : 'bg-medieval-stone/20 border-medieval-border/50 text-medieval-silver/50 cursor-not-allowed opacity-50'
            }`}
          >
            {isProcessing ? (
              <div className="w-3.5 h-3.5 border-2 border-medieval-gold border-t-transparent rounded-full animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Sincronizar</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
