import React, { useState } from 'react';
import { useCampaign } from '../contexts/CampaignContext';
import { useRouter } from '../contexts/RouterContext';
import { BackupService } from '../services/backup';
import { OperationOverlay } from '../components/ui/OperationOverlay';
import { Shield, BookOpen, PenTool, Image as ImageIcon, Upload } from 'lucide-react';

export const CampaignSetup: React.FC = () => {
  const { createCampaign, campaigns, switchCampaign } = useCampaign();
  const { navigate } = useRouter();
  const [name, setName] = useState('');
  const [system, setSystem] = useState('Tormenta20');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | undefined>(undefined);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Overlay states for backup restore
  const [progress, setProgress] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('');
  const [operationResult, setOperationResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    try {
      await createCampaign(name, system, description, coverFile);
      navigate({ type: 'dashboard' });
    } catch (err: any) {
      setError(err.message || 'Erro ao criar a campanha. Tente novamente.');
    } finally {
      setLoading(false);
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
        const firstId = importedIds[0];
        // Switch and navigate immediately on first-time import
        switchCampaign(firstId);
        navigate({ type: 'dashboard' });
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

          {/* OR Divider and Import Backup Button */}
          <div className="relative my-6 flex items-center justify-center">
            <span className="absolute inset-x-0 h-px bg-medieval-gold/15 animate-pulse" />
            <span className="relative bg-medieval-stone/95 px-3 text-[10px] uppercase font-medieval tracking-widest text-medieval-gold/60">
              Ou se preferir
            </span>
          </div>

          <div className="text-center">
            <label className="btn-stone cursor-pointer py-2.5 px-4 text-xs font-medieval font-bold uppercase tracking-wider inline-flex items-center space-x-2 w-full justify-center">
              <Upload className="w-4 h-4 text-medieval-gold" />
              <span>Importar Grimório de um Backup (.zip/.json)</span>
              <input
                type="file"
                accept=".json,.zip"
                onChange={handleImportFile}
                className="hidden"
                disabled={loading}
              />
            </label>
          </div>
        </form>
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