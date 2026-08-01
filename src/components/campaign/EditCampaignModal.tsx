import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCampaign } from '../../contexts/CampaignContext';
import { X, Calendar, PenTool, BookOpen, Image as ImageIcon } from 'lucide-react';

interface EditCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditCampaignModal: React.FC<EditCampaignModalProps> = ({ isOpen, onClose }) => {
  const { campaign, updateCampaign } = useCampaign();

  const [name, setName] = useState(campaign?.name || '');
  const [system, setSystem] = useState(campaign?.system || '');
  const [description, setDescription] = useState(campaign?.description || '');
  const [startDate, setStartDate] = useState(campaign?.startDate?.substring(0, 10) || ''); // YYYY-MM-DD
  const [coverFile, setCoverFile] = useState<File | undefined>(undefined);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setError('O nome da campanha é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updateCampaign({
        name,
        system,
        description,
        startDate: new Date(startDate).toISOString()
      }, coverFile);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar a campanha.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !campaign) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="w-full max-w-lg bg-medieval-charcoal grimoire-card border-medieval-gold/30 p-5 md:p-6 relative animate-fade-in max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-medieval-gold/15 pb-3 mb-4 shrink-0">
          <h3 className="text-xl font-medieval text-medieval-gold uppercase tracking-wider">
            Editar Grimório
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-medieval-stone text-medieval-silver hover:text-medieval-gold transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-medieval-wine/20 border border-medieval-wine/50 rounded text-red-300 text-sm font-serif shrink-0">
            {error}
          </div>
        )}

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 -mr-1 scrollbar-thin space-y-4 font-serif text-sm">
          {/* Name */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <PenTool className="w-3.5 h-3.5" />
              <span>Nome da Campanha</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="medieval-input py-1.5"
              disabled={loading}
            />
          </div>

          {/* System */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Sistema de RPG</span>
            </label>
            <select
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              className="medieval-input py-1.5 bg-medieval-stone"
              disabled={loading}
            >
              <option value="Tormenta20">Tormenta20</option>
              <option value="D&D 5e">Dungeons & Dragons 5e</option>
              <option value="Pathfinder 2e">Pathfinder 2nd Edition</option>
              <option value="Ordem Paranormal">Ordem Paranormal</option>
              <option value="Outro">Outro Sistema</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Data de Início da Memória</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="medieval-input py-1.5"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold">Resumo Narrativo da Campanha</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descreva a premissa de sua campanha..."
              className="medieval-input resize-none py-1.5"
              disabled={loading}
            />
          </div>

          {/* Cover image upload */}
          <div className="flex flex-col space-y-2 p-3 bg-medieval-stone/40 border border-medieval-gold/10 rounded">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Capa do Grimório (Banner da Campanha)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="text-xs text-medieval-silver file:btn-stone file:mr-2 file:py-1 file:px-2 file:text-xs"
              disabled={loading}
            />
            {coverPreview && (
              <div className="w-full aspect-[21/9] rounded border border-medieval-gold/20 overflow-hidden bg-medieval-charcoal mt-2">
                <img
                  src={coverPreview}
                  alt="Prévia da Nova Capa"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-medieval-gold/15 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-stone py-1.5 px-4 text-xs"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-gold py-1.5 px-4 text-xs"
              disabled={loading}
            >
              {loading ? 'Entalhando...' : 'Salvar Alterações'}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};
