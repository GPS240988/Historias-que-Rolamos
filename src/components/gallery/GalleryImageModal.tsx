import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Media } from '../../types';
import { useCampaign } from '../../contexts/CampaignContext';
import { MediaService } from '../../services/media';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Calendar, Tag, Users, Film, Edit3, Image as ImageIcon, Shield } from 'lucide-react';

interface GalleryImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageToEdit?: Media; // If provided, editing metadata.
}

export const GalleryImageModal: React.FC<GalleryImageModalProps> = ({ isOpen, onClose, imageToEdit }) => {
  const { campaign } = useCampaign();

  // Load characters and memories for linkage dropdowns
  const characters = useLiveQuery(() => campaign ? db.characters.where('campaignId').equals(campaign.id).toArray() : [], [campaign?.id]) || [];
  const memories = useLiveQuery(() => campaign ? db.memories.where('campaignId').equals(campaign.id).toArray() : [], [campaign?.id]) || [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD
  const [relatedChar, setRelatedChar] = useState('');
  const [relatedMem, setRelatedMem] = useState('');

  const [file, setFile] = useState<File | undefined>(undefined);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize form and pre-load existing image preview
  useEffect(() => {
    const init = async () => {
      if (imageToEdit) {
        setTitle(imageToEdit.title || '');
        setDescription(imageToEdit.description || '');
        setTagsText(imageToEdit.tags?.join(', ') || '');
        setEventDate(imageToEdit.eventDate?.substring(0, 10) || new Date().toISOString().substring(0, 10));
        setRelatedChar(imageToEdit.relatedCharacterId || '');
        setRelatedMem(imageToEdit.relatedMemoryId || '');
        setFile(undefined);

        // Pre-load existing image preview
        const url = await MediaService.getMediaUrl(imageToEdit.id);
        setFilePreview(url);
      } else {
        setTitle('');
        setDescription('');
        setTagsText('');
        setEventDate(new Date().toISOString().substring(0, 10));
        setRelatedChar('');
        setRelatedMem('');
        setFilePreview(null);
        setFile(undefined);
      }
      setError(null);
    };

    if (isOpen && campaign) {
      init();
    }
  }, [imageToEdit, isOpen, campaign?.id]);

  // Derive character names linked to the currently selected memory
  const memoryCharacterNames = useMemo(() => {
    if (!relatedMem) return [];
    const memory = memories.find(m => m.id === relatedMem);
    if (!memory?.characterIds?.length) return [];
    return memory.characterIds
      .map(cid => characters.find(c => c.id === cid)?.name)
      .filter(Boolean) as string[];
  }, [relatedMem, memories, characters]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 15 * 1024 * 1024) {
        setError('O arquivo excede o limite de tamanho de 15MB.');
        return;
      }
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setFilePreview(url);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageToEdit && !file) {
      setError('Escolha um arquivo de imagem para enviar.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tags = tagsText
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const updates = {
        title: title.trim(),
        description: description.trim(),
        tags,
        eventDate: new Date(eventDate).toISOString(),
        relatedCharacterId: relatedChar || undefined,
        relatedMemoryId: relatedMem || undefined,
        isGallery: true
      };

      if (imageToEdit) {
        // Just update metadata
        await db.media.update(imageToEdit.id, updates);
      } else if (file) {
        // Upload new image and save with details (marked as gallery)
        const mediaId = await MediaService.saveMedia(file, campaign!.id, true);
        await db.media.update(mediaId, updates);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar imagem na galeria.');
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
            {imageToEdit ? 'Editar Detalhes da Imagem' : 'Adicionar Arte de Campanha'}
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
          {/* Image Preview (when editing existing) */}
          {imageToEdit && filePreview && (
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Imagem Atual</span>
              </label>
              <div className="w-full aspect-video rounded border border-medieval-gold/30 overflow-hidden bg-medieval-stone/50">
                <img
                  src={filePreview}
                  alt={imageToEdit.title || 'Imagem da galeria'}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* File Selector (Only when creating) */}
          {!imageToEdit && (
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Escolher Arquivo</span>
              </label>
              <div className="flex items-center space-x-4">
                <label className="btn-stone cursor-pointer py-1.5 px-3 text-xs flex items-center space-x-2">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Selecionar Imagem</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
                {file && (
                  <span className="text-xs text-medieval-silver truncate max-w-[200px]">
                    {file.name}
                  </span>
                )}
              </div>

              {filePreview && (
                <div className="mt-2 w-full aspect-video rounded border border-medieval-gold/30 overflow-hidden bg-medieval-stone/50">
                  <img
                    src={filePreview}
                    alt="Prévia do Envio"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <Edit3 className="w-3.5 h-3.5" />
              <span>Título da Ilustração</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Ruínas de Valkaria, O Dragão da Tormenta"
              className="medieval-input py-1.5"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold">Legenda / Relato de Cenário</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que esta cena retrata nas memórias..."
              rows={3}
              className="medieval-input resize-none py-1.5"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Event Date */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Data do Registro</span>
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="medieval-input py-1.5"
                disabled={loading}
              />
            </div>

            {/* Tags */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5" />
                <span>Etiquetas</span>
              </label>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="Cenário, NPC, Combate, Item"
                className="medieval-input py-1.5"
                disabled={loading}
              />
            </div>
          </div>

          {/* Linkage dropdowns */}
          <div className="p-3 bg-medieval-stone/40 border border-medieval-gold/10 rounded space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Related Character */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Herói Marcado</span>
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

              {/* Related Memory */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                  <Film className="w-3.5 h-3.5" />
                  <span>Memória Relacionada</span>
                </label>
                <select
                  value={relatedMem}
                  onChange={(e) => setRelatedMem(e.target.value)}
                  className="medieval-input py-1.5 bg-medieval-stone"
                  disabled={loading}
                >
                  <option value="">(Nenhuma)</option>
                  {memories.map(mem => (
                    <option key={mem.id} value={mem.id}>{mem.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Characters associated with the selected memory */}
            {memoryCharacterNames.length > 0 && (
              <div className="flex items-start gap-2 p-2 bg-medieval-darkGold/10 border border-medieval-gold/20 rounded text-xs">
                <Shield className="w-4 h-4 text-medieval-gold flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-medieval-gold font-medieval">Heróis nesta memória:</span>
                  <span className="text-medieval-silver ml-1">{memoryCharacterNames.join(', ')}</span>
                </div>
              </div>
            )}
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
              className="btn-gold py-1.5 px-4 text-xs"
              disabled={loading}
            >
              {loading ? 'Gravando...' : imageToEdit ? 'Atualizar Detalhes' : 'Salvar Arte'}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};
