import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useSearch } from '../contexts/SearchContext';
import { useRouter } from '../contexts/RouterContext';
import { useCampaign } from '../contexts/CampaignContext';
import { MemoryRepository } from '../repositories/MemoryRepository';
import { MemoryCharacterRepository } from '../repositories/MemoryCharacterRepository';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { MemoryModal } from '../components/memory/MemoryModal';
import { MediaService } from '../services/media';
import { useConfirmation } from '../contexts/ConfirmationContext';
import {
  Plus,
  Tag,
  Users,
  Calendar,
  Trash2,
  Edit3,
  Filter,
  ArrowUpDown,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import type { Memory } from '../types';

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

export const getCategoryColorClass = (type: string) => {
  switch (type) {
    case 'Batalha':
      return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    case 'Vitória':
    case 'Conquista':
      return 'bg-green-950/60 text-green-300 border-green-800/40';
    case 'Derrota':
    case 'Tragédia':
      return 'bg-medieval-wine/25 text-red-300 border-medieval-wine/50';
    case 'Descoberta':
    case 'Exploração':
      return 'bg-blue-950/60 text-blue-300 border-blue-800/40';
    case 'Relacionamento':
      return 'bg-pink-950/40 text-pink-300 border-pink-800/30';
    case 'Momento Lendário':
      return 'bg-medieval-gold/20 text-medieval-brightGold border-medieval-gold/30 font-bold';
    case 'Conhecimento':
      return 'bg-purple-950/50 text-purple-300 border-purple-800/30';
    case 'Momento Engraçado':
      return 'bg-amber-950/40 text-amber-300 border-amber-800/30';
    default:
      return 'bg-medieval-stone/80 text-medieval-silver border-medieval-gold/15';
  }
};

export const TimelineView: React.FC = () => {
  const { searchQuery } = useSearch();
  const { campaign } = useCampaign();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | undefined>(undefined);

  const [filterChar, setFilterChar] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const allCharacters = useLiveQuery(() =>
    campaign ? db.characters.where('campaignId').equals(campaign.id).toArray() : []
    , [campaign?.id]) || [];

  const allTags = useLiveQuery(async () => {
    if (!campaign) return [];
    const mems = await db.memories.where('campaignId').equals(campaign.id).toArray();
    const tags = new Set<string>();
    mems.forEach(m => m.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [campaign?.id]) || [];

  const memories = useLiveQuery(async () => {
    if (!campaign) return [];
    let list = await db.memories.where('campaignId').equals(campaign.id).toArray();

    if (filterChar) {
      list = list.filter(m => m.characterIds.includes(filterChar));
    }

    if (filterCategory) {
      list = list.filter(m => m.type === filterCategory);
    }

    if (filterTag) {
      list = list.filter(m => m.tags.includes(filterTag));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => {
      const compare = a.eventDate.localeCompare(b.eventDate);
      return sortOrder === 'asc' ? compare : -compare;
    });
  }, [filterChar, filterCategory, filterTag, searchQuery, sortOrder]);

  const handleEdit = (memory: Memory, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMemory(memory);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedMemory(undefined);
    setModalOpen(true);
  };

  const { confirm } = useConfirmation();

  const handleDelete = async (memory: Memory, e: React.MouseEvent) => {
    e.stopPropagation();

    const isConfirmed = await confirm({
      title: 'Excluir Memória',
      message: `Apagar memória "${memory.title}"? Isso removerá o registro e suas imagens vinculadas permanentemente.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Manter',
      isDestructive: true
    });

    if (isConfirmed) {
      try {
        if (memory.imageId) {
          await MediaService.deleteMedia(memory.imageId);
        }
        await MemoryRepository.delete(memory.id);
        const relations = await db.memoryCharacters.where('memoryId').equals(memory.id).toArray();
        for (const rel of relations) {
          await MemoryCharacterRepository.delete(rel.id);
        }
      } catch (err) {
        console.error('Erro ao deletar memória:', err);
      }
    }
  };

  const clearFilters = () => {
    setFilterChar('');
    setFilterCategory('');
    setFilterTag('');
  };

  const hasActiveFilters = filterChar || filterCategory || filterTag;

  return (
    <div className="space-y-6 animate-fade-in font-serif">

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-medieval-gold/15 pb-4 space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-lg sm:text-xl font-medieval text-medieval-gold uppercase tracking-wider flex items-center space-x-2">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-medieval-gold" />
            <span>Memórias da Campanha</span>
          </h2>
          <p className="text-xs font-serif text-medieval-silver mt-1">
            Histórico das memórias que escrevem os passos da nossa jornada.
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-stone py-1.5 px-2.5 text-xs flex items-center space-x-1.5 transition-all duration-300 ${hasActiveFilters ? 'border-medieval-gold text-medieval-brightGold bg-medieval-gold/5' : ''
              }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="ml-0.5 bg-medieval-gold/20 text-medieval-brightGold text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {[filterChar, filterCategory, filterTag].filter(Boolean).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn-stone py-1.5 px-2.5 text-xs flex items-center space-x-1.5 transition-all duration-300"
            title={sortOrder === 'asc' ? 'Mais antigas primeiro' : 'Mais novas primeiro'}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'asc' ? 'Antigas' : 'Novas'}</span>
          </button>

          <button
            onClick={handleCreate}
            className="btn-gold py-1.5 px-3 text-xs flex items-center space-x-1.5 flex-1 sm:flex-initial justify-center transition-all duration-300"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Escrever Memória</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="grimoire-card p-4 animate-fade-in text-xs overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-0">

            <div className="flex flex-col space-y-1 min-w-0">
              <label className="text-[10px] text-medieval-gold uppercase font-medieval">Categoria</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="medieval-input py-1.5 bg-medieval-stone text-xs truncate"
              >
                <option value="">Todas as Categorias</option>
                {MEMORY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-1 min-w-0">
              <label className="text-[10px] text-medieval-gold uppercase font-medieval">Herói</label>
              <select
                value={filterChar}
                onChange={(e) => setFilterChar(e.target.value)}
                className="medieval-input py-1.5 bg-medieval-stone text-xs truncate"
              >
                <option value="">Todos os Heróis</option>
                {allCharacters.map(char => (
                  <option key={char.id} value={char.id}>{char.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-1 min-w-0">
              <label className="text-[10px] text-medieval-gold uppercase font-medieval">Etiqueta</label>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="medieval-input py-1.5 bg-medieval-stone text-xs truncate"
              >
                <option value="">Todas as Etiquetas</option>
                {allTags.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t border-medieval-gold/10 text-right">
              <button
                onClick={clearFilters}
                className="btn-stone py-1 px-3 text-[10px] uppercase font-medieval transition-all duration-300"
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </div>
      )}

      {memories === undefined ? (
        <div className="text-center py-12 font-medieval text-medieval-gold text-sm animate-pulse">
          Consultando Pergaminhos do Passado...
        </div>
      ) : memories.length === 0 ? (
        <div className="grimoire-card p-12 text-center text-medieval-silver font-serif max-w-lg mx-auto">
          <span>Nenhuma memória encontrada correspondente aos filtros.</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="block mx-auto mt-4 btn-stone py-1.5 px-3 text-xs"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6 perspective-container">
          {memories.map((memory) => (
            <div className="stagger-item" key={memory.id}>
              <MemoryCard
                memory={memory}
                onEdit={(e) => handleEdit(memory, e)}
                onDelete={(e) => handleDelete(memory, e)}
              />
            </div>
          ))}
        </div>
      )}

      <MemoryModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedMemory(undefined);
        }}
        memoryToEdit={selectedMemory}
      />
    </div>
  );
};

interface MemoryCardProps {
  memory: Memory;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onEdit, onDelete }) => {
  const { navigate } = useRouter();
  const imageUrl = useMediaUrl(memory.imageId);

  const characters = useLiveQuery(async () => {
    const list = [];
    for (const charId of memory.characterIds) {
      const char = await db.characters.get(charId);
      if (char) list.push(char);
    }
    return list;
  }, [memory.characterIds]);

  const linkedPhotos = useLiveQuery(() =>
    db.media.where('campaignId').equals(memory.campaignId).filter(m => m.relatedMemoryId === memory.id).toArray()
    , [memory.id, memory.campaignId]) || [];

  const comments = useLiveQuery(() => db.memories.get(memory.id).then(m => m?.comments || []), [memory.id]) || [];

  return (
    <div
      onClick={() => navigate({ type: 'memory-detail', id: memory.id })}
      className="grimoire-card grimoire-card-hover spatial-card p-4 md:p-6 cursor-pointer space-y-4 relative overflow-hidden shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated focus:outline-none focus:ring-2 focus:ring-medieval-gold/40"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center space-x-2">
          <span className={`text-[9px] font-serif border px-2 py-0.5 rounded-sm uppercase tracking-wider ${getCategoryColorClass(memory.type)}`}>
            {memory.type}
          </span>
          <span className="text-[10px] font-serif text-medieval-silver/50 flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-medieval-gold" />
            <span>{new Date(memory.eventDate).toLocaleDateString('pt-BR')}</span>
          </span>
        </div>

        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-medieval-gold/15 text-medieval-silver hover:text-medieval-gold transition-all duration-300"
            title="Editar Memória"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-medieval-wine/25 text-medieval-silver hover:text-medieval-wine transition-all duration-300"
            title="Excluir Memória"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {imageUrl && (
          <div className="w-full md:w-40 aspect-[16/10] md:h-24 rounded overflow-hidden border border-medieval-gold/10 flex-shrink-0 bg-medieval-charcoal">
            <img src={imageUrl} alt={memory.title} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}

        <div className="flex-1 space-y-2 min-w-0">
          <h3 className="text-lg font-medieval font-bold text-medieval-brightGold group-hover:text-medieval-gold transition-colors duration-300 break-words whitespace-normal leading-tight">
            {memory.title}
          </h3>
          <p className="text-xs font-serif text-medieval-silver line-clamp-3 leading-relaxed text-justify">
            {memory.description}
          </p>
        </div>
      </div>

      {linkedPhotos.length > 0 && (
        <div className="flex items-center space-x-2 pt-2 overflow-x-auto scrollbar-none" onClick={e => e.stopPropagation()}>
          {linkedPhotos.map(photo => (
            <MemoryCardPhotoThumb key={photo.id} photoId={photo.id} memoryId={memory.id} />
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-medieval-gold/5 pt-3 text-[11px] font-serif gap-3">
        <div className="flex items-center space-x-1.5 flex-wrap">
          <Users className="w-3.5 h-3.5 text-medieval-gold flex-shrink-0" />
          {characters && characters.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {characters.map(char => (
                <span
                  key={char.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ type: 'character-profile', id: char.id });
                  }}
                  className="text-[9px] text-medieval-brightGold hover:underline"
                >
                  {char.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-medieval-silver/50 italic">Nenhum herói associado</span>
          )}
        </div>

        <div className="flex items-center space-x-3 flex-wrap">
          {comments.length > 0 && (
            <span className="text-[11px] text-medieval-silver/80 flex items-center space-x-1">
              <MessageSquare className="w-3.5 h-3.5 text-medieval-gold/70" />
              <span>{comments.length}</span>
            </span>
          )}

          {memory.tags.length > 0 && (
            <div className="flex items-center space-x-1 flex-wrap">
              <Tag className="w-3 h-3 text-medieval-silver/70 flex-shrink-0" />
              <div className="flex flex-wrap gap-1">
                {memory.tags.map(t => (
                  <span
                    key={t}
                    className="text-[9px] text-medieval-silver bg-medieval-stone px-1.5 py-0.5 rounded-sm font-serif border border-medieval-gold/5 mt-1 leading-none"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

const MemoryCardPhotoThumb: React.FC<{ photoId: string; memoryId: string }> = ({ photoId, memoryId }) => {
  const url = useMediaUrl(photoId, true);
  const { navigate } = useRouter();
  return (
    <div
      onClick={() => navigate({ type: 'memory-detail', id: memoryId })}
      className="w-10 h-10 rounded border border-medieval-gold/15 overflow-hidden flex-shrink-0 bg-medieval-charcoal cursor-pointer hover:border-medieval-gold transition-all duration-300"
    >
      {url ? (
        <img src={url} alt="Foto vinculada" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[8px] text-medieval-silver">...</div>
      )}
    </div>
  );
};