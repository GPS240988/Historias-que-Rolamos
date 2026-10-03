import React, { useState, useEffect } from 'react';
import { useCampaign } from '../contexts/CampaignContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { BackupService, type LastImportInfo } from '../services/backup';
import { OperationOverlay } from '../components/ui/OperationOverlay';
import {
  Upload,
  Trash2,
  Archive,
  HardDrive,
  ChevronRight,
  BookOpen,
  FileJson,
  Layers
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

  // Versioning info
  const [currentSequence, setCurrentSequence] = useState<number>(() => BackupService.getCurrentExportSequence());
  const [lastImport, setLastImport] = useState<LastImportInfo | null>(() => BackupService.getLastImportInfo());

  const refreshVersionInfo = () => {
    setCurrentSequence(BackupService.getCurrentExportSequence());
    setLastImport(BackupService.getLastImportInfo());
  };

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

  const handleExportJSON = async () => {
    setLoading(true);
    setOperationResult(null);
    setProgress(50);
    setStatusText('Varrendo todas as tabelas e gerando JSON versionado...');
    try {
      const result = await BackupService.exportFullSystemJSON();
      refreshVersionInfo();
      setProgress(100);
      setOperationResult({
        type: 'success',
        message: `Backup de dados (v${result.sequence}) exportado com sucesso: ${result.filename}`,
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
      refreshVersionInfo();
      setOperationResult({
        type: 'success',
        message: `Manuscrito completo com todas as imagens (v${result.sequence}) exportado: ${result.filename}`,
      });
    } catch (err: any) {
      setOperationResult({ type: 'error', message: err.message || 'Erro ao exportar ZIP.' });
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

    // Explicit confirmation for full database overwrite
    const confirmed = await confirm({
      title: 'Sobrepor Informações do Grimório',
      message: `ATENÇÃO: A importação irá SOBREPOR COMPLETAMENTE todas as informações cadastradas neste dispositivo.\n\nTodos os heróis, campanhas, memórias e fotos atuais serão substituídos pelo conteúdo do arquivo "${file.name}".\n\nDeseja continuar?`,
      confirmLabel: 'Sobrepor e Restaurar',
      cancelLabel: 'Cancelar',
      isDestructive: true,
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

      refreshVersionInfo();

      setOperationResult({
        type: 'success',
        message: `Grimório restaurado com sucesso! Versão importada: v${result.sequence || 1}.`,
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
              Controle de Versionamento Local
            </span>
          </div>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-medieval-gold/20 text-medieval-brightGold border border-medieval-gold/40">
            v{currentSequence}
          </span>
        </div>

        <p className="text-xs text-medieval-silver leading-relaxed">
          Cada exportação gera um arquivo com número sequencial incremental. Ao compartilhar ou importar entre jogadores, o arquivo com a maior versão contém as informações mais atualizadas.
        </p>

        {lastImport && (
          <div className="text-[11px] bg-medieval-charcoal/60 p-2.5 rounded border border-medieval-gold/15 text-medieval-silver space-y-1">
            <div className="flex justify-between text-medieval-parchment">
              <span>Última importação realizada:</span>
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
        <span className="block text-[10px] text-medieval-gold uppercase font-medieval tracking-widest pl-1">
          Exportar & Backup Local
        </span>
        <div className="grimoire-card divide-y divide-medieval-gold/10 overflow-hidden">

          {/* Option 1: Export JSON only */}
          <button
            onClick={handleExportJSON}
            className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-300 text-left group cursor-pointer"
            disabled={loading}
          >
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold">
                  Exportar Estrutura de Dados (Somente JSON)
                </strong>
                <span className="text-xs text-medieval-silver">
                  Varre toda a base: campanhas, heróis, crônicas, comentários, fichas e relações. Leve e rápido para transferência textual.
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-300 flex-shrink-0" />
          </button>

          {/* Option 2: Full ZIP with Images and Files */}
          <button
            onClick={handleExportZIP}
            className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-300 text-left group cursor-pointer"
            disabled={loading}
          >
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold flex items-center gap-2">
                  <span>Exportar Manuscrito Completo (JSON + Imagens + Arquivos ZIP)</span>
                  <span className="text-[9px] bg-medieval-gold/20 text-medieval-brightGold border border-medieval-gold/30 px-1.5 py-0.2 rounded font-sans uppercase">
                    Completo
                  </span>
                </strong>
                <span className="text-xs text-medieval-silver">
                  Varre todo o sistema sem deixar nenhuma informação ou imagem de fora: dados completos + galeria de fotos originais, capas e tokens compactados.
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-300 flex-shrink-0" />
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
                  Sobrepõe todos os dados locais com as crônicas e fotos do backup selecionado.
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
