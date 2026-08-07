import React, { useState, useEffect } from 'react';
import { useCampaign } from '../contexts/CampaignContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { BackupService } from '../services/backup';
import { OperationOverlay } from '../components/ui/OperationOverlay';
import { useSync } from '../contexts/SyncContext';
import { CampaignRepository } from '../repositories/CampaignRepository';
import { db } from '../db';
import {
  Upload,
  Trash2,
  Archive,
  HardDrive,
  ChevronRight,
  BookOpen
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { campaign, campaigns, switchCampaign, deleteCampaign, theme, setTheme } = useCampaign();
  const { confirm } = useConfirmation();
  const { isAuthenticated, username, login, register, logout, syncNow } = useSync();

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('');
  const [operationResult, setOperationResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [importedCampaignId, setImportedCampaignId] = useState<string | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState('');
  
  const [cloudUsername, setCloudUsername] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Storage usage details
  const [storageUsage, setStorageUsage] = useState<{ used: string; total: string; percent: number } | null>(null);

  const handleCloudLogin = async () => {
    if (!cloudUsername.trim() || !cloudPassword) {
      setCloudError('Assinatura e chave obrigatórias.');
      return;
    }
    setLoading(true);
    setCloudError(null);
    try {
      await login(cloudUsername, cloudPassword);
      setCloudUsername('');
      setCloudPassword('');
    } catch (err: any) {
      setCloudError(err.message || 'Erro ao conectar com o Servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloudRegister = async () => {
    if (!cloudUsername.trim() || !cloudPassword) {
      setCloudError('Assinatura e chave obrigatórias.');
      return;
    }
    setLoading(true);
    setCloudError(null);
    try {
      await register(cloudUsername, cloudPassword);
      setCloudUsername('');
      setCloudPassword('');
      setOperationResult({ type: 'success', message: 'Assinatura criada e conectada com sucesso!' });
    } catch (err: any) {
      setCloudError(err.message || 'Erro ao registrar assinatura.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCampaign = async () => {
    if (!campaign) return;
    setLoading(true);
    try {
      await CampaignRepository.save(campaign);
      
      // Save all existing records to outbox for initial push
      const chars = await db.characters.where('campaignId').equals(campaign.id).toArray();
      const { CharacterRepository } = await import('../repositories/CharacterRepository');
      for (const char of chars) {
        await CharacterRepository.save(char);
      }

      const mems = await db.memories.where('campaignId').equals(campaign.id).toArray();
      const { MemoryRepository } = await import('../repositories/MemoryRepository');
      for (const mem of mems) {
        await MemoryRepository.save(mem);
      }

      const memoryIds = mems.map(m => m.id);
      if (memoryIds.length > 0) {
        const memChars = await db.memoryCharacters.where('memoryId').anyOf(memoryIds).toArray();
        const { MemoryCharacterRepository } = await import('../repositories/MemoryCharacterRepository');
        for (const mc of memChars) {
          await MemoryCharacterRepository.save(mc);
        }
      }

      const toks = await db.tokens.where('campaignId').equals(campaign.id).toArray();
      const { TokenRepository } = await import('../repositories/TokenRepository');
      for (const tok of toks) {
        await TokenRepository.save(tok);
      }

      const media = await db.media.where('campaignId').equals(campaign.id).toArray();
      const { MediaRepository } = await import('../repositories/MediaRepository');
      for (const med of media) {
        await MediaRepository.save(med);
      }

      setOperationResult({ type: 'success', message: 'Grimório ativo sincronizado com a Nuvem!' });
      syncNow();
    } catch (err: any) {
      setOperationResult({ type: 'error', message: 'Erro ao ativar sincronização: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCampaign = async () => {
    if (!inviteCode.trim()) {
      setOperationResult({ type: 'error', message: 'Por favor, insira um código de convite válido.' });
      return;
    }
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const token = localStorage.getItem('cloud_token');
      
      const res = await fetch(`${API_BASE_URL}/api/campaigns/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ campaignId: inviteCode.trim() })
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error || 'Código inválido ou sem acesso.');
      }

      const campaignId = inviteCode.trim();
      const newCampaignStub = {
        id: campaignId,
        name: 'Grimório Conectando...',
        system: 'Carregando...',
        description: 'Buscando crônicas na nuvem...',
        startDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 0
      };

      await CampaignRepository.save(newCampaignStub, false);
      
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.pullServerChanges(campaignId);

      setOperationResult({
        type: 'success',
        message: 'Entrou no Grimório compartilhado com sucesso!',
      });
      setImportedCampaignId(campaignId);
      setInviteCode('');
    } catch (err: any) {
      setOperationResult({ type: 'error', message: err.message || 'Erro ao entrar na campanha.' });
    } finally {
      setLoading(false);
    }
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

  const handleSeedCoraçãoRubi = async () => {
    if (!campaign) {
      setOperationResult({ type: 'error', message: 'Crie uma campanha primeiro antes de alimentar as crônicas.' });
      return;
    }

    const confirmed = await confirm({
      title: 'Carregar Crônica',
      message: 'Isso carregará as 20 memórias e crônicas completas do livro Coração de Rubi na sua campanha atual. Continuar?',
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
        message: 'Crônica oficial "Coração de Rubi" (20 partes) carregada com sucesso no Grimório!',
      });
    } catch (err: any) {
      setOperationResult({ type: 'error', message: err.message || 'Erro ao carregar as memórias da campanha.' });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  // handleExportJSON: hidden from UI intentionally — preserved via BackupService.exportJSONBackup(campaign.id)

  const handleExportZIP = async () => {
    if (!campaign) return;
    setLoading(true);
    setOperationResult(null);
    setProgress(0);
    setStatusText('Agrupando imagens e estruturando memória...');
    try {
      await BackupService.exportFullZipBackup(campaign.id, (p) => {
        setProgress(p);
        if (p === 90) {
          setStatusText('Gerando arquivo ZIP compactado...');
        }
      });
      setOperationResult({
        type: 'success',
        message: 'Memória completa (ZIP) exportada com sucesso.',
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
      setOperationResult({ type: 'error', message: 'Formato de arquivo inválido. Selecione um .json ou .zip de backup.' });
      return;
    }

    setLoading(true);
    setOperationResult(null);
    setProgress(0);
    setStatusText('Validando arquivo de memórias...');

    try {
      let importedIds: string[] = [];
      if (isJson) {
        const text = await file.text();
        const data = JSON.parse(text);
        setProgress(50);
        setStatusText('Restaurando tabelas de dados...');
        importedIds = await BackupService.importJSONData(data, file.name);
        setProgress(100);
        setOperationResult({
          type: 'success',
          message: 'Dados de crônicas restaurados com sucesso.',
        });
      } else {
        importedIds = await BackupService.importFullZipData(file, (p) => {
          setProgress(p);
          setStatusText(`Extraindo e otimizando miniaturas... (${p}%)`);
        });
        setOperationResult({
          type: 'success',
          message: 'Memória completa e galeria de imagens restauradas com sucesso.',
        });
      }

      if (importedIds.length > 0) {
        setImportedCampaignId(importedIds[0]);
      }
    } catch (err: any) {
      setOperationResult({ type: 'error', message: err.message || 'Erro ao importar arquivo de backup.' });
    } finally {
      setLoading(false);
      setProgress(null);
      // Clear input
      e.target.value = '';
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

      {/* Cloud Sync Settings */}
      <div className="space-y-4">
        <span className="block text-[10px] text-medieval-gold uppercase font-medieval tracking-widest pl-1">
          Sincronização na Nuvem
        </span>
        <div className="grimoire-card p-4 space-y-4">
          {!isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-xs text-medieval-silver leading-relaxed">
                Conecte seu grimório à nuvem para sincronizar heróis, crônicas e fichas de combate em tempo real com seu grupo de forma local-first.
              </p>
              {cloudError && (
                <div className="p-2.5 bg-medieval-wine/20 border border-medieval-wine/50 rounded text-red-300 text-xs">
                  {cloudError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-medieval text-medieval-gold uppercase tracking-wider pl-1">Usuário</label>
                  <input
                    type="text"
                    value={cloudUsername}
                    onChange={(e) => setCloudUsername(e.target.value)}
                    placeholder="Assinatura..."
                    className="medieval-input text-xs"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-medieval text-medieval-gold uppercase tracking-wider pl-1">Chave (Senha)</label>
                  <input
                    type="password"
                    value={cloudPassword}
                    onChange={(e) => setCloudPassword(e.target.value)}
                    placeholder="Palavra secreta..."
                    className="medieval-input text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCloudLogin}
                  className="flex-1 btn-gold py-2 text-xs font-medieval uppercase tracking-wider"
                  disabled={loading}
                >
                  Conectar
                </button>
                <button
                  type="button"
                  onClick={handleCloudRegister}
                  className="flex-1 btn-stone py-2 text-xs font-medieval uppercase tracking-wider"
                  disabled={loading}
                >
                  Escrever Assinatura
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-medieval-silver">Conectado como:</span>{' '}
                  <strong className="text-medieval-brightGold font-medieval ml-1 text-sm">{username}</strong>
                </div>
                <button
                  onClick={logout}
                  className="text-red-400 hover:text-red-300 underline font-medieval uppercase tracking-wider text-[10px] cursor-pointer"
                >
                  Desconectar
                </button>
              </div>

              {campaign && (
                <div className="border-t border-medieval-gold/10 pt-3 space-y-3">
                  <span className="block text-[10px] text-medieval-gold uppercase font-medieval pl-1">Campanha Ativa</span>
                  {campaign.version !== undefined && campaign.version > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-medieval-charcoal/40 p-2.5 rounded border border-medieval-gold/10 text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="text-medieval-silver block text-[8px] uppercase tracking-wider">Código de Convite</span>
                          <code className="text-medieval-brightGold font-mono text-[10px] select-all block truncate">{campaign.id}</code>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(campaign.id);
                            setOperationResult({ type: 'success', message: 'Código de convite copiado!' });
                          }}
                          className="btn-stone py-1 px-2.5 text-[9px] font-medieval uppercase tracking-wider flex-shrink-0 cursor-pointer"
                        >
                          Copiar
                        </button>
                      </div>
                      <p className="text-[10px] text-medieval-silver leading-relaxed pl-1">
                        Compartilhe este código com seus jogadores para que eles possam participar deste grimório na nuvem.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-medieval-silver pl-1">
                        Este grimório está apenas em seu dispositivo local. Ative a sincronização para enviá-lo ao servidor e permitir que outros jogadores se juntem.
                      </p>
                      <button
                        onClick={handleSyncCampaign}
                        className="w-full btn-gold py-2 text-xs font-medieval uppercase tracking-wider cursor-pointer"
                        disabled={loading}
                      >
                        Sincronizar Grimório Ativo
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-medieval-gold/10 pt-3 space-y-2">
                <span className="block text-[10px] text-medieval-gold uppercase font-medieval pl-1">Entrar em Grimório Existente</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Cole o código do Grimório aqui..."
                    className="flex-1 medieval-input text-xs py-1.5"
                  />
                  <button
                    onClick={handleJoinCampaign}
                    className="btn-gold py-1.5 px-4 text-xs font-medieval uppercase tracking-wider cursor-pointer"
                    disabled={loading}
                  >
                    Entrar
                  </button>
                </div>
              </div>
            </div>
          )}
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
            className={`p-3 rounded border transition-all duration-300 flex flex-col items-center space-y-2 ${theme === 'grimoire' || theme === 'dark'
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
            className={`p-3 rounded border transition-all duration-300 flex flex-col items-center space-y-2 ${theme === 'parchment'
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
            className={`p-3 rounded border transition-all duration-300 flex flex-col items-center space-y-2 ${theme === 'emerald'
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
            className={`p-3 rounded border transition-all duration-300 flex flex-col items-center space-y-2 ${theme === 'crimson'
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
            className={`p-3 rounded border transition-all duration-300 flex flex-col items-center space-y-2 ${theme === 'frost'
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
              className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-300 text-left group cursor-pointer"
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
              <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-300" />
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

          {/* 
          <button
            onClick={handleExportJSON}
            className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-300 text-left group"
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
            <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-300" />
          </button>
          */}

          <button
            onClick={handleExportZIP}
            className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-300 text-left group"
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
            <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-300" />
          </button>

        </div>
      </div>

      {/* Restore Menu Options */}
      <div className="space-y-4">
        <span className="block text-[10px] text-medieval-gold uppercase font-medieval tracking-widest pl-1">
          Restauração de Dados
        </span>
        <div className="grimoire-card overflow-hidden">

          <label className="w-full p-4 flex items-center justify-between hover:bg-medieval-stone/30 transition-all duration-300 text-left group cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="p-2 rounded bg-medieval-gold/10 text-medieval-gold flex-shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-sm font-medieval text-medieval-brightGold group-hover:text-medieval-gold">Carregar Arquivo de Backup</strong>
                <span className="text-xs text-medieval-silver">Restaure sua mesa a partir de arquivos compactados (.zip) ou planilhas de dados (.json).</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-300" />
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
