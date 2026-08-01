import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Character } from '../../types';
import { useCampaign } from '../../contexts/CampaignContext';
import { MediaService } from '../../services/media';
import { db } from '../../db';
import { X, User, Image as ImageIcon, FileText, Download } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize form
  useEffect(() => {
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
      setCoverPreview(null);
      setCoverFile(undefined);
      setSheetPreview(null);
      setSheetFile(undefined);
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
    }
    setError(null);
  }, [characterToEdit, isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome do herói é obrigatório.');
      return;
    }
    if (!charClass.trim()) {
      setError('A classe do herói é obrigatória.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let imageId = characterToEdit?.imageId;
      let sheetMediaId = characterToEdit?.sheetMediaId;

      // Upload new avatar if present
      if (coverFile) {
        if (characterToEdit?.imageId) {
          await MediaService.deleteMedia(characterToEdit.imageId);
        }
        imageId = await MediaService.saveMedia(coverFile, campaign!.id);
      }

      // Upload new character sheet if present
      if (sheetFile) {
        if (characterToEdit?.sheetMediaId) {
          await MediaService.deleteMedia(characterToEdit.sheetMediaId);
        }
        sheetMediaId = await MediaService.saveMedia(sheetFile, campaign!.id, false);
      }

      if (characterToEdit) {
        // Update character dossier
        await db.characters.update(characterToEdit.id, {
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
        // Insert new character
        const newChar: any = {
          id: crypto.randomUUID(),
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
          notes,
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

        {/* Header */}
        <div className="flex items-center justify-between border-b border-medieval-gold/15 pb-3 mb-4 shrink-0">
          <h3 className="text-xl font-medieval text-medieval-gold uppercase tracking-wider">
            {characterToEdit ? 'Editar Dossiê de Herói' : 'Registrar Novo Herói'}
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

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 -mr-1 scrollbar-thin space-y-4 font-serif text-sm">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
                <User className="w-3.5 h-3.5" />
                <span>Nome do Herói</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Arkon"
                className="medieval-input py-1.5"
                disabled={loading}
              />
            </div>

            {/* Player Name */}
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold">Jogador(a)</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ex: Gabriel"
                className="medieval-input py-1.5"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Race & Class in same row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Race */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold">Raça</label>
                <input
                  type="text"
                  value={race}
                  onChange={(e) => setRace(e.target.value)}
                  placeholder="Ex: Humano"
                  className="medieval-input py-1.5"
                  disabled={loading}
                />
              </div>

              {/* Class */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold">Classe</label>
                <input
                  type="text"
                  value={charClass}
                  onChange={(e) => setCharClass(e.target.value)}
                  placeholder="Ex: Guerreiro"
                  className="medieval-input py-1.5"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Origin & Level in same row (swapped order) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Origin */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold">Origem</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Ex: Guarda da Cidade"
                  className="medieval-input py-1.5"
                  disabled={loading}
                />
              </div>

              {/* Level */}
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-medieval text-medieval-gold">Nível</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="medieval-input py-1.5"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* PV & PM metrics setup */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold">Pontos de Vida (PV Máx)</label>
              <input
                type="number"
                min={1}
                value={hp}
                onChange={(e) => setHp(Number(e.target.value))}
                className="medieval-input py-1.5"
                disabled={loading}
              />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-medieval text-medieval-gold">Pontos de Mana (PM Máx)</label>
              <input
                type="number"
                min={0}
                value={mp}
                onChange={(e) => setMp(Number(e.target.value))}
                className="medieval-input py-1.5"
                disabled={loading}
              />
            </div>
          </div>

          {/* Concept summary */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold">Frase de Efeito ou Conceito Rápido</label>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder='Ex: "Uma espada firme protege a alma dos fracos"'
              className="medieval-input py-1.5"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold">História Geral / Biografia Pública</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva as origens, feitos marcantes conhecidos e objetivos de campanha deste herói..."
              rows={3}
              className="medieval-input resize-none py-1.5"
              disabled={loading}
            />
          </div>

          {/* Notes / GM Secrets */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-wine">Notas de Campanha e Segredos (GM)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas secretas, itens importantes, conexões com mistérios da campanha..."
              rows={2}
              className="medieval-input resize-none py-1.5"
              disabled={loading}
            />
          </div>

          {/* Portrait Image Upload */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Retrato / Avatar</span>
            </label>

            <div className="flex items-center space-x-4">
              <label className="btn-stone cursor-pointer py-1.5 px-3 text-xs flex items-center space-x-2">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Enviar Retrato</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={loading}
                />
              </label>
              {coverFile && (
                <span className="text-xs text-medieval-silver truncate max-w-[220px]">
                  {coverFile.name}
                </span>
              )}
            </div>

            {coverPreview && (
              <div className="mt-2 w-24 h-24 rounded border border-medieval-gold/30 overflow-hidden">
                <img
                  src={coverPreview}
                  alt="Prévia do Retrato"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Character Sheet Upload */}
          <div className="flex flex-col space-y-1">
            <label className="text-xs font-medieval text-medieval-gold flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Ficha do Personagem</span>
            </label>

            <div className="flex items-center space-x-4">
              <label className="btn-stone cursor-pointer py-1.5 px-3 text-xs flex items-center space-x-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Anexar Ficha (PDF/Imagem)</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
                  onChange={handleSheetChange}
                  className="hidden"
                  disabled={loading}
                />
              </label>
              {sheetFile && (
                <span className="text-xs text-medieval-silver truncate max-w-[220px]">
                  {sheetFile.name}
                </span>
              )}
            </div>

            {sheetPreview && (
              <div className="mt-2 flex items-center space-x-2 p-2 bg-medieval-stone/30 border border-medieval-gold/20 rounded">
                <FileText className="w-5 h-5 text-medieval-gold flex-shrink-0" />
                <span className="text-xs text-medieval-silver flex-1 truncate">
                  {sheetFile?.name}
                </span>
                <a
                  href={sheetPreview}
                  download={sheetFile?.name}
                  className="text-medieval-gold hover:text-medieval-brightGold transition-colors"
                  title="Baixar ficha"
                >
                  <Download className="w-4 h-4" />
                </a>
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
              {loading ? 'Gravando nos Pergaminhos...' : characterToEdit ? 'Atualizar Dossiê' : 'Registrar Herói'}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};
