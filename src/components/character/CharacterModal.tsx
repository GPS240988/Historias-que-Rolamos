import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Character, CharacterEvolution, Media, Memory } from '../../types';
import { useCampaign } from '../../contexts/CampaignContext';
import { MediaService } from '../../services/media';
import { db } from '../../db';
import { X, User, Image as ImageIcon, FileText, Download, Plus, MessageSquare, ScrollText, Trash2, BookOpen, Edit3 } from 'lucide-react';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterToEdit?: Character;
}

type ActiveTab = 'ficha' | 'evolucoes';

export const CharacterModal: React.FC<CharacterModalProps> = ({ isOpen, onClose, characterToEdit }) => {
  const { campaign } = useCampaign();
  const { confirm } = useConfirmation();

  const [activeTab, setActiveTab] = useState<ActiveTab>('ficha');

  const [name, setName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [characterType, setCharacterType] = useState<'hero' | 'ally'>('hero');
  const [race, setRace] = useState('');
  const [origin, setOrigin] = useState('');
  const [charClass, setCharClass] = useState('');
  const [level, setLevel] = useState(1);
  const [hp, setHp] = useState(12);
  const [mp, setMp] = useState(6);
  const [concept, setConcept] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const [coverFile, setCoverFile] = useState<File | undefined>(undefined);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [sheetFile, setSheetFile] = useState<File | undefined>(undefined);
  const [sheetPreview, setSheetPreview] = useState<string | null>(null);

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<Media[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [evolutions, setEvolutions] = useState<CharacterEvolution[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [evoComment, setEvoComment] = useState('');
  const [evoMemoryId, setEvoMemoryId] = useState('');
  const [evoAuthor, setEvoAuthor] = useState('');
  const [evoDate, setEvoDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [evoVisibleCount, setEvoVisibleCount] = useState(5);
  const [editingEvo, setEditingEvo] = useState<CharacterEvolution | null>(null);
  const [deleteConfirmEvoId, setDeleteConfirmEvoId] = useState<string | null>(null);

  useEffect(() => {
    const initForm = async () => {
      setActiveTab('ficha');

      if (characterToEdit) {
        setName(characterToEdit.name);
        setPlayerName(characterToEdit.playerName);
        setCharacterType(characterToEdit.characterType);
        setRace(characterToEdit.race);
        setOrigin(characterToEdit.origin);
        setCharClass(characterToEdit.class);
        setLevel(characterToEdit.level);
        setHp(characterToEdit.hp);
        setMp(characterToEdit.mp);
        setConcept(characterToEdit.concept || '');
        setDescription(characterToEdit.description || '');
        setNotes(characterToEdit.notes || '');
        setCoverFile(undefined);
        setSheetFile(undefined);

        if (characterToEdit.imageId) {
          const url = await MediaService.getMediaUrl(characterToEdit.imageId);
          setCoverPreview(url);
        } else {
          setCoverPreview(null);
        }

        if (characterToEdit.sheetMediaId) {
          const url = await MediaService.getMediaUrl(characterToEdit.sheetMediaId);
          setSheetPreview(url);
        } else {
          setSheetPreview(null);
        }

        const photos = await db.media
          .where('campaignId')
          .equals(campaign!.id)
          .filter(m => m.relatedCharacterId === characterToEdit.id)
          .toArray();
        setExistingPhotos(photos);
        setPhotoFiles([]);
        setPhotoPreviews([]);

        setEvolutions(characterToEdit.evolutions || []);
      } else {
        setName('');
        setPlayerName('');
        setCharacterType('hero');
        setRace('');
        setOrigin('');
        setCharClass('');
        setLevel(1);
        setHp(12);
        setMp(6);
        setConcept('');
        setDescription('');
        setNotes('');
        setCoverPreview(null);
        setCoverFile(undefined);
        setSheetPreview(null);
        setSheetFile(undefined);
        setExistingPhotos([]);
        setPhotoFiles([]);
        setPhotoPreviews([]);
        setEvolutions([]);
      }

      if (campaign) {
        const campaignMemories = await db.memories
          .where('campaignId')
          .equals(campaign.id)
          .toArray();
        setMemories(campaignMemories.sort((a, b) => b.eventDate.localeCompare(a.eventDate)));

        const campaignChars = await db.characters
          .where('campaignId')
          .equals(campaign.id)
          .toArray();
        setAllCharacters(campaignChars.sort((a, b) => a.name.localeCompare(b.name)));
      }

      setEvoComment('');
      setEvoMemoryId('');
      setEvoAuthor('');
      setEvoDate(new Date().toISOString().substring(0, 10));
      setEditingEvo(null);
      setDeleteConfirmEvoId(null);
      setError(null);
    };

    if (isOpen && campaign) {
      initForm();
    }
  }, [characterToEdit, isOpen, campaign?.id]);

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

  const handleSheetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setError('O arquivo da ficha excede o limite de tamanho de 15MB.');
        return;
      }
      setSheetFile(file);
      const url = URL.createObjectURL(file);
      setSheetPreview(url);
      setError(null);
    }
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

  const saveEvolutionsToDb = async (updatedEvolutions: CharacterEvolution[]) => {
    setEvolutions(updatedEvolutions);
    if (characterToEdit) {
      try {
        const currentChar = await db.characters.get(characterToEdit.id);
        if (currentChar) {
          await db.characters.put({
            ...currentChar,
            evolutions: updatedEvolutions,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        setError('Erro ao salvar no banco de dados: ' + err.message);
      }
    }
  };

  const handleAddEvolution = async () => {
    if (!evoComment.trim()) {
      setError('O comentário da evolução não pode estar vazio.');
      return;
    }
    if (!evoAuthor.trim()) {
      setError('Selecione quem está fazendo o comentário.');
      return;
    }

    if (editingEvo) {
      const updated = evolutions.map(e =>
        e.id === editingEvo.id
          ? {
            ...e,
            date: evoDate,
            comment: evoComment.trim(),
            author: evoAuthor.trim(),
            memoryId: evoMemoryId || undefined,
          }
          : e
      );
      await saveEvolutionsToDb(updated);
      setEditingEvo(null);
    } else {
      const entry: CharacterEvolution = {
        id: crypto.randomUUID(),
        date: evoDate,
        comment: evoComment.trim(),
        author: evoAuthor.trim(),
        memoryId: evoMemoryId || undefined,
      };
      const updated = [entry, ...evolutions];
      await saveEvolutionsToDb(updated);
    }

    setEvoComment('');
    setEvoMemoryId('');
    setEvoAuthor('');
    setEvoDate(new Date().toISOString().substring(0, 10));
    setError(null);
  };

  const handleEditEvolution = (evo: CharacterEvolution) => {
    setEditingEvo(evo);
    setEvoComment(evo.comment);
    setEvoAuthor(evo.author);
    setEvoDate(evo.date);
    setEvoMemoryId(evo.memoryId || '');
    setError(null);
  };

  const handleCancelEditEvolution = () => {
    setEditingEvo(null);
    setEvoComment('');
    setEvoMemoryId('');
    setEvoAuthor('');
    setEvoDate(new Date().toISOString().substring(0, 10));
    setError(null);
  };

  const handleDeleteEvolution = async (evoId: string) => {
    const updated = evolutions.filter(e => e.id !== evoId);
    await saveEvolutionsToDb(updated);
    setDeleteConfirmEvoId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome do personagem é obrigatório.');
      return;
    }
    if (!race.trim()) {
      setError('A raça do personagem é obrigatória.');
      return;
    }
    if (!origin.trim()) {
      setError('A origem do personagem é obrigatória.');
      return;
    }
    if (!charClass.trim()) {
      setError('A classe do personagem é obrigatória.');
      return;
    }
    if (!characterType) {
      setError('Selecione o tipo do personagem (Herói ou Aliado).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const characterId = characterToEdit?.id || crypto.randomUUID();
      let imageId = characterToEdit?.imageId;
      let sheetMediaId = characterToEdit?.sheetMediaId;

      if (coverFile) {
        if (characterToEdit?.imageId) {
          await MediaService.deleteMedia(characterToEdit.imageId);
        }
        imageId = await MediaService.saveMedia(coverFile, campaign!.id);
      }

      if (sheetFile) {
        if (characterToEdit?.sheetMediaId) {
          await MediaService.deleteMedia(characterToEdit.sheetMediaId);
        }
        sheetMediaId = await MediaService.saveMedia(sheetFile, campaign!.id, false);
      }

      for (const file of photoFiles) {
        const mediaId = await MediaService.saveMedia(file, campaign!.id, true);
        await db.media.update(mediaId, { relatedCharacterId: characterId });
      }

      if (characterToEdit) {
        await db.characters.put({
          id: characterToEdit.id,
          campaignId: characterToEdit.campaignId,
          name,
          playerName,
          characterType,
          race,
          origin,
          class: charClass,
          level,
          hp,
          mp,
          concept,
          description,
          notes,
          imageId,
          sheetMediaId,
          evolutions,
          createdAt: characterToEdit.createdAt,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const newChar: any = {
          id: characterId,
          campaignId: campaign!.id,
          name,
          playerName,
          characterType,
          race,
          origin,
          class: charClass,
          level,
          hp,
          mp,
          concept,
          description,
          notes: notes.trim() || undefined,
          imageId,
          sheetMediaId,
          evolutions,
          createdAt: new Date().toISOString(),
        };
        await db.characters.add(newChar);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar herói.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !campaign) return null;

  const isEditing = !!characterToEdit;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="w-full max-w-xl bg-medieval-charcoal grimoire-card border-medieval-gold/30 relative animate-fade-in max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between border-b border-medieval-gold/15 px-5 md:px-6 pt-5 pb-3 shrink-0">
          <h3 className="text-xl font-medieval text-medieval-gold uppercase tracking-wider">
            {isEditing ? 'Editar Dossiê de Herói' : 'Registrar Novo Herói'}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-medieval-stone text-medieval-silver hover:text-medieval-gold transition-all duration-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-medieval-gold/15 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('ficha')}
            className={`flex items-center space-x-1.5 px-5 py-2.5 text-xs font-medieval uppercase tracking-wider transition-all border-b-2 ${activeTab === 'ficha'
              ? 'border-medieval-gold text-medieval-gold bg-medieval-gold/5'
              : 'border-transparent text-medieval-silver/60 hover:text-medieval-silver hover:bg-medieval-stone/20'
              }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Ficha de Herói</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('evolucoes')}
            className={`flex items-center space-x-1.5 px-5 py-2.5 text-xs font-medieval uppercase tracking-wider transition-all border-b-2 ${activeTab === 'evolucoes'
              ? 'border-medieval-gold text-medieval-gold bg-medieval-gold/5'
              : 'border-transparent text-medieval-silver/60 hover:text-medieval-silver hover:bg-medieval-stone/20'
              }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Evolução & Comentários</span>
            {evolutions.length > 0 && (
              <span className="ml-1 text-[9px] bg-medieval-gold/20 border border-medieval-gold/30 text-medieval-gold rounded-full px-1.5 py-0.5 font-serif">
                {evolutions.length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 p-3 bg-medieval-wine/20 border border-medieval-wine/50 rounded text-red-300 text-sm font-serif shrink-0">
            {error}
          </div>
        )}

        {activeTab === 'ficha' && (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 md:px-6 py-4 pr-1 -mr-1 scrollbar-thin space-y-4 font-serif text-sm">

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold">
                Tipo <span className="text-medieval-wine">*</span>
              </label>
              <select
                value={characterType}
                onChange={(e) => setCharacterType(e.target.value as 'hero' | 'ally')}
                className="medieval-input py-1.5 bg-medieval-stone"
                disabled={loading}
              >
                <option value="hero">Herói</option>
                <option value="ally">Aliado</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Nome do Personagem</span>
                </label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Arkon" className="medieval-input py-1.5" disabled={loading} />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold">Jogador(a)</label>
                <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Ex: Gabriel" className="medieval-input py-1.5" disabled={loading} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold">Raça <span className="text-medieval-wine">*</span></label>
                <input type="text" value={race} onChange={(e) => setRace(e.target.value)} placeholder="Ex: Humano" className="medieval-input py-1.5" disabled={loading} />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold">Classe <span className="text-medieval-wine">*</span></label>
                <input type="text" value={charClass} onChange={(e) => setCharClass(e.target.value)} placeholder="Ex: Guerreiro" className="medieval-input py-1.5" disabled={loading} />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold">Origem <span className="text-medieval-wine">*</span></label>
                <input type="text" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Ex: Guarda" className="medieval-input py-1.5" disabled={loading} />
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold">Nível</label>
                <input type="number" min={1} max={20} value={level} onChange={(e) => setLevel(Number(e.target.value))} className="medieval-input py-1.5" disabled={loading} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold">Pontos de Vida (PV Máx)</label>
                <input type="number" min={1} value={hp} onChange={(e) => setHp(Number(e.target.value))} className="medieval-input py-1.5" disabled={loading} />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold">Pontos de Mana (PM Máx)</label>
                <input type="number" min={0} value={mp} onChange={(e) => setMp(Number(e.target.value))} className="medieval-input py-1.5" disabled={loading} />
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold">Frase de Efeito ou Conceito Rápido</label>
              <input type="text" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder='Ex: "Uma espada firme protege a alma dos fracos"' className="medieval-input py-1.5" disabled={loading} />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold">História Geral / Biografia Pública</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva as origens, feitos marcantes conhecidos e objetivos de campanha deste herói..." rows={3} className="medieval-input resize-none py-1.5" disabled={loading} />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Retrato / Avatar</span>
              </label>
              <div className="flex items-center space-x-4">
                <label className="btn-stone cursor-pointer py-1.5 px-3 text-xs flex items-center space-x-2">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Enviar Retrato</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={loading} />
                </label>
                {coverFile ? (
                  <span className="text-xs text-medieval-silver truncate max-w-[220px]">{coverFile.name}</span>
                ) : coverPreview && !coverFile ? (
                  <span className="text-xs text-green-400 italic">Retrato carregado ✓</span>
                ) : null}
              </div>
              {coverPreview && (
                <div className="mt-2 w-24 h-24 rounded border border-medieval-gold/30 overflow-hidden">
                  <img src={coverPreview} alt="Prévia do Retrato" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                <Plus className="w-3.5 h-3.5" />
                <span>Imagens da Campanha</span>
              </label>
              <label className="btn-stone cursor-pointer py-1.5 px-3 text-xs flex items-center space-x-2 w-fit">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Adicionar Imagens</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotosChange} className="hidden" disabled={loading} />
              </label>
              {existingPhotos.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-medieval-silver/70 uppercase tracking-wider">Fotos salvas</span>
                  <div className="flex flex-wrap gap-2">
                    {existingPhotos.map(photo => (
                      <ExistingPhotoThumb key={photo.id} photo={photo} onDelete={handleDeleteExistingPhoto} />
                    ))}
                  </div>
                </div>
              )}
              {photoPreviews.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-medieval-silver/70 uppercase tracking-wider">Novas fotos</span>
                  <div className="flex flex-wrap gap-2">
                    {photoPreviews.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded border border-medieval-gold/30 overflow-hidden group">
                        <img src={url} alt={`Nova foto ${idx + 1}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => handleRemoveNewPhoto(idx)} className="absolute top-0 right-0 bg-red-900/80 text-white rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title="Remover">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5" />
                <span>Arquivos e Fichas</span>
              </label>
              <div className="flex items-center space-x-4">
                <label className="btn-stone cursor-pointer py-1.5 px-3 text-xs flex items-center space-x-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Anexar PDF</span>
                  <input type="file" accept=".pdf" onChange={handleSheetChange} className="hidden" disabled={loading} />
                </label>
                {sheetFile ? (
                  <span className="text-xs text-medieval-silver truncate max-w-[220px]">{sheetFile.name}</span>
                ) : sheetPreview && !sheetFile ? (
                  <span className="text-xs text-green-400 italic">Ficha anexada ✓</span>
                ) : null}
              </div>
              {sheetPreview && (
                <div className="mt-2 flex items-center space-x-2 p-2 bg-medieval-stone/30 border border-medieval-gold/20 rounded">
                  <FileText className="w-5 h-5 text-medieval-gold flex-shrink-0" />
                  <span className="text-xs text-medieval-silver flex-1 truncate">{sheetFile?.name || 'Ficha do Personagem'}</span>
                  <a href={sheetPreview} download={sheetFile?.name || 'ficha-personagem.pdf'} className="text-medieval-gold hover:text-medieval-brightGold transition-colors" title="Baixar ficha">
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-medieval-gold/15 mt-4 shrink-0">
              <button type="button" onClick={onClose} className="btn-stone py-1.5 px-4 text-xs" disabled={loading}>Cancelar</button>
              <button type="submit" className="btn-gold py-1.5 px-4 text-xs flex items-center space-x-2" disabled={loading}>
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Gravando nos Pergaminhos...</span>
                  </>
                ) : (
                  <span>{isEditing ? 'Atualizar Dossiê' : 'Registrar Herói'}</span>
                )}
              </button>
            </div>

          </form>
        )}

        {activeTab === 'evolucoes' && (
          <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4 scrollbar-thin space-y-5 font-serif text-sm">

            <div className="grimoire-card p-4 space-y-3 border border-medieval-gold/20">
              <h4 className="text-xs font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Adicionar Registro</span>
              </h4>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-medieval text-medieval-gold/80 uppercase tracking-wider">Comentário / Evolução</label>
                <textarea
                  value={evoComment}
                  onChange={e => setEvoComment(e.target.value)}
                  placeholder="Descreva o acontecimento, evolução de caráter, habilidade adquirida ou observação de campanha..."
                  rows={3}
                  className="medieval-input resize-none py-1.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-medieval text-medieval-gold/80 uppercase tracking-wider">
                    Quem Comenta <span className="text-medieval-wine">*</span>
                  </label>
                  <select
                    value={evoAuthor}
                    onChange={e => setEvoAuthor(e.target.value)}
                    className="medieval-input py-1.5 text-xs"
                  >
                    <option value="">— Selecione —</option>
                    <option value="Mestre">Mestre</option>
                    {allCharacters.filter(c => c.characterType !== 'ally').map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-medieval text-medieval-gold/80 uppercase tracking-wider flex items-center space-x-1">
                    <BookOpen className="w-3 h-3" />
                    <span>Memória / Aventura</span>
                  </label>
                  <select
                    value={evoMemoryId}
                    onChange={e => setEvoMemoryId(e.target.value)}
                    className="medieval-input py-1.5 text-xs"
                  >
                    <option value="">— Nenhuma —</option>
                    {memories.map(m => (
                      <option key={m.id} value={m.id}>
                        {new Date(m.eventDate).toLocaleDateString('pt-BR')} · {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-medieval text-medieval-gold/80 uppercase tracking-wider">Data do Registro</label>
                <input
                  type="date"
                  value={evoDate}
                  onChange={e => setEvoDate(e.target.value)}
                  className="medieval-input py-1.5 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleAddEvolution}
                className="btn-gold py-1.5 px-4 text-xs flex items-center space-x-1.5"
              >
                {editingEvo ? <Edit3 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{editingEvo ? 'Atualizar Evolução' : 'Gravar Evolução'}</span>
              </button>
              {editingEvo && (
                <button
                  type="button"
                  onClick={handleCancelEditEvolution}
                  className="btn-stone py-1.5 px-4 text-xs"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <div className="space-y-2">
              {evolutions.length === 0 ? (
                <div className="text-center py-8 text-xs text-medieval-silver/50 border border-dashed border-medieval-gold/15 rounded p-4 italic">
                  Nenhum registro de evolução ou comentário ainda.<br />
                  Use o formulário acima para adicionar o primeiro.
                </div>
              ) : (
                <>
                  <span className="text-[10px] font-medieval text-medieval-gold/60 uppercase tracking-wider">
                    {evolutions.length} {evolutions.length === 1 ? 'Registro' : 'Registros'} — ordem decrescente
                  </span>
                  {[...evolutions]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, evoVisibleCount)
                    .map(evo => {
                      const linkedMemory = memories.find(m => m.id === evo.memoryId);
                      return (
                        <div
                          key={evo.id}
                          className="grimoire-card p-3 space-y-1.5 border border-medieval-gold/10 hover:border-medieval-gold/25 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="text-[9px] font-medieval text-medieval-gold bg-medieval-gold/10 border border-medieval-gold/20 px-1.5 py-0.5 rounded">
                                {new Date(evo.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                              {evo.author && (
                                <span className="text-[9px] font-medieval font-bold text-medieval-brightGold bg-medieval-gold/5 border border-medieval-gold/15 px-1.5 py-0.5 rounded">
                                  {evo.author}
                                </span>
                              )}
                              {linkedMemory && (
                                <span className="text-[9px] font-serif italic text-medieval-silver/70 flex items-center space-x-1">
                                  <BookOpen className="w-2.5 h-2.5 text-medieval-gold/50" />
                                  <span>{linkedMemory.title}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditEvolution(evo)}
                                title="Editar registro"
                                className="p-0.5 rounded hover:bg-medieval-gold/20 text-medieval-gold hover:text-medieval-brightGold transition-colors"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmEvoId(evo.id)}
                                title="Excluir registro"
                                className="p-0.5 rounded hover:bg-medieval-wine/30 text-medieval-wine/60 hover:text-medieval-wine transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Delete confirmation */}
                          {deleteConfirmEvoId === evo.id && (
                            <div className="mt-2 p-2 bg-medieval-wine/20 border border-medieval-wine/50 rounded flex items-center justify-between">
                              <span className="text-[10px] text-red-300">Tem certeza?</span>
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEvolution(evo.id)}
                                  className="text-[10px] bg-medieval-wine hover:bg-medieval-wine/80 text-white px-2 py-1 rounded transition-colors"
                                >
                                  Sim, excluir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmEvoId(null)}
                                  className="text-[10px] btn-stone px-2 py-1 rounded transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-medieval-parchment/85 leading-relaxed whitespace-pre-line">
                            {evo.comment}
                          </p>
                        </div>
                      );
                    })}
                </>
              )}
            </div>

            {evolutions.length > evoVisibleCount && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setEvoVisibleCount(prev => prev + 5)}
                  className="btn-stone py-1.5 px-4 text-[10px] text-medieval-gold hover:text-medieval-brightGold transition-colors"
                >
                  Carregar mais ({evolutions.length - evoVisibleCount} restantes)
                </button>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-3 border-t border-medieval-gold/15 mt-2 sticky bottom-0 bg-medieval-charcoal pb-1">
              <button
                type="button"
                onClick={onClose}
                className="btn-gold py-1.5 px-6 text-xs"
                disabled={loading}
              >
                Concluir & Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

const ExistingPhotoThumb: React.FC<{ photo: Media; onDelete: (id: string) => void }> = ({ photo, onDelete }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    MediaService.getMediaUrl(photo.id).then(u => {
      if (!revoked) setUrl(u);
    });
    return () => { revoked = true; };
  }, [photo.id]);

  if (!url) return null;

  return (
    <div className="relative w-16 h-16 rounded border border-medieval-gold/30 overflow-hidden group">
      <img src={url} alt="Foto do personagem" className="w-full h-full object-cover" />
      <button type="button" onClick={() => onDelete(photo.id)} className="absolute top-0 right-0 bg-red-900/80 text-white rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title="Excluir">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};