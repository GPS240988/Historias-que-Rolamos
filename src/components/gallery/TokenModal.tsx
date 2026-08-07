import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Token } from '../../types';
import { useCampaign } from '../../contexts/CampaignContext';
import { MediaService } from '../../services/media';
import { db } from '../../db';
import { TokenRepository } from '../../repositories/TokenRepository';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, PenTool, Users, Shield, Image as ImageIcon } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenToEdit?: Token;
}

export const TokenModal: React.FC<TokenModalProps> = ({ isOpen, onClose, tokenToEdit }) => {
  const { campaign } = useCampaign();

  // Load characters for optional linkage dropdown
  const characters = useLiveQuery(() => campaign ? db.characters.where('campaignId').equals(campaign.id).toArray() : [], [campaign?.id]) || [];

  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Player Character' | 'NPC' | 'Enemy'>('Enemy');
  const [relatedChar, setRelatedChar] = useState('');
  const [notes, setNotes] = useState('');

  const [file, setFile] = useState<File | undefined>(undefined);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize form
  useEffect(() => {
    if (tokenToEdit) {
      setName(tokenToEdit.name);
      setCategory(tokenToEdit.category);
      setRelatedChar(tokenToEdit.relatedCharacterId || '');
      setNotes(tokenToEdit.notes || '');
      setCoverPreview(null);
      setFile(undefined);
    } else {
      setName('');
      setCategory('Enemy');
      setRelatedChar('');
      setNotes('');
      setCoverPreview(null);
      setFile(undefined);
    }
    setError(null);
  }, [tokenToEdit, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 15 * 1024 * 1024) {
        setError('O arquivo excede o limite de tamanho de 15MB.');
        return;
      }
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setCoverPreview(url);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('O nome do token é obrigatório.');
      return;
    }

    if (!tokenToEdit && !file) {
      setError('Escolha um arquivo de imagem para o token.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let mediaId = tokenToEdit?.mediaId;

      if (file) {
        if (tokenToEdit?.mediaId) {
          await MediaService.deleteMedia(tokenToEdit.mediaId);
        }
        mediaId = await MediaService.saveMedia(file, campaign!.id, false);
      }

      const tokenData: Token = {
        id: tokenToEdit?.id || crypto.randomUUID(),
        campaignId: campaign!.id,
        name: name.trim(),
        category,
        mediaId: mediaId!,
        relatedCharacterId: relatedChar || undefined,
        notes: notes.trim(),
        createdAt: tokenToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await TokenRepository.save(tokenData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar token de combate.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !campaign) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="w-full max-w-md bg-medieval-charcoal grimoire-card border-medieval-gold/30 p-5 md:p-6 relative animate-fade-in max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-medieval-gold/15 pb-3 mb-4 shrink-0">
          <h3 className="text-xl font-medieval text-medieval-gold uppercase tracking-wider">
            {tokenToEdit ? 'Editar Token de Combate' : 'Registrar Token de Combate'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-medieval-stone text-medieval-silver hover:text-medieval-gold transition-all duration-300"
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
          {/* File selector (only when creating) */}
          {!tokenToEdit && (
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Arte do Token (Suporta Transparência PNG)</span>
              </label>
              <div className="flex items-center space-x-4">
                <label className="btn-stone cursor-pointer py-1.5 px-3 text-xs flex items-center space-x-2">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Escolher Imagem</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
                {file && (
                  <span className="text-xs text-medieval-silver truncate max-w-[180px]">
                    {file.name}
                  </span>
                )}
              </div>
              {coverPreview && (
                <div className="mt-3 flex justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-medieval-gold p-0.5 bg-medieval-stone overflow-hidden">
                    <img
                      src={coverPreview}
                      alt="Prévia do Token"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <PenTool className="w-3.5 h-3.5" />
              <span>Nome do Token</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Kobold Guerreiro, Líder Orc, Baú de Tesouro"
              className="medieval-input py-1.5"
              disabled={loading}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5" />
              <span>Categoria do Token</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="medieval-input py-1.5 bg-medieval-stone"
              disabled={loading}
            >
              <option value="Player Character">Herói Jogador (PC)</option>
              <option value="NPC">NPC / Aliado</option>
              <option value="Enemy">Inimigo / Criatura</option>
            </select>
          </div>

          {/* Related Character */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <Users className="w-3.5 h-3.5" />
              <span>Herói Associado (Opcional)</span>
            </label>
            <select
              value={relatedChar}
              onChange={(e) => setRelatedChar(e.target.value)}
              className="medieval-input py-1.5 bg-medieval-stone"
              disabled={loading}
            >
              <option value="">(Nenhum)</option>
              {characters.map(char => (
                <option key={char.id} value={char.id}>{char.name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold">Notas GM / Combate (Opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Iniciativa, imunidades, CA estimada ou lembretes rápidos..."
              rows={3}
              className="medieval-input resize-none py-1.5"
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-medieval-gold/15 mt-4 shrink-0">
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
              className="btn-gold py-1.5 px-4 text-xs flex items-center space-x-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Gravando...</span>
                </>
              ) : (
                <span>{tokenToEdit ? 'Atualizar Token' : 'Salvar Token'}</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};
