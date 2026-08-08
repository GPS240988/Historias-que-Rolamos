import React, { useState } from 'react';
import { useCampaign } from '../contexts/CampaignContext';
import { useRouter } from '../contexts/RouterContext';
import { useSync } from '../contexts/SyncContext';
import { Shield, BookOpen, PenTool, Image as ImageIcon } from 'lucide-react';
import { OperationOverlay } from '../components/ui/OperationOverlay';

export const CampaignSetup: React.FC = () => {
  const { createCampaign, campaigns, switchCampaign } = useCampaign();
  const { navigate } = useRouter();
  const { isAuthenticated, username, login, register, logout } = useSync();

  const [name, setName] = useState('');
  const [system, setSystem] = useState('Tormenta20');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | undefined>(undefined);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Operation overlay states
  const [progress, setProgress] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('');
  const [operationResult, setOperationResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cloud sync states
  const [cloudUsername, setCloudUsername] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');



  const handleCloudLogin = async () => {
    if (!cloudUsername.trim() || !cloudPassword) {
      setCloudError('Assinatura e chave obrigatórias.');
      return;
    }
    setLoading(true);
    setCloudError(null);
    setStatusText('Conectando à nuvem...');
    try {
      await login(cloudUsername, cloudPassword);
      setCloudUsername('');
      setCloudPassword('');
    } catch (err: any) {
      setCloudError(err.message || 'Erro ao conectar com o Servidor.');
      setOperationResult({ type: 'error', message: err.message || 'Erro ao conectar com o Servidor.' });
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
    setStatusText('Escrevendo assinatura na nuvem...');
    try {
      await register(cloudUsername, cloudPassword);
      setCloudUsername('');
      setCloudPassword('');
      setOperationResult({ type: 'success', message: 'Assinatura criada e conectada com sucesso!' });
    } catch (err: any) {
      setCloudError(err.message || 'Erro ao registrar assinatura.');
      setOperationResult({ type: 'error', message: err.message || 'Erro ao registrar assinatura.' });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCampaign = async () => {
    if (!inviteCode.trim()) {
      setError('Por favor, insira um código de convite válido.');
      return;
    }
    setLoading(true);
    setStatusText('Buscando grimório na nuvem...');
    setProgress(20);
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

      setProgress(50);
      setStatusText('Inicializando grimório local...');
      const campaignId = inviteCode.trim();
      const { CampaignRepository } = await import('../repositories/CampaignRepository');
      
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
      
      setProgress(80);
      setStatusText('Baixando crônicas e memórias...');
      const { SyncEngine } = await import('../services/sync');
      await SyncEngine.pullServerChanges(campaignId);

      setProgress(100);
      setStatusText('Sincronização concluída!');
      
      switchCampaign(campaignId);
      navigate({ type: 'dashboard' });
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar na campanha.');
      setOperationResult({ type: 'error', message: err.message || 'Erro ao entrar na campanha.' });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setError('O arquivo excede o limite de tamanho de 15MB.');
        return;
      }
      setCoverFile(file);
      const url = URL.createObjectURL(file);
      setCoverPreview(url);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome da campanha.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusText('Criando grimório local...');
    try {
      await createCampaign(name, system, description, coverFile);
      navigate({ type: 'dashboard' });
    } catch (err: any) {
      setError(err.message || 'Erro ao criar a campanha. Tente novamente.');
      setOperationResult({ type: 'error', message: err.message || 'Erro ao criar a campanha.' });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-medieval-charcoal/90 relative">
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-10 pointer-events-none" />

      <div className="w-full max-w-lg grimoire-card p-6 md:p-8 relative z-10 animate-fade-in border-medieval-gold/40">
        {/* Title / Crest */}
        <div className="text-center mb-6">
          <Shield className="w-12 h-12 text-medieval-gold mx-auto mb-2 drop-shadow-md" />
          <h1 className="text-2xl font-bold tracking-widest text-medieval-gold uppercase leading-none">
            Memórias da Jornada
          </h1>
          <p className="text-xs font-serif text-medieval-silver tracking-wide mt-2">
            Inicie um novo livro de memórias para a sua campanha
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-medieval-wine/20 border border-medieval-wine/50 rounded text-red-300 text-sm font-serif">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-serif">
          {/* Campaign Name */}
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-medieval-gold flex items-center space-x-1 font-medieval">
              <PenTool className="w-4 h-4" />
              <span>Nome da Campanha</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: O Fim do Terceiro Milênio, A Queda de Valkaria"
              className="medieval-input"
              disabled={loading}
            />
          </div>

          {/* System */}
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-medieval-gold flex items-center space-x-1 font-medieval">
              <BookOpen className="w-4 h-4" />
              <span>Sistema de RPG</span>
            </label>
            <select
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              className="medieval-input bg-medieval-stone text-medieval-parchment"
              disabled={loading}
            >
              <option value="Tormenta20">Tormenta20</option>
              <option value="D&D 5e">Dungeons & Dragons 5e</option>
              <option value="Pathfinder 2e">Pathfinder 2nd Edition</option>
              <option value="Ordem Paranormal">Ordem Paranormal</option>
              <option value="Outro">Outro Sistema</option>
            </select>
          </div>

          {/* Description */}
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-medieval-gold font-medieval">
              Resumo / Sinopse
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva brevemente o prelúdio de sua memória..."
              rows={3}
              className="medieval-input resize-none"
              disabled={loading}
            />
          </div>

          {/* Cover Image Upload */}
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-medieval-gold flex items-center space-x-1 font-medieval">
              <ImageIcon className="w-4 h-4" />
              <span>Imagem de Capa (Opcional)</span>
            </label>

            <div className="flex items-center space-x-4">
              <label className="btn-stone cursor-pointer py-1.5 px-3 text-sm flex items-center space-x-2">
                <ImageIcon className="w-4 h-4" />
                <span>Escolher Capa</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={loading}
                />
              </label>
              {coverFile && (
                <span className="text-xs text-medieval-silver truncate max-w-[200px]">
                  {coverFile.name}
                </span>
              )}
            </div>

            {coverPreview && (
              <div className="mt-3 relative w-full h-32 rounded overflow-hidden border border-medieval-gold/30">
                <img
                  src={coverPreview}
                  alt="Pré-visualização da Capa"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Submit / Action Buttons */}
          <div className="flex gap-3 mt-6">
            {campaigns.length > 0 && (
              <button
                type="button"
                onClick={() => switchCampaign(campaigns[0].id)}
                className="flex-1 btn-stone cursor-pointer"
                disabled={loading}
              >
                Voltar
              </button>
            )}
            <button
              type="submit"
              className="flex-1 btn-gold cursor-pointer"
              disabled={loading}
            >
              {loading ? 'Entalhando...' : 'Criar Grimório'}
            </button>
          </div>

        </form>

        {/* Cloud Login / Join Campaign section */}
        <div className="relative my-6 flex items-center justify-center">
          <span className="absolute inset-x-0 h-px bg-medieval-gold/15 animate-pulse" />
          <span className="relative bg-medieval-stone/95 px-3 text-[10px] uppercase font-medieval tracking-widest text-medieval-gold/60">
            Ou acesse a Nuvem
          </span>
        </div>

        {!isAuthenticated ? (
          <div className="space-y-4 text-xs font-serif">
            <p className="text-[11px] text-medieval-silver leading-relaxed text-center">
              Conecte-se à nuvem para sincronizar seus manuscritos em tempo real ou resgatar campanhas existentes.
            </p>
            {cloudError && (
              <div className="p-2.5 bg-medieval-wine/20 border border-medieval-wine/50 rounded text-red-300 text-xs">
                {cloudError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col space-y-1">
                <label className="text-[9px] font-medieval text-medieval-gold uppercase tracking-wider pl-1">Usuário</label>
                <input
                  type="text"
                  value={cloudUsername}
                  onChange={(e) => setCloudUsername(e.target.value)}
                  placeholder="Assinatura..."
                  className="medieval-input text-xs"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[9px] font-medieval text-medieval-gold uppercase tracking-wider pl-1">Chave (Senha)</label>
                <input
                  type="password"
                  value={cloudPassword}
                  onChange={(e) => setCloudPassword(e.target.value)}
                  placeholder="Palavra secreta..."
                  className="medieval-input text-xs"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleCloudLogin}
                className="flex-1 btn-gold py-2 text-xs font-medieval uppercase tracking-wider cursor-pointer"
                disabled={loading}
              >
                Conectar
              </button>
              <button
                type="button"
                onClick={handleCloudRegister}
                className="flex-1 btn-stone py-2 text-xs font-medieval uppercase tracking-wider cursor-pointer"
                disabled={loading}
              >
                Escrever Assinatura
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs font-serif">
            <div className="flex justify-between items-center text-xs">
              <div>
                <span className="text-medieval-silver">Conectado como:</span>{' '}
                <strong className="text-medieval-brightGold font-medieval ml-1 text-sm">{username}</strong>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-red-400 hover:text-red-300 underline font-medieval uppercase tracking-wider text-[10px] cursor-pointer"
                disabled={loading}
              >
                Desconectar
              </button>
            </div>

            <div className="border-t border-medieval-gold/10 pt-3 space-y-2">
              <span className="block text-[10px] text-medieval-gold uppercase font-medieval pl-1 font-bold">Entrar em Grimório Existente</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Cole o código do Grimório aqui..."
                  className="flex-1 medieval-input text-xs py-1.5"
                  disabled={loading}
                />
                <button
                  type="button"
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

      {/* Progress / Result overlay */}
      <OperationOverlay
        isActive={loading}
        progress={progress}
        statusText={statusText}
        result={operationResult}
        onDismiss={() => setOperationResult(null)}
      />
    </div>
  );
};