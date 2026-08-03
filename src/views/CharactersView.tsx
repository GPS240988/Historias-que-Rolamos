import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useSearch } from '../contexts/SearchContext';
import { useRouter } from '../contexts/RouterContext';
import { useCampaign } from '../contexts/CampaignContext';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { CharacterModal } from '../components/character/CharacterModal';
import { MediaService } from '../services/media';
import { useConfirmation } from '../contexts/ConfirmationContext';
import {
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import type { Character } from '../types';

export const CharactersView: React.FC = () => {
  const { searchQuery } = useSearch();
  const { campaign } = useCampaign();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChar, setSelectedChar] = useState<Character | undefined>(undefined);

  // Query characters, reactive to search queries
  const characters = useLiveQuery(async () => {
    if (!campaign) return [];
    const list = await db.characters.where('campaignId').equals(campaign.id).toArray();
    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase().trim();
    return list.filter(char =>
      char.name.toLowerCase().includes(query) ||
      char.class.toLowerCase().includes(query) ||
      char.race.toLowerCase().includes(query) ||
      char.origin.toLowerCase().includes(query) ||
      char.playerName.toLowerCase().includes(query)
    );
  }, [searchQuery, campaign?.id]);

  // Separate heroes and allies (default to 'hero' if not set for backwards compatibility)
  const heroes = characters?.filter(char => char.characterType !== 'ally') || [];
  const allies = characters?.filter(char => char.characterType === 'ally') || [];

  const handleEdit = (char: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedChar(char);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedChar(undefined);
    setModalOpen(true);
  };

  const { confirm } = useConfirmation();

  const handleDelete = async (char: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const isConfirmed = await confirm({
      title: 'Excluir Dossiê',
      message: `Tem certeza que deseja apagar o herói "${char.name}"? Isso removerá o dossiê permanentemente.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Manter',
      isDestructive: true
    });

    if (isConfirmed) {
      try {
        // Clean up media file if exists
        if (char.imageId) {
          await MediaService.deleteMedia(char.imageId);
        }
        await db.characters.delete(char.id);
        // Also clean up relationships in memoryCharacters
        const relations = await db.memoryCharacters.where('characterId').equals(char.id).toArray();
        for (const rel of relations) {
          await db.memoryCharacters.delete(rel.id);
        }
      } catch (err) {
        console.error('Erro ao deletar herói:', err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-medieval-gold/15 pb-4 space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-lg sm:text-xl font-medieval text-medieval-gold uppercase tracking-wider flex items-center space-x-2">
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-medieval-gold" />
            <span>Heróis e Aliados</span>
          </h2>
          <p className="text-xs font-serif text-medieval-silver mt-1">
            Heróis que gravam seus nomes na história do reino.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="btn-gold py-1.5 px-3 text-xs flex items-center space-x-1.5 w-full sm:w-auto justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Registrar Herói/Aliado</span>
        </button>
      </div>

      {/* Grid List */}
      {characters === undefined ? (
        <div className="text-center py-12 font-medieval text-medieval-gold text-sm animate-pulse">
          Lendo Livros de Registro...
        </div>
      ) : characters.length === 0 ? (
        <div className="grimoire-card p-12 text-center text-medieval-silver font-serif max-w-lg mx-auto">
          {searchQuery.trim() ? (
            <span>Nenhum herói atende à pesquisa "{searchQuery}".</span>
          ) : (
            <span>Nenhum herói registrado no grimório. Comece adicionando os heróis da sua mesa!</span>
          )}
          <button
            onClick={handleCreate}
            className="block mx-auto mt-6 btn-gold py-1.5 px-4 text-xs"
          >
            Adicionar Herói/Aliado
          </button>
        </div>
      ) : (
        <div className="flex flex-col space-y-6">
          {heroes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 border-b border-medieval-gold/20 pb-2">
                <div className="w-2 h-2 rounded-full bg-medieval-brightGold shadow-[0_0_8px_rgba(212,175,55,0.6)]"></div>
                <h3 className="text-xs font-medieval text-medieval-gold uppercase tracking-widest">
                  Heróis ({heroes.length})
                </h3>
              </div>
              {heroes.map((char) => (
                <CharacterCard
                  key={char.id}
                  character={char}
                  onEdit={(e) => handleEdit(char, e)}
                  onDelete={(e) => handleDelete(char, e)}
                />
              ))}
            </div>
          )}

          {allies.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 border-b border-medieval-silver/20 pb-2">
                <div className="w-2 h-2 rounded-full bg-medieval-silver"></div>
                <h3 className="text-xs font-medieval text-medieval-silver uppercase tracking-widest">
                  Aliados ({allies.length})
                </h3>
              </div>
              {allies.map((char) => (
                <CharacterCard
                  key={char.id}
                  character={char}
                  onEdit={(e) => handleEdit(char, e)}
                  onDelete={(e) => handleDelete(char, e)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Registry Modal */}
      <CharacterModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedChar(undefined);
        }}
        characterToEdit={selectedChar}
      />
    </div>
  );
};

// Internal horizontal card component
interface CharacterCardProps {
  character: Character;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, onEdit, onDelete }) => {
  const { navigate } = useRouter();
  const avatarUrl = useMediaUrl(character.imageId, true); // Use thumbnail

  return (
    <div
      onClick={() => navigate({ type: 'character-profile', id: character.id })}
      className="grimoire-card grimoire-card-hover cursor-pointer p-4 flex items-center justify-between group shadow-sm transition-all duration-200"
    >
      <div className="flex items-center space-x-4 min-w-0">

        {/* Avatar - Circular design inspired by reference */}
        <div className="w-12 h-12 rounded-full border border-medieval-gold/30 overflow-hidden bg-medieval-charcoal/80 flex-shrink-0 flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={character.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="text-medieval-gold/45 text-lg font-medieval">
              {character.name.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Center Details */}
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-[9px] font-serif text-medieval-gold tracking-widest uppercase bg-medieval-gold/5 border border-medieval-gold/10 px-1.5 py-0.2 rounded-sm">
              NÍVEL {character.level}
            </span>
            <span className="text-[9px] font-serif text-medieval-silver/50 truncate">
              {character.playerName}
            </span>
          </div>
          <h4 className="text-base font-medieval font-bold text-medieval-brightGold truncate mt-1 leading-none">
            {character.name}
          </h4>
          <span className="text-xs font-serif text-medieval-silver block mt-1.5 truncate">
            {character.race} • {character.class}
          </span>
        </div>
      </div>

      {/* Right side actions and Chevron */}
      <div className="flex items-center space-x-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Quick actions for Master / Player */}
        <div className="flex space-x-1">
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-medieval-gold/10 text-medieval-silver hover:text-medieval-gold transition-colors duration-200"
            title="Editar Dossiê"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-medieval-wine/20 text-medieval-silver hover:text-medieval-wine transition-colors duration-200"
            title="Excluir Dossiê"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right chevron indicating profile link */}
        <div
          onClick={() => navigate({ type: 'character-profile', id: character.id })}
          className="text-medieval-gold/45 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-200 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

    </div>
  );
};
