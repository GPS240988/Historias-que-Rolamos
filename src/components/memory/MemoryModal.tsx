import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Memory, MemoryCharacter, MemoryType, Media } from '../../types';
import { useCampaign } from '../../contexts/CampaignContext';
import { MediaService } from '../../services/media';
import { db } from '../../db';
import { MemoryRepository } from '../../repositories/MemoryRepository';
import { MemoryCharacterRepository } from '../../repositories/MemoryCharacterRepository';
import { CharacterRepository } from '../../repositories/CharacterRepository';
import { MediaRepository } from '../../repositories/MediaRepository';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Calendar, Edit3, Tag, Users, Plus, Image as ImageIcon } from 'lucide-react';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memoryToEdit?: Memory;
}

const MEMORY_TYPES = [
  "Batalha",
  "Vitória",
  "Derrota",
  "Descoberta",
  "Relacionamento",
  "Tragédia",
  "Conquista",
  "Interpretação",
  "Exploração",
  "Conhecimento",
  "Momento Engraçado",
  "Momento Lendário"
];

export const MemoryModal: React.FC<MemoryModalProps> = ({ isOpen, onClose, memoryToEdit }) => {
  const { campaign } = useCampaign();
  const { confirm } = useConfirmation();

  // Load all characters to select in checklist
  const allCharacters = useLiveQuery(() => campaign ? db.characters.where('campaignId').equals(campaign.id).toArray() : [], [campaign?.id]) || [];

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD
  const [type, setType] = useState('Interpretação');
  const [description, setDescription] = useState('');
  const [heroDescriptions, setHeroDescriptions] = useState<Record<string, string>>({});
  const [tagsText, setTagsText] = useState('');

  // Track selected characters and their level up info
  const [selectedChars, setSelectedChars] = useState<Record<string, { selected: boolean; levelUp: boolean; level: number }>>({});

  const [coverFile, setCoverFile] = useState<File | undefined>(undefined);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Additional photos states
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<Media[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize form
  useEffect(() => {
    const initForm = async () => {
      if (memoryToEdit) {
        setTitle(memoryToEdit.title);
        setEventDate(memoryToEdit.eventDate.substring(0, 10));
        setType(memoryToEdit.type);
        setDescription(memoryToEdit.description);
        setHeroDescriptions(memoryToEdit.heroDescriptions || {});
        setTagsText(memoryToEdit.tags.join(', '));

        // Fetch existing relations for this memory
        const existingRelations = await db.memoryCharacters.where('memoryId').equals(memoryToEdit.id).toArray();
        const initialSelected: Record<string, { selected: boolean; levelUp: boolean; level: number }> = {};

        // Pre-fill existing linked characters
        allCharacters.forEach(char => {
          const rel = existingRelations.find(r => r.characterId === char.id);
          if (rel) {
            initialSelected[char.id] = {
              selected: true,
              level: rel.levelReached || char.level,
              levelUp: rel.levelReached !== undefined
            };
          } else {
            initialSelected[char.id] = {
              selected: false,
              levelUp: false,
              level: char.level
            };
          }
        });
        setSelectedChars(initialSelected);

        // Load existing cover image if it exists
        if (memoryToEdit.imageId) {
          const existingImageUrl = await MediaService.getMediaUrl(memoryToEdit.imageId);
          setCoverPreview(existingImageUrl);
        } else {
          setCoverPreview(null);
        }
        setCoverFile(undefined);

        // Load existing photos linked to this memory
        const photos = await db.media.where('campaignId').equals(campaign!.id).filter(m => m.relatedMemoryId === memoryToEdit.id).toArray();
        setExistingPhotos(photos);
        setPhotoFiles([]);
        setPhotoPreviews([]);
      } else {
        setTitle('');
        setEventDate(new Date().toISOString().substring(0, 10));
        setType('Interpretação');
        setDescription('');
        setHeroDescriptions({});
        setTagsText('');

        const initialSelected: Record<string, { selected: boolean; levelUp: boolean; level: number }> = {};
        allCharacters.forEach(char => {
          initialSelected[char.id] = {
            selected: false,
            levelUp: false,
            level: char.level + 1 // default next level guess
          };
        });
        setSelectedChars(initialSelected);
        setCoverPreview(null);
        setCoverFile(undefined);
        setExistingPhotos([]);
        setPhotoFiles([]);
        setPhotoPreviews([]);
      }
    };

    initForm();
  }, [memoryToEdit, isOpen, allCharacters.length]);

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

  const handleCharSelectToggle = (charId: string) => {
    setSelectedChars(prev => {
      const current = prev[charId] || { selected: false, levelUp: false, level: 1 };
      return {
        ...prev,
        [charId]: {
          ...current,
          selected: !current.selected
        }
      };
    });
  };

  const handleCharLevelUpToggle = (charId: string) => {
    setSelectedChars(prev => {
      const current = prev[charId] || { selected: false, levelUp: false, level: 1 };
      return {
        ...prev,
        [charId]: {
          ...current,
          levelUp: !current.levelUp
        }
      };
    });
  };

  const handleCharLevelChange = (charId: string, value: number) => {
    setSelectedChars(prev => {
      const current = prev[charId] || { selected: false, levelUp: false, level: 1 };
      return {
        ...prev,
        [charId]: {
          ...current,
          level: value
        }
      };
    });
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => {
      if (f.size > 15 * 1024 * 1024) {
        setError(`O arquivo ${f.name} excede o limite de tamanho de 15MB.`);
        return false;
      }
      return true;
    });

    setPhotoFiles(prev => [...prev, ...validFiles]);
    const urls = validFiles.map(f => URL.createObjectURL(f));
    setPhotoPreviews(prev => [...prev, ...urls]);
  };

  const handleRemoveNewPhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingPhoto = async (photoId: string) => {
    const confirmed = await confirm({
      title: 'Excluir Foto',
      message: 'Excluir esta foto vinculada? Isso a apagará permanentemente.',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      isDestructive: true,
    });
    if (!confirmed) return;
    try {
      await MediaService.deleteMedia(photoId);
      setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err: any) {
      setError('Erro ao deletar imagem existente: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('O título do acontecimento é obrigatório.');
      return;
    }
    if (!description.trim()) {
      setError('A descrição narrativa é obrigatória.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tags = tagsText.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      let imageId = memoryToEdit?.imageId;

      if (coverFile) {
        if (memoryToEdit?.imageId) {
          await MediaService.deleteMedia(memoryToEdit.imageId);
        }
        imageId = await MediaService.saveMedia(coverFile, campaign!.id, true);
      }

      const memoryId = memoryToEdit?.id || crypto.randomUUID();

      // Save additional photos if selected
      for (const file of photoFiles) {
        const mediaId = await MediaService.saveMedia(file, campaign!.id, true);
        const mediaRecord = await MediaRepository.get(mediaId);
        if (mediaRecord) {
          mediaRecord.relatedMemoryId = memoryId;
          await MediaRepository.save(mediaRecord);
        }
      }

      const memoryData: Memory = {
        id: memoryId,
        campaignId: campaign!.id,
        title: title.trim(),
        eventDate: new Date(eventDate).toISOString(),
        type: type as MemoryType,
        description: description.trim(),
        heroDescriptions,
        tags: tags,
        characterIds: Object.keys(selectedChars).filter(id => selectedChars[id].selected),
        imageId,
        createdAt: memoryToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: memoryToEdit?.comments
      };

      await MemoryRepository.save(memoryData);

      // Save character relationships
      const existingRels = await MemoryCharacterRepository.list(memoryId);
      for (const rel of existingRels) {
        await MemoryCharacterRepository.delete(rel.id);
      }

      // Add updated relationships
      const relationPromises = Object.keys(selectedChars).map(async (charId) => {
        const state = selectedChars[charId];
        if (state.selected) {
          const charRel: MemoryCharacter = {
            id: crypto.randomUUID(),
            memoryId,
            characterId: charId,
            levelReached: state.levelUp ? state.level : undefined
          };
          await MemoryCharacterRepository.save(charRel);

          if (state.levelUp) {
            const char = await CharacterRepository.get(charId);
            if (char) {
              char.level = state.level;
              await CharacterRepository.save(char);
            }
          }
        }
      });

      await Promise.all(relationPromises);

      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar memória.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !campaign) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="w-full max-w-xl bg-medieval-charcoal grimoire-card border-medieval-gold/30 p-5 md:p-6 relative animate-fade-in max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-medieval-gold/15 pb-3 mb-4 shrink-0">
          <h3 className="text-xl font-medieval text-medieval-gold uppercase tracking-wider">
            {memoryToEdit ? 'Reescrever Memória' : 'Escrever Nova Memória'}
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
          {/* Title */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <Edit3 className="w-3.5 h-3.5" />
              <span>Título do Acontecimento</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: O Resgate do Bispo, O Embate com a Hidra"
              className="medieval-input py-1.5"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Event Date */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Data do Acontecimento</span>
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="medieval-input py-1.5"
                disabled={loading}
              />
            </div>

            {/* Category / Type */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold">Categoria</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="medieval-input py-1.5 bg-medieval-stone"
                disabled={loading}
              >
                {MEMORY_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description Mestre */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold">Relato Narrativo Mestre</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhadamente o que aconteceu neste evento memorável sob a perspectiva do Mestre..."
              rows={4}
              className="medieval-input resize-none py-1.5"
              disabled={loading}
            />
          </div>

          {/* Dynamic Hero Descriptions */}
          {allCharacters
            .filter(char => char.characterType !== 'ally')
            .map(char => (
              <div key={char.id} className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold">
                  Relato Narrativo de {char.name}
                </label>
                <textarea
                  value={heroDescriptions[char.id] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setHeroDescriptions(prev => ({
                      ...prev,
                      [char.id]: val
                    }));
                  }}
                  placeholder={`O que o herói ${char.name} registrou sobre este acontecimento...`}
                  rows={3}
                  className="medieval-input resize-none py-1.5"
                  disabled={loading}
                />
              </div>
            ))}

          {/* Etiquetas */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5" />
              <span>Etiquetas</span>
            </label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="Ex: Combate, Lendário, Boss, Mistério (Separadas por vírgula)"
              className="medieval-input py-1.5"
              disabled={loading}
            />
          </div>

          {/* Participating Protagonists */}
          <div className="flex flex-col space-y-1.5 p-3 bg-medieval-stone/40 border border-medieval-gold/10 rounded">
            <span className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-medieval-gold" />
              <span>Heróis Participantes</span>
            </span>

            {allCharacters.length === 0 ? (
              <span className="text-xs text-medieval-silver/50 italic">Nenhum herói registrado no grimório.</span>
            ) : (
              <div className="space-y-2 mt-1 divide-y divide-medieval-gold/5 max-h-36 overflow-y-auto pr-1">
                {allCharacters.map(char => {
                  const state = selectedChars[char.id] || { selected: false, levelUp: false, level: char.level };
                  return (
                    <div key={char.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 first:pt-0 gap-2">
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={state.selected}
                          onChange={() => handleCharSelectToggle(char.id)}
                          className="rounded text-medieval-gold bg-medieval-charcoal border-medieval-gold/30 focus:ring-0 focus:ring-offset-0"
                        />
                        <span className="text-xs font-medium text-medieval-parchment">{char.name}</span>
                        <span className="text-[10px] text-medieval-silver">({char.class} Nível {char.level})</span>
                      </label>

                      {state.selected && (
                        <div className="flex items-center space-x-4 pl-6 sm:pl-0">
                          <label className="flex items-center space-x-1 cursor-pointer select-none text-[10px] text-medieval-gold">
                            <input
                              type="checkbox"
                              checked={state.levelUp}
                              onChange={() => handleCharLevelUpToggle(char.id)}
                              className="rounded text-medieval-gold bg-medieval-charcoal border-medieval-gold/30 focus:ring-0 focus:ring-offset-0"
                            />
                            <span>Subiu de Nível?</span>
                          </label>

                          {state.levelUp && (
                            <div className="flex items-center space-x-1">
                              <span className="text-[9px] text-medieval-silver font-serif">Nível:</span>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={state.level}
                                onChange={(e) => handleCharLevelChange(char.id, Number(e.target.value))}
                                className="w-10 text-center py-0.5 text-[10px] bg-medieval-charcoal border border-medieval-gold/30 text-medieval-gold rounded focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cover image */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Ilustração da Memória (Opcional)</span>
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
              {coverFile && (
                <span className="text-xs text-medieval-silver truncate max-w-[200px]">
                  {coverFile.name}
                </span>
              )}
            </div>

            {coverPreview && (
              <div className="mt-2 w-full h-28 rounded border border-medieval-gold/30 overflow-hidden">
                <img
                  src={coverPreview}
                  alt="Prévia da Ilustração"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Imagens/Fotos adicionais da Memória */}
          <div className="flex flex-col space-y-1.5 p-3 bg-medieval-stone/40 border border-medieval-gold/10 rounded">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Fotos e Imagens Vinculadas</span>
            </label>

            <div className="flex items-center space-x-4">
              <label className="btn-stone cursor-pointer py-1.5 px-3 text-xs flex items-center space-x-2">
                <Plus className="w-3.5 h-3.5" />
                <span>Anexar Imagens</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotosChange}
                  className="hidden"
                  disabled={loading}
                />
              </label>
              <span className="text-[10px] text-medieval-silver font-serif">
                Selecione uma ou mais fotos para vincular à memória
              </span>
            </div>

            {/* List of existing linked images */}
            {existingPhotos.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <span className="block text-[10px] uppercase font-medieval text-medieval-gold">Fotos Existentes</span>
                <div className="grid grid-cols-4 gap-2">
                  {existingPhotos.map(photo => (
                    <ExistingPhotoThumb
                      key={photo.id}
                      photo={photo}
                      onDelete={() => handleDeleteExistingPhoto(photo.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* List of new photo previews */}
            {photoPreviews.length > 0 && (
              <div className="mt-2 space-y-1.5 border-t border-medieval-gold/5 pt-2">
                <span className="block text-[10px] uppercase font-medieval text-medieval-gold">Novas Fotos a Adicionar ({photoPreviews.length})</span>
                <div className="grid grid-cols-4 gap-2">
                  {photoPreviews.map((url, idx) => (
                    <div key={idx} className="relative aspect-square border border-medieval-gold/20 rounded overflow-hidden group">
                      <img src={url} alt="Nova prévia" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewPhoto(idx)}
                        className="absolute top-1 right-1 bg-red-950/80 border border-red-500/30 text-red-200 rounded p-0.5 hover:bg-red-900 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
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
              className="btn-gold py-1.5 px-4 text-xs flex items-center space-x-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Entalhando na Pedra...</span>
                </>
              ) : (
                <span>{memoryToEdit ? 'Atualizar Memória' : 'Gravar Memória'}</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};

// Existing photo thumbnail helper component
const ExistingPhotoThumb: React.FC<{ photo: Media; onDelete: () => void }> = ({ photo, onDelete }) => {
  const url = useMediaUrl(photo.id, true); // load thumbnail
  return (
    <div className="relative aspect-square border border-medieval-gold/20 rounded overflow-hidden group">
      {url ? (
        <img src={url} alt="Foto vinculada" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-medieval-charcoal flex items-center justify-center text-[10px]">Lendo...</div>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="absolute top-1 right-1 bg-red-950/80 border border-red-500/30 text-red-200 rounded p-0.5 hover:bg-red-900 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
