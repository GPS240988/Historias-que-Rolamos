import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Character, Media } from '../../types';
import { useCampaign } from '../../contexts/CampaignContext';
import { MediaService } from '../../services/media';
import { db } from '../../db';
import { X, User, Image as ImageIcon, FileText, Download, Plus } from 'lucide-react';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterToEdit?: Character;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({ isOpen, onClose, characterToEdit }) => {
  const { campaign } = useCampaign();

  const [name, setName] = useState('');
  const [playerName, setPlayerName] = useState('');
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

  useEffect(() => {
    const initForm = async () => {
      if (characterToEdit) {
        setName(characterToEdit.name);
        setPlayerName(characterToEdit.playerName);
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
      } else {
        setName('');
        setPlayerName('');
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
      }
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
    if (window.confirm('Excluir esta foto vinculada? Isso a apagará permanentemente.')) {
      try {
        await MediaService.deleteMedia(photoId);
        setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
      } catch (err: any) {
        setError('Erro ao deletar imagem existente: ' + err.message);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome do herói é obrigatório.');
      return;
    }
    if (!race.trim()) {
      setError('A raça do herói é obrigatória.');
      return;
    }
    if (!origin.trim()) {
      setError('A origem do herói é obrigatória.');
      return;
    }
    if (!charClass.trim()) {
      setError('A classe do herói é obrigatória.');
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
        await db.characters.update(characterId, {
          name,
          playerName,
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
          sheetMediaId
        });
      } else {
        const newChar: any = {
          id: characterId,
          campaignId: campaign!.id,
          name,
          playerName,
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
          createdAt: new Date().toISOString()
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

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#000000]/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="w-full max-w-xl bg-medieval-charcoal grimoire-card border-medieval-gold/30 p-5 md:p-6 relative animate-fade-in max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between border-b border-medieval-gold/15 pb-3 mb-4 shrink-0">
          <h3 className="text-xl font-medieval text-medieval-gold uppercase tracking-wider">
            {characterToEdit ? 'Editar Dossiê de Herói' : 'Registrar Novo Herói'}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-medieval-stone text-medieval-silver hover:text-medieval-gold transition-colors duration-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-medieval-wine/20 border border-medieval-wine/50 rounded text-red-300 text-sm font-serif shrink-0">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 -mr-1 scrollbar-thin space-y-4 font-serif text-sm">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                <User className="w-3.5 h-3.5" />
                <span>Nome do Herói</span>
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
            <button type="submit" className="btn-gold py-1.5 px-4 text-xs" disabled={loading}>
              {loading ? 'Gravando nos Pergaminhos...' : characterToEdit ? 'Atualizar Dossiê' : 'Registrar Herói'}
            </button>
          </div>

        </form>
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