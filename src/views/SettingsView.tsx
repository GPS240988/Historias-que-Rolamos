import React, { useState, useEffect } from 'react';
import { useCampaign } from '../contexts/CampaignContext';
import { BackupService } from '../services/backup';
import {
  Upload,
  Trash2,
  FileJson,
  Archive,
  RefreshCw,
  HardDrive,
  ChevronRight,
  BookOpen
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { campaign, campaigns, switchCampaign, deleteCampaign, theme, setTheme } = useCampaign();

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState('');

  // Storage usage details
  const [storageUsage, setStorageUsage] = useState<{ used: string; total: string; percent: number } | null>(null);

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(1);
        const totalMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(0);
        const percentage = Math.round(((estimate.usage || 0) / (estimate.quota || 1)) * 100);
        setStorageUsage({ used: `${usedMB} MB`, total: `${totalMB} MB`, percent: percentage || 1 });
      });
    }
  }, [success]);

  const handleSeedCoraçãoRubi = async () => {
    if (!campaign) {
      setError('Crie uma campanha primeiro antes de alimentar as crônicas.');
      return;
    }

    if (window.confirm('Isso carregará as 20 memórias e crônicas completas do livro Coração de Rubi na sua campanha atual. Continuar?')) {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setProgress(50);
      setStatusText('Consultando o Grimório do Coração de Rubi...');

      try {
        const { seedCampaignMemories } = await import('../db/seeder');
        await seedCampaignMemories(campaign.id);
        setProgress(100);
        setSuccess('Crônica oficial "Coração de Rubi" (20 partes) carregada com sucesso no Grimório!');
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar as memórias da campanha.');
      } finally {
        setLoading(false);
        setProgress(null);
      }
    }
  };

  const handleExportJSON = async () => {
    if (!campaign) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await BackupService.exportJSONBackup(campaign.id);
      setSuccess('Dados de crônicas (JSON) exportados com sucesso.');
    } catch (err: any) {
      setError(err.message || 'Erro ao exportar JSON.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportZIP = async () => {
    if (!campaign) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress(0);
    setStatusText('Agrupando imagens e estruturando memória...');
    try {
      await BackupService.exportFullZipBackup(campaign.id, (p) => {
        setProgress(p);
        if (p === 90) {
          setStatusText('Gerando arquivo ZIP compactado...');
        }
      });
      setSuccess('Memória completa (ZIP) exportada com sucesso.');
    } catch (err: any) {
      setError(err.message || 'Erro ao exportar ZIP.');
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
      setError('Formato de arquivo inválido. Selecione um .json ou .zip de backup.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress(0);
    setStatusText('Validando arquivo de memórias...');

    try {
      if (isJson) {
        const text = await file.text();
        const data = JSON.parse(text);
        await BackupService.importJSONData(data);
        setSuccess('Dados de crônicas restaurados com sucesso.');
      } else {
        await BackupService.importFullZipData(file, (p) => {
          setProgress(p);
          setStatusText(`Extraindo e otimizando miniaturas... (${p}%)`);
        });
        setSuccess('Memória completa e galeria de imagens restauradas com sucesso.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao importar arquivo de backup.');
    } finally {
      setLoading(false);
      setProgress(null);
      // Clear input
      e.target.value = '';
    }
  };

  const handleDeleteSelectedCampaign = async () => {
    if (!campaignToDelete) {
      setError('Por favor, selecione um grimório para excluir.');
      return;
    }
    const target = campaigns.find(c => c.id === campaignToDelete);
    if (!target) return;

    const confirm1 = `CUIDADO: Isso apagará TODOS os heróis, memórias e galeria de imagens do grimório "${target.name}" de forma irreversível. Tem certeza?`;
    const confirm2 = `ÚLTIMO AVISO: Perda definitiva de dados. Digite "FORMATAR" para confirmar a exclusão de "${target.name}":`;

    if (window.confirm(confirm1)) {
      const response = window.prompt(confirm2);
      if (response === 'FORMATAR') {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
          await deleteCampaign(target.id);
          setSuccess(`Grimório "${target.name}" excluído com sucesso.`);
          setCampaignToDelete('');
        } catch (err: any) {
          setError('Erro ao excluir grimório: ' + err.message);
        } finally {
          setLoading(false);
        }
      } else if (response !== null) {
        alert('Confirmação inválida. Operação abortada.');
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in font-serif text-sm">

      {/* Page Title */}
      <div className="border-b border-medieval-gold/15 pb-4">
        <h2 className="text-xl font-medieval text-medieval-gold uppercase tracking-wider flex items-center space-x-2">
          <HardDrive className="w-5 h-5 text-medieval-gold" />
          <span>Configurações e Manutenção</span>
        </h2>
        <p className="text-xs text-medieval-silver mt-1">
          Gerencie os pergaminhos da campanha, realize backups e configure temas.
        </p>
      </div>

      {/* Gestão de Grimórios */}
      <div className="space-y-4">
        <span className="block text-[10px] text-medieval-gold uppercase font-medieval tracking-widest pl-1">
          Seus Grimórios (Campanhas)
        </span>
        <div className="grimoire-card divide-y divide-medieval-gold/10 overflow-hidden">
          {campaigns.map(c => (
            <div key={c.id} className="p-4 flex items-center justify-between gap-4 hover:bg-medieval-stone/10 transition-colors">
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
                    if (window.confirm(`Tem certeza de que deseja apagar permanentemente o grimório "${c.name}"? Todos os heróis, memórias e imagens desta campanha serão apagados.`)) {
                      await deleteCampaign(c.id);
                      setSuccess(`Grimório "${c.name}" excluído com sucesso.`);
                    }
                  }}
                  className="p-1.5 rounded hover:bg-medieval-wine/25 text-medieval-silver hover:text-medieval-wine transition-colors cursor-pointer"
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

      {/* Theme Selection */}
      <div className="space-y-4">
        <span className="block text-[10px] text-medieval-gold uppercase font-medieval tracking-widest pl-1">
          Aparência do Grimório
        </span>
        <div className="grimoire-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('dark')}
            className={`p-3 rounded border transition-all duration-200 flex flex-col items-center space-y-2 ${theme === 'dark'
              ? 'bg-medieval-gold/10 border-medieval-gold shadow-gold'
              : 'bg-medieval-charcoal/40 border-medieval-gold/10 hover:border-medieval-gold/30'
              }`}
          >
            <div className="w-full h-12 bg-[#0f0f12] rounded border border-medieval-gold/20 flex items-center justify-center">
              <div className="w-8 h-1 bg-[#c5a880] rounded-full" />
            </div>
            <span className={`text-xs font-medieval ${theme === 'dark' ? 'text-medieval-brightGold' : 'text-medieval-silver'}`}>Escuro (Padrão)</span>
          </button>

          <button
            onClick={() => setTheme('parchment')}
            className={`p-3 rounded border transition-all duration-200 flex flex-col items-center space-y-2 ${theme === 'parchment'
              ? 'bg-[#8b7355]/10 border-[#8b7355] shadow-gold'
              : 'bg-white/5 border-medieval-gold/10 hover:border-medieval-gold/30'
              }`}
          >
            <div className="w-full h-12 bg-[#f4f1ea] rounded border border-[#8b7355]/20 flex items-center justify-center">
              <div className="w-8 h-1 bg-[#8b7355] rounded-full" />
            </div>
            <span className={`text-xs font-medieval ${theme === 'parchment' ? 'text-[#8b7355]' : 'text-medieval-silver'}`}>Pergaminho</span>
          </button>

          <button
            onClick={() => setTheme('emerald')}
            className={`p-3 rounded border transition-all duration-200 flex flex-col items-center space-y-2 ${theme === 'emerald'
              ? 'bg-[#10b981]/10 border-[#10b981] shadow-gold'
              : 'bg-emerald-950/20 border-medieval-gold/10 hover:border-medieval-gold/30'
              }`}
          >
            <div className="w-full h-12 bg-[#06140c] rounded border border-[#4ade80]/20 flex items-center justify-center">
              <div className="w-8 h-1 bg-[#4ade80] rounded-full" />
            </div>
            <span className={`text-xs font-medieval ${theme === 'emerald' ? 'text-[#4ade80]' : 'text-medieval-silver'}`}>Reino Esmeralda</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-medieval-wine/25 border border-medieval-wine/50 rounded text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-950/40 border border-green-800/40 rounded text-green-300">
          {success}
        </div>
      )}

      {/* Loading & Progress indicator overlay */}
      {loading && progress !== null && (
        <div className="grimoire-card p-4 border-medieval-gold/30 bg-medieval-stone/90 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-medieval-gold font-medieval flex items-center">
              <RefreshCw className="w-4 h-4 mr-1.5 animate-spin text-medieval-gold" />
              {statusText}
            </span>
            <span className="text-medieval-silver">{progress}%</span>
          </div>
          <div className="w-full bg-medieval-charcoal/80 h-2 rounded overflow-hidden border border-medieval-gold/15">
            <div
              className="bg-gradient-to-r from-medieval-gold to-medieval-brightGold h-full rounded transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Storage Estimate Panel */}
      {storageUsage && (
        <div className="grimoire-card p-4 space-y-3">
          <div className="flex items-center space-x-2 text-medieval-gold font-medieval text-xs uppercase tracking-wider">
            <HardDrive className="w-4 h-4" />
            <span>Capacidade de Armazenamento Local (IndexedDB)</span>
          </div>
          <div className="flex justify-between items-end text-xs text-medieval-silver">
            <span>Uso da Galeria: <strong className="text-medieval-parchment">{storageUsage.used}</strong></span>
            <span>Espaço Reservado: {storageUsage.total}</span>
          </div>
          <div className="w-full bg-medieval-charcoal/90 h-1.5 rounded overflow-hidden border border-medieval-gold/10">
            <div className="bg-medieval-gold h-full rounded" style={{ width: `${storageUsage.percent}%` }} />
          </div>
        </div>
      )}

      {/* Active Campaign Info Header */}
      {campaign && (
        <div className="grimoire-card p-4 flex items-center justify-between text-xs">
          <div>
            <span className="block text-[10px] text-medieval-gold uppercase font-medieval">Grimório Ativo</span>
            <strong className="text-sm font-medieval text-medieval-brightGold">{campaign.name}</strong>
          </div>
          <div className="text-right text-medieval-silver">
            <div>Sistema: {campaign.system}</div>
            <div>Iniciada: {new Date(campaign.startDate).toLocaleDateString('pt-BR')}</div>
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
              className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-200 text-left group cursor-pointer"
              disabled={loading}
            >
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold flex-shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <strong className="block text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold">Importar Crônica Coração de Rubi</strong>
                  <span className="text-xs text-medieval-silver font-serif">Preenche suas memórias com a história oficial completa (20 partes extraídas de T20-Coração Rubi.pdf).</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-200" />
            </button>
          </div>
        </div>
      )}

      {/* Backup Menu Options (reference settings layout list) */}
      <div className="space-y-4">
        <span className="block text-[10px] text-medieval-gold uppercase font-medieval tracking-widest pl-1">
          Exportar & Backup
        </span>
        <div className="grimoire-card divide-y divide-medieval-gold/10 overflow-hidden">

          <button
            onClick={handleExportJSON}
            className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-200 text-left group"
            disabled={loading}
          >
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold flex-shrink-0">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold">Exportar Apenas Dados (JSON)</strong>
                <span className="text-xs text-medieval-silver">Backup de fichas de heróis, diários e relações sem mídias.</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-200" />
          </button>

          <button
            onClick={handleExportZIP}
            className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-200 text-left group"
            disabled={loading}
          >
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold flex-shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold">Exportar Memória Completa (ZIP)</strong>
                <span className="text-xs text-medieval-silver">Backup unificado contendo todas as imagens originais, tokens e base de dados.</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-200" />
          </button>

        </div>
      </div>

      {/* Restore Menu Options */}
      <div className="space-y-4">
        <span className="block text-[10px] text-medieval-gold uppercase font-medieval tracking-widest pl-1">
          Restauração de Dados
        </span>
        <div className="grimoire-card overflow-hidden">

          <label className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-200 text-left group cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold flex-shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold">Carregar Arquivo de Backup</strong>
                <span className="text-xs text-medieval-silver">Restaure sua mesa a partir de arquivos compactados (.zip) ou planilhas de dados (.json).</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-200" />
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

    </div>
  );
};
