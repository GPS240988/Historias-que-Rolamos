import React, { useState, useEffect } from 'react';
import { useCampaign } from '../contexts/CampaignContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { BackupService, type LastImportInfo } from '../services/backup';
import { VersionControlService, CHRONICLE_CHANGELOG_EVENT } from '../services/versionControl';
import { OperationOverlay } from '../components/ui/OperationOverlay';
import type { ChangeLogEntry, VersionHistoryRecord } from '../types';
import {
  Upload,
  Trash2,
  Archive,
  HardDrive,
  ChevronRight,
  ChevronDown,
  BookOpen,
  FileJson,
  Layers,
  ScrollText,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Edit3
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { campaign, campaigns, switchCampaign, deleteCampaign, theme, setTheme } = useCampaign();
  const { confirm } = useConfirmation();

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('');
  const [operationResult, setOperationResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [importedCampaignId, setImportedCampaignId] = useState<string | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState('');

  // Storage usage details
  const [storageUsage, setStorageUsage] = useState<{ used: string; total: string; percent: number } | null>(null);

  // Versioning & Audit Log states
  const [currentVersion, setCurrentVersion] = useState<number>(() => VersionControlService.getCurrentVersion());
  const [pendingChanges, setPendingChanges] = useState<ChangeLogEntry[]>(() => VersionControlService.getPendingChanges());
  const [versionHistory, setVersionHistory] = useState<VersionHistoryRecord[]>(() => VersionControlService.getVersionHistory());
  const [lastImport, setLastImport] = useState<LastImportInfo | null>(() => BackupService.getLastImportInfo());
  
  // Collapsible state for retracted audit log (retraído por padrão)
  const [isLogExpanded, setIsLogExpanded] = useState<boolean>(false);
  const [expandedVersionNum, setExpandedVersionNum] = useState<number | null>(null);

  const refreshAllVersionData = () => {
    setCurrentVersion(VersionControlService.getCurrentVersion());
    setPendingChanges(VersionControlService.getPendingChanges());
    setVersionHistory(VersionControlService.getVersionHistory());
    setLastImport(BackupService.getLastImportInfo());
  };

  useEffect(() => {
    const handleChangelogUpdate = () => {
      refreshAllVersionData();
    };

    window.addEventListener(CHRONICLE_CHANGELOG_EVENT, handleChangelogUpdate);
    return () => {
      window.removeEventListener(CHRONICLE_CHANGELOG_EVENT, handleChangelogUpdate);
    };
  }, []);

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(1);
        const totalMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(0);
        const percentage = Math.round(((estimate.usage || 0) / (estimate.quota || 1)) * 100);
        setStorageUsage({ used: `${usedMB} MB`, total: `${totalMB} MB`, percent: percentage || 1 });
      });
    }
  }, [operationResult]);

  const nextVersionPreview = VersionControlService.peekNextExportVersion();
  const hasChanges = pendingChanges.length > 0;

  const handleExportJSON = async () => {
    setLoading(true);
    setOperationResult(null);
    setProgress(50);
    setStatusText('Processando dados estruturados do sistema...');
    try {
      const result = await BackupService.exportFullSystemJSON();
      refreshAllVersionData();
      setProgress(100);

      const msg = result.isNewVersion
        ? `Nova versão gerada com sucesso! (v${result.sequence}) contendo ${pendingChanges.length || 1} alterações: ${result.filename}`
        : `Exportado na versão atual (v${result.sequence}). Nenhuma nova alteração pendente: ${result.filename}`;

      setOperationResult({
        type: 'success',
        message: msg,
      });
    } catch (err: any) {
      setOperationResult({ type: 'error', message: err.message || 'Erro ao exportar JSON.' });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleExportZIP = async () => {
    setLoading(true);
    setOperationResult(null);
    setProgress(0);
    setStatusText('Varrendo base de dados e empacotando mídias...');
    try {
      const result = await BackupService.exportFullSystemZipBackup((p) => {
        setProgress(p);
        if (p >= 85) {
          setStatusText('Compactando arquivo ZIP final...');
        } else {
          setStatusText(`Agrupando arquivos binários e dados... (${p}%)`);
        }
      });
      refreshAllVersionData();

      const msg = result.isNewVersion
        ? `Nova versão gerada com sucesso! (v${result.sequence}) contendo todas as imagens e dados: ${result.filename}`
        : `Manuscrito completo exportado na versão atual (v${result.sequence}) sem novas alterações: ${result.filename}`;

      setOperationResult({
        type: 'success',
        message: msg,
      });
    } catch (err: any) {
      setOperationResult({ type: 'error', message: err.message || 'Erro ao exportar ZIP.' });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleExportDeltaZIP = async () => {
    setLoading(true);
    setOperationResult(null);
    setProgress(0);
    setStatusText('Separando apenas mídias alteradas nesta versão...');
    try {
      const result = await BackupService.exportDeltaZipBackup((p) => {
        setProgress(p);
        if (p >= 85) {
          setStatusText('Compactando pacote de atualização...');
        } else {
          setStatusText(`Compactando novas imagens... (${p}%)`);
        }
      });
      refreshAllVersionData();

      const msg = result.isNewVersion
        ? `Pacote incremental gerado com sucesso! (v${result.sequence}) contendo apenas as novas mídias e dados: ${result.filename}`
        : `Pacote incremental exportado na versão v${result.sequence} sem novas alterações: ${result.filename}`;

      setOperationResult({
        type: 'success',
        message: msg,
      });
    } catch (err: any) {
      setOperationResult({ type: 'error', message: err.message || 'Erro ao exportar pacote Delta.' });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isJson = file.name.endsWith('.json');
    const isZip = file.name.endsWith('.zip');

    if (!isJson && !isZip) {
      setOperationResult({ type: 'error', message: 'Formato inválido. Selecione um arquivo .json ou .zip de backup.' });
      return;
    }

    // Confirmation explaining smart preservation
    const confirmed = await confirm({
      title: 'Sincronizar Grimório com Backup',
      message: `A importação irá sincronizar as informações a partir do arquivo "${file.name}".\n\n• Suas imagens locais existentes serão PRESERVADAS.\n• Fichas, memórias e tokens serão atualizados para a nova versão.\n• Itens excluídos nesta versão serão removidos do dispositivo.\n\nDeseja continuar?`,
      confirmLabel: 'Sincronizar e Restaurar',
      cancelLabel: 'Cancelar',
      isDestructive: false,
    });

    if (!confirmed) {
      e.target.value = '';
      return;
    }

    setLoading(true);
    setOperationResult(null);
    setProgress(0);
    setStatusText('Validando integridade do arquivo...');

    try {
      let result: { campaignIds: string[]; sequence: number };
      if (isJson) {
        const text = await file.text();
        const data = JSON.parse(text);
        setProgress(50);
        setStatusText('Limpando base antiga e restaurando tabelas...');
        result = await BackupService.importJSONData(data, file.name);
        setProgress(100);
      } else {
        result = await BackupService.importFullZipData(file, (p) => {
          setProgress(p);
          setStatusText(`Extraindo e restaurando mídias originais... (${p}%)`);
        });
      }

      refreshAllVersionData();

      setOperationResult({
        type: 'success',
        message: `Grimório restaurado com sucesso! Versão importada: v${result.sequence}. Alterações pendentes zeradas.`,
      });

      if (result.campaignIds.length > 0) {
        setImportedCampaignId(result.campaignIds[0]);
        await switchCampaign(result.campaignIds[0]);
      }
    } catch (err: any) {
      setOperationResult({ type: 'error', message: err.message || 'Erro ao importar arquivo de backup.' });
    } finally {
      setLoading(false);
      setProgress(null);
      e.target.value = '';
    }
  };

  const handleSeedCoraçãoRubi = async () => {
    if (!campaign) {
      setOperationResult({ type: 'error', message: 'Crie ou selecione uma campanha antes de carregar as crônicas.' });
      return;
    }

    const confirmed = await confirm({
      title: 'Carregar Crônica Oficial',
      message: 'Isso carregará as 20 memórias e crônicas completas do livro Coração de Rubi no seu grimório atual. Continuar?',
      confirmLabel: 'Carregar',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    setLoading(true);
    setOperationResult(null);
    setProgress(50);
    setStatusText('Consultando o Grimório do Coração de Rubi...');

    try {
      const { seedCampaignMemories } = await import('../db/seeder');
      await seedCampaignMemories(campaign.id);
      VersionControlService.logChange(
        'create',
        'memory',
        campaign.id,
        'Coração de Rubi',
        'Crônica oficial "Coração de Rubi" (20 partes) inserida na campanha'
      );
      refreshAllVersionData();
      setProgress(100);
      setOperationResult({
        type: 'success',
        message: 'Crônica oficial "Coração de Rubi" (20 partes) carregada com sucesso!',
      });
    } catch (err: any) {
      setOperationResult({ type: 'error', message: err.message || 'Erro ao carregar as memórias da campanha.' });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleDeleteSelectedCampaign = async () => {
    if (!campaignToDelete) {
      setOperationResult({ type: 'error', message: 'Por favor, selecione um grimório para excluir.' });
      return;
    }
    const target = campaigns.find(c => c.id === campaignToDelete);
    if (!target) return;

    const confirmed = await confirm({
      title: 'Excluir Grimório',
      message: `CUIDADO: Isso apagará TODOS os heróis, memórias e galeria de imagens do grimório "${target.name}" de forma irreversível.\n\nDigite "FORMATAR" para confirmar a exclusão:`,
      confirmLabel: 'Excluir Permanentemente',
      cancelLabel: 'Cancelar',
      isDestructive: true,
      requiredInput: 'FORMATAR',
      inputPlaceholder: 'Digite FORMATAR para confirmar',
    });
    if (!confirmed) return;

    setLoading(true);
    setOperationResult(null);
    try {
      await deleteCampaign(target.id);
      refreshAllVersionData();
      setOperationResult({
        type: 'success',
        message: `Grimório "${target.name}" excluído com sucesso.`,
      });
      setCampaignToDelete('');
    } catch (err: any) {
      setOperationResult({ type: 'error', message: 'Erro ao excluir grimório: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: ChangeLogEntry['action']) => {
    switch (action) {
      case 'create':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
            <PlusCircle className="w-2.5 h-2.5" />
            <span>Criado</span>
          </span>
        );
      case 'update':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/40">
            <Edit3 className="w-2.5 h-2.5" />
            <span>Alterado</span>
          </span>
        );
      case 'delete':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold bg-rose-950/40 text-rose-300 border border-rose-800/40">
            <Trash2 className="w-2.5 h-2.5" />
            <span>Excluído</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getEntityBadge = (entityType: ChangeLogEntry['entityType']) => {
    const labels: Record<string, string> = {
      campaign: 'Grimório',
      character: 'Herói/Aliado',
      memory: 'Memória',
      token: 'Token',
      media: 'Mídia',
      system: 'Sistema'
    };
    return (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-medium bg-medieval-charcoal/60 text-medieval-gold/90 border border-medieval-gold/20 uppercase tracking-wider">
        {labels[entityType] || entityType}
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in font-serif text-sm">

      {/* Page Title */}
      <div className="border-b border-medieval-gold/15 pb-4">
        <h2 className="text-xl font-medieval text-medieval-gold uppercase tracking-wider flex items-center space-x-2">
          <HardDrive className="w-5 h-5 text-medieval-gold" />
          <span>Configurações & Manutenção Local</span>
        </h2>
        <p className="text-xs text-medieval-silver mt-1">
          Estrutura 100% local (IndexedDB). Exporte ou restaure suas crônicas e fichas a qualquer momento.
        </p>
      </div>

      {/* Backup Versioning Status Banner */}
      <div className="grimoire-card p-4 space-y-3 bg-gradient-to-r from-medieval-stone/40 via-medieval-stone/20 to-transparent border-medieval-gold/25">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-medieval-gold" />
            <span className="text-xs font-medieval font-bold uppercase tracking-wider text-medieval-brightGold">
              Controle de Versão do Grimório
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-medieval-gold/20 text-medieval-brightGold border border-medieval-gold/40">
              Versão Atual: v{currentVersion}
            </span>
          </div>
        </div>

        <p className="text-xs text-medieval-silver leading-relaxed">
          {hasChanges ? (
            <span className="text-amber-300/90 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Há <strong>{pendingChanges.length}</strong> alterações realizadas. A próxima exportação gerará a nova versão <strong>v{nextVersionPreview.version}</strong>.
              </span>
            </span>
          ) : (
            <span className="text-emerald-400/90 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Nenhuma alteração pendente. A próxima exportação manterá a versão <strong>v{currentVersion}</strong> sem gerar versão nova.
              </span>
            </span>
          )}
        </p>

        {lastImport && (
          <div className="text-[11px] bg-medieval-charcoal/60 p-2.5 rounded border border-medieval-gold/15 text-medieval-silver space-y-1">
            <div className="flex justify-between text-medieval-parchment">
              <span>Última importação neste dispositivo:</span>
              <strong className="text-medieval-brightGold font-mono">v{lastImport.sequence}</strong>
            </div>
            <div className="truncate font-mono text-[10px] text-medieval-gold/80" title={lastImport.filename}>
              Arquivo: {lastImport.filename}
            </div>
            <div className="text-[10px] text-medieval-silver/70">
              Data: {new Date(lastImport.importedAt).toLocaleString('pt-BR')} • {lastImport.campaignsCount} campanhas • {lastImport.charactersCount} heróis • {lastImport.memoriesCount} memórias • {lastImport.mediaCount} mídias
            </div>
          </div>
        )}
      </div>

      {/* Retracted / Collapsible Audit Log (Log Retraído com Todas as Alterações Detalhadas) */}
      <div className="space-y-2">
        <div className="grimoire-card overflow-hidden border-medieval-gold/25">
          <button
            type="button"
            onClick={() => setIsLogExpanded(!isLogExpanded)}
            className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-300 text-left group cursor-pointer"
            aria-expanded={isLogExpanded}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <ScrollText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <strong className="text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold truncate">
                    Registro de Alterações do Grimório (Audit Log)
                  </strong>
                  {hasChanges ? (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-sans font-bold flex-shrink-0">
                      {pendingChanges.length} pendente{pendingChanges.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-sans flex-shrink-0">
                      v{currentVersion} limpa
                    </span>
                  )}
                </div>
                <span className="text-xs text-medieval-silver block mt-0.5">
                  {isLogExpanded ? 'Clique para recolher o histórico detalhado' : 'Clique para visualizar todas as alterações e histórico por versão'}
                </span>
              </div>
            </div>
            <div className="p-1 text-medieval-gold/60 group-hover:text-medieval-gold transition-colors duration-300">
              <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isLogExpanded ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Collapsible Content */}
          {isLogExpanded && (
            <div className="p-4 border-t border-medieval-gold/15 space-y-6 bg-medieval-charcoal/30 animate-fade-in">
              
              {/* Section 1: Pending Changes for next version */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medieval font-bold uppercase tracking-wider text-medieval-gold flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Alterações Pendentes (Próxima Versão: v{nextVersionPreview.version})</span>
                  </span>
                  <span className="text-[10px] text-medieval-silver font-mono">
                    {pendingChanges.length} alteraç{pendingChanges.length === 1 ? 'ão' : 'ões'}
                  </span>
                </div>

                {pendingChanges.length > 0 ? (
                  <div className="divide-y divide-medieval-gold/10 border border-medieval-gold/15 rounded bg-medieval-charcoal/60 overflow-hidden">
                    {pendingChanges.slice().reverse().map((entry) => (
                      <div key={entry.id} className="p-3 text-xs flex items-start justify-between gap-3 hover:bg-medieval-stone/10 transition-colors duration-200">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            {getActionBadge(entry.action)}
                            {getEntityBadge(entry.entityType)}
                            <span className="font-semibold text-medieval-parchment truncate">{entry.entityName}</span>
                          </div>
                          <p className="text-[11px] text-medieval-silver font-serif">{entry.description}</p>
                        </div>
                        <span className="text-[10px] font-mono text-medieval-silver/60 flex-shrink-0">
                          {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center border border-dashed border-medieval-gold/15 rounded bg-medieval-charcoal/20">
                    <p className="text-xs text-medieval-silver/80">
                      Nenhuma alteração pendente. Se você exportar agora, a versão <strong>v{currentVersion}</strong> será mantida sem gerar nova versão.
                    </p>
                  </div>
                )}
              </div>

              {/* Section 2: Consolidated History of Past Released Versions */}
              <div className="space-y-3 pt-2 border-t border-medieval-gold/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medieval font-bold uppercase tracking-wider text-medieval-gold flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-medieval-brightGold" />
                    <span>Histórico Consolidado de Versões</span>
                  </span>
                  <span className="text-[10px] text-medieval-silver font-mono">
                    {versionHistory.length} versão{versionHistory.length === 1 ? '' : 'ões'}
                  </span>
                </div>

                {versionHistory.length > 0 ? (
                  <div className="space-y-2">
                    {versionHistory.map((vRec) => {
                      const isVerExpanded = expandedVersionNum === vRec.version;
                      return (
                        <div key={vRec.version} className="border border-medieval-gold/15 rounded bg-medieval-charcoal/40 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedVersionNum(isVerExpanded ? null : vRec.version)}
                            className="w-full p-3 flex items-center justify-between hover:bg-medieval-stone/20 transition-colors duration-200 text-left"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-medieval-gold/15 text-medieval-brightGold border border-medieval-gold/30 font-bold">
                                v{vRec.version}
                              </span>
                              <div>
                                <span className="text-xs text-medieval-parchment font-medieval block">
                                  {new Date(vRec.exportedAt).toLocaleDateString('pt-BR')} às {new Date(vRec.exportedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-[10px] text-medieval-silver block">
                                  {vRec.changes.length} alteraç{vRec.changes.length === 1 ? 'ão' : 'ões'} registradas
                                </span>
                              </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-medieval-gold/50 transition-transform duration-200 ${isVerExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          {isVerExpanded && (
                            <div className="p-3 border-t border-medieval-gold/10 bg-medieval-charcoal/60 divide-y divide-medieval-gold/5">
                              {vRec.changes.map((c) => (
                                <div key={c.id} className="py-2 text-[11px] flex items-start justify-between gap-2">
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center space-x-1.5">
                                      {getActionBadge(c.action)}
                                      {getEntityBadge(c.entityType)}
                                      <span className="font-medium text-medieval-parchment truncate">{c.entityName}</span>
                                    </div>
                                    <p className="text-[10px] text-medieval-silver/90 font-serif">{c.description}</p>
                                  </div>
                                  <span className="text-[9px] font-mono text-medieval-silver/50 flex-shrink-0">
                                    {new Date(c.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-center border border-dashed border-medieval-gold/15 rounded bg-medieval-charcoal/20">
                    <p className="text-xs text-medieval-silver">
                      Nenhuma versão consolidada anteriormente. O histórico será formado conforme os backups forem gerados.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Gestão de Grimórios */}
      <div className="space-y-4">
        <span className="block text-[10px] text-medieval-gold uppercase font-medieval tracking-widest pl-1">
          Seus Grimórios (Campanhas)
        </span>
        <div className="grimoire-card divide-y divide-medieval-gold/10 overflow-hidden">
          {campaigns.map(c => (
            <div key={c.id} className="p-4 flex items-center justify-between gap-4 hover:bg-medieval-stone/10 transition-colors duration-300">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medieval text-sm font-bold text-medieval-brightGold truncate">{c.name}</span>
                  {campaign?.id === c.id && (
                    <span className="text-[8px] bg-medieval-gold/20 text-medieval-gold px-1.5 py-0.5 rounded border border-medieval-gold/30 uppercase tracking-widest leading-none flex-shrink-0">
                      Ativo
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-medieval-silver block mt-0.5">
                  Sistema: {c.system} • Iniciada em: {new Date(c.startDate).toLocaleDateString('pt-BR')}
                </span>
                {c.lastImportedFrom && (
                  <span className="text-[10px] text-medieval-gold/80 block mt-1 font-serif italic truncate max-w-[250px] sm:max-w-[350px]" title={c.lastImportedFrom}>
                    Importado de: {c.lastImportedFrom}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {campaign?.id !== c.id && (
                  <button
                    onClick={() => switchCampaign(c.id)}
                    className="btn-stone py-1 px-2.5 text-xs cursor-pointer"
                    disabled={loading}
                  >
                    Selecionar
                  </button>
                )}
                <button
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: 'Excluir Grimório',
                      message: `Tem certeza de que deseja apagar permanentemente o grimório "${c.name}"? Todos os heróis, memórias e imagens desta campanha serão apagados.`,
                      confirmLabel: 'Excluir',
                      cancelLabel: 'Cancelar',
                      isDestructive: true,
                    });
                    if (!confirmed) return;
                    await deleteCampaign(c.id);
                    refreshAllVersionData();
                    setOperationResult({
                      type: 'success',
                      message: `Grimório "${c.name}" excluído com sucesso.`,
                    });
                  }}
                  className="p-1.5 rounded hover:bg-medieval-wine/25 text-medieval-silver hover:text-medieval-wine transition-colors duration-300 cursor-pointer"
                  title="Excluir Grimório"
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="p-3 bg-medieval-charcoal/20 text-center">
            <button
              onClick={() => switchCampaign('new')}
              className="btn-stone py-1.5 px-4 text-xs font-medieval font-bold uppercase tracking-wider inline-flex items-center space-x-1.5 cursor-pointer"
              disabled={loading}
            >
              <span>+ Criar Novo Grimório</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exportar & Backup Local */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pl-1">
          <span className="text-[10px] text-medieval-gold uppercase font-medieval tracking-widest">
            Exportar & Backup Local
          </span>
          <span className="text-[10px] text-medieval-silver font-mono">
            {hasChanges ? `Próxima exportação: v${nextVersionPreview.version}` : `Exportará como: v${currentVersion}`}
          </span>
        </div>

        <div className="grimoire-card divide-y divide-medieval-gold/10 overflow-hidden">

          {/* Option 1: Export JSON only */}
          <button
            onClick={handleExportJSON}
            className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-300 text-left group cursor-pointer"
            disabled={loading}
          >
            <div className="flex items-center space-x-4 min-w-0">
              <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <FileJson className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <strong className="block text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold truncate">
                  Exportar Estrutura de Dados (Somente JSON)
                </strong>
                <span className="text-xs text-medieval-silver block mt-0.5">
                  {hasChanges
                    ? `Gerará a nova versão v${nextVersionPreview.version} (contendo ${pendingChanges.length} alterações). Leve e textual.`
                    : `Exportará na versão atual v${currentVersion} (sem alterações pendentes).`}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-medieval-gold/15 text-medieval-brightGold border border-medieval-gold/30">
                {hasChanges ? `-> v${nextVersionPreview.version}` : `v${currentVersion}`}
              </span>
              <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-300" />
            </div>
          </button>

          {/* Option 2: Incremental Delta ZIP (Only new/modified media + data) */}
          <button
            onClick={handleExportDeltaZIP}
            className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-300 text-left group cursor-pointer"
            disabled={loading}
          >
            <div className="flex items-center space-x-4 min-w-0">
              <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Archive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <strong className="block text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold flex items-center gap-2">
                  <span>Exportar Atualização Incremental (Delta ZIP)</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-sans uppercase flex-shrink-0">
                    Econômico
                  </span>
                </strong>
                <span className="text-xs text-medieval-silver block mt-0.5">
                  Empacota todos os dados e <strong>apenas as fotos/tokens novos ou modificados</strong> nesta versão. Não repete centenas de fotos antigas.
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-medieval-gold/15 text-medieval-brightGold border border-medieval-gold/30">
                {hasChanges ? `-> v${nextVersionPreview.version}` : `v${currentVersion}`}
              </span>
              <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-300" />
            </div>
          </button>

          {/* Option 3: Full ZIP with All Images and Files */}
          <button
            onClick={handleExportZIP}
            className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-300 text-left group cursor-pointer"
            disabled={loading}
          >
            <div className="flex items-center space-x-4 min-w-0">
              <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Archive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <strong className="block text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold flex items-center gap-2">
                  <span>Exportar Manuscrito Completo (ZIP Integral)</span>
                  <span className="text-[9px] bg-medieval-gold/20 text-medieval-brightGold border border-medieval-gold/30 px-1.5 py-0.2 rounded font-sans uppercase flex-shrink-0">
                    Acervo Total
                  </span>
                </strong>
                <span className="text-xs text-medieval-silver block mt-0.5">
                  {hasChanges
                    ? `Gerará a nova versão v${nextVersionPreview.version} com absolutamente todas as imagens da base (backup integral para arquivamento).`
                    : `Exportará o acervo total na versão v${currentVersion} com todas as imagens.`}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-medieval-gold/15 text-medieval-brightGold border border-medieval-gold/30">
                {hasChanges ? `-> v${nextVersionPreview.version}` : `v${currentVersion}`}
              </span>
              <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-300" />
            </div>
          </button>

        </div>
      </div>

      {/* Restauração de Dados */}
      <div className="space-y-4">
        <span className="block text-[10px] text-medieval-gold uppercase font-medieval tracking-widest pl-1">
          Restauração de Dados (Importação Total)
        </span>
        <div className="grimoire-card overflow-hidden">
          <label className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-300 text-left group cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold">
                  Carregar e Restaurar Arquivo (.json ou .zip)
                </strong>
                <span className="text-xs text-medieval-silver">
                  Sobrepõe todos os dados locais com as crônicas do arquivo e adota a versão do backup sem criar versão nova.
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-300 flex-shrink-0" />
            <input
              type="file"
              accept=".json,.zip"
              onChange={handleImportFile}
              className="hidden"
              disabled={loading}
            />
          </label>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="space-y-4">
        <span className="block text-[10px] text-medieval-gold uppercase font-medieval tracking-widest pl-1">
          Aparência do Grimório
        </span>
        <div className="grimoire-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('grimoire')}
            className={`p-3 rounded border transition-all duration-300 flex flex-col items-center space-y-2 cursor-pointer ${theme === 'grimoire' || theme === 'dark'
              ? 'bg-medieval-gold/10 border-medieval-gold shadow-gold'
              : 'bg-medieval-charcoal/40 border-medieval-gold/10 hover:border-medieval-gold/30'
              }`}
          >
            <div className="w-full h-12 bg-[#0A0A0C] rounded border border-[#C5A880]/20 flex items-center justify-center">
              <div className="w-8 h-1 bg-[#C5A880] rounded-full" />
            </div>
            <span className={`text-xs font-medieval ${theme === 'grimoire' || theme === 'dark' ? 'text-medieval-brightGold' : 'text-medieval-silver'}`}>Grimoire Noir</span>
          </button>

          <button
            onClick={() => setTheme('parchment')}
            className={`p-3 rounded border transition-all duration-300 flex flex-col items-center space-y-2 cursor-pointer ${theme === 'parchment'
              ? 'bg-[#8b7355]/10 border-[#8b7355] shadow-gold'
              : 'bg-white/5 border-medieval-gold/10 hover:border-medieval-gold/30'
              }`}
          >
            <div className="w-full h-12 bg-[#F4F1EA] rounded border border-[#8B7355]/20 flex items-center justify-center">
              <div className="w-8 h-1 bg-[#8B7355] rounded-full" />
            </div>
            <span className={`text-xs font-medieval ${theme === 'parchment' ? 'text-[#8b7355]' : 'text-medieval-silver'}`}>Parchment Scroll</span>
          </button>

          <button
            onClick={() => setTheme('emerald')}
            className={`p-3 rounded border transition-all duration-300 flex flex-col items-center space-y-2 cursor-pointer ${theme === 'emerald'
              ? 'bg-[#10b981]/10 border-[#10b981] shadow-gold'
              : 'bg-emerald-950/20 border-medieval-gold/10 hover:border-medieval-gold/30'
              }`}
          >
            <div className="w-full h-12 bg-[#06140C] rounded border border-[#4ADE80]/20 flex items-center justify-center">
              <div className="w-8 h-1 bg-[#4ADE80] rounded-full" />
            </div>
            <span className={`text-xs font-medieval ${theme === 'emerald' ? 'text-[#4ade80]' : 'text-medieval-silver'}`}>Emerald Court</span>
          </button>

          <button
            onClick={() => setTheme('crimson')}
            className={`p-3 rounded border transition-all duration-300 flex flex-col items-center space-y-2 cursor-pointer ${theme === 'crimson'
              ? 'bg-[#C0392B]/10 border-[#C0392B] shadow-gold'
              : 'bg-red-950/20 border-medieval-gold/10 hover:border-medieval-gold/30'
              }`}
          >
            <div className="w-full h-12 bg-[#120A0A] rounded border border-[#C0392B]/20 flex items-center justify-center">
              <div className="w-8 h-1 bg-[#C0392B] rounded-full" />
            </div>
            <span className={`text-xs font-medieval ${theme === 'crimson' ? 'text-[#E74C3C]' : 'text-medieval-silver'}`}>Crimson Throne</span>
          </button>

          <button
            onClick={() => setTheme('frost')}
            className={`p-3 rounded border transition-all duration-300 flex flex-col items-center space-y-2 cursor-pointer ${theme === 'frost'
              ? 'bg-[#7EB8E8]/10 border-[#7EB8E8] shadow-gold'
              : 'bg-blue-950/20 border-medieval-gold/10 hover:border-medieval-gold/30'
              }`}
          >
            <div className="w-full h-12 bg-[#0A0F1A] rounded border border-[#7EB8E8]/20 flex items-center justify-center">
              <div className="w-8 h-1 bg-[#7EB8E8] rounded-full" />
            </div>
            <span className={`text-xs font-medieval ${theme === 'frost' ? 'text-[#A8D4F5]' : 'text-medieval-silver'}`}>Frostbound</span>
          </button>
        </div>
      </div>

      {/* Storage Estimate Panel */}
      {storageUsage && (
        <div className="grimoire-card p-4 space-y-3">
          <div className="flex items-center space-x-2 text-medieval-gold font-medieval text-xs uppercase tracking-wider">
            <HardDrive className="w-4 h-4" />
            <span>Capacidade de Armazenamento Local (IndexedDB)</span>
          </div>
          <div className="flex justify-between items-end text-xs text-medieval-silver">
            <span>Uso Atual: <strong className="text-medieval-parchment">{storageUsage.used}</strong></span>
            <span>Espaço Estimado Disponível: {storageUsage.total}</span>
          </div>
          <div className="w-full bg-medieval-charcoal/90 h-1.5 rounded overflow-hidden border border-medieval-gold/10">
            <div className="bg-medieval-gold h-full rounded transition-all duration-500" style={{ width: `${storageUsage.percent}%` }} />
          </div>
        </div>
      )}

      {/* Campanhas e Livros Prontos */}
      {campaign && (
        <div className="space-y-4">
          <span className="block text-[10px] text-medieval-gold uppercase font-medieval tracking-widest pl-1">
            Campanhas e Livros Prontos
          </span>
          <div className="grimoire-card overflow-hidden">
            <button
              onClick={handleSeedCoraçãoRubi}
              className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-300 text-left group cursor-pointer"
              disabled={loading}
            >
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold flex-shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <strong className="block text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold">
                    Importar Crônica Coração de Rubi
                  </strong>
                  <span className="text-xs text-medieval-silver font-serif">
                    Preenche suas memórias com a história oficial completa (20 partes de T20-Coração Rubi).
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-300" />
            </button>
          </div>
        </div>
      )}

      {/* Danger Operations Section */}
      <div className="space-y-4">
        <span className="block text-[10px] text-red-400 uppercase font-medieval tracking-widest pl-1">
          Zona de Perigo
        </span>
        <div className="grimoire-card border-red-900/30 bg-red-950/5 p-4 space-y-4">
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-red-400 uppercase tracking-widest">
              Selecionar Grimório para Exclusão Definitiva
            </label>
            <select
              value={campaignToDelete}
              onChange={(e) => setCampaignToDelete(e.target.value)}
              className="medieval-input bg-medieval-stone text-medieval-parchment text-xs py-2"
              disabled={loading}
            >
              <option value="">-- Selecione uma Campanha --</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.system})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDeleteSelectedCampaign}
            className="w-full btn-stone border-red-950 hover:bg-red-950/20 text-red-400 text-xs py-2.5 flex items-center justify-center space-x-2 cursor-pointer font-medieval uppercase tracking-wider"
            disabled={loading || !campaignToDelete}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Excluir Grimório Selecionado</span>
          </button>
        </div>
      </div>

      {/* Operation progress/result overlay */}
      <OperationOverlay
        isActive={loading}
        progress={progress}
        statusText={statusText}
        result={operationResult}
        onDismiss={() => {
          setOperationResult(null);
          setImportedCampaignId(null);
        }}
        secondaryActionLabel={importedCampaignId ? "Alternar para Grimório" : undefined}
        onSecondaryAction={importedCampaignId ? () => switchCampaign(importedCampaignId) : undefined}
      />

    </div>
  );
};
