import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useRouter } from '../contexts/RouterContext';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { CharacterModal } from '../components/character/CharacterModal';
import type { CharacterEvolution } from '../types';
import {
  Shield,
  Heart,
  Zap,
  ArrowRight,
  TrendingUp,
  FileText,
  Star,
  Edit3,
  MessageSquare,
  BookOpen,
  X,
  Search
} from 'lucide-react';

interface CharacterProfileViewProps {
  id: string;
}

export const CharacterProfileView: React.FC<CharacterProfileViewProps> = ({ id }) => {
  const { navigate } = useRouter();
  const [editModalOpen, setEditModalOpen] = useState(false);

  // ── Evolution adventure and text filters ───────────────────────────────────
  const [filterMemoryId, setFilterMemoryId] = useState('');
  const [filterText, setFilterText] = useState('');
  const [visibleCount, setVisibleCount] = useState(5);

  const character = useLiveQuery(() => db.characters.get(id), [id]);
  const avatarUrl = useMediaUrl(character?.imageId);

  // All campaign memories (for resolving memoryId → title on evolutions)
  const allMemories = useLiveQuery(async () => {
    if (!character?.campaignId) return [];
    return db.memories.where('campaignId').equals(character.campaignId).toArray();
  }, [character?.campaignId]);

  // Compile narrative timeline of memories + level changes
  const timeline = useLiveQuery(async () => {
    if (!id) return [];

    // Query relationships in memoryCharacters
    const relations = await db.memoryCharacters.where('characterId').equals(id).toArray();

    const events = [];
    for (const rel of relations) {
      const memory = await db.memories.get(rel.memoryId);
      if (memory) {
        events.push({
          levelReached: rel.levelReached,
          memory
        });
      }
    }

    // Sort chronologically by eventDate
    return events.sort((a, b) => a.memory.eventDate.localeCompare(b.memory.eventDate));
  }, [id]);

  // Filtered + sorted evolutions (newest first, adventure & text match)
  const filteredEvolutions = useMemo<CharacterEvolution[]>(() => {
    if (!character?.evolutions) return [];
    let list = [...character.evolutions];

    if (filterMemoryId) {
      list = list.filter(e => e.memoryId === filterMemoryId);
    }
    if (filterText.trim()) {
      const query = filterText.toLowerCase().trim();
      list = list.filter(e => e.comment.toLowerCase().includes(query));
    }

    // Descending order
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [character?.evolutions, filterMemoryId, filterText]);

  // Slice to visible count for lazy loading
  const visibleEvolutions = filteredEvolutions.slice(0, visibleCount);
  const hasMore = filteredEvolutions.length > visibleCount;

  const memoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (allMemories) {
      allMemories.forEach(m => { map[m.id] = m.title; });
    }
    return map;
  }, [allMemories]);



  if (character === undefined) {
    return (
      <div className="text-center py-12 font-medieval text-medieval-gold text-sm animate-pulse">
        Lendo Dossiê do Herói...
      </div>
    );
  }

  if (character === null) {
    return (
      <div className="grimoire-card p-8 text-center text-medieval-silver font-serif max-w-md mx-auto">
        Herói não encontrado nos pergaminhos da campanha.
        <button
          onClick={() => navigate({ type: 'characters' })}
          className="block mx-auto mt-4 btn-stone py-1 px-3 text-xs"
        >
          Voltar aos Heróis
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in font-serif">

      {/* Visual Portrait Cover Card */}
      <div className="grimoire-card overflow-hidden border-medieval-gold/30 shadow-gold relative">
        {/* Edit button */}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => setEditModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-medieval-charcoal/80 hover:bg-medieval-stone border border-medieval-gold/30 text-medieval-gold hover:text-medieval-brightGold text-[11px] font-medieval uppercase tracking-wider backdrop-blur-sm transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row">

          {/* Portrait Image (Left side on desktop, top on mobile) */}
          <div className="w-full md:w-72 aspect-[3/4] bg-medieval-charcoal/80 flex-shrink-0 flex items-center justify-center border-b md:border-b-0 md:border-r border-medieval-gold/20 relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={character.name}
                className="w-full h-full object-cover object-center filter contrast-[1.03]"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-medieval-stone to-medieval-charcoal flex flex-col items-center justify-center text-medieval-gold/20">
                <Shield className="w-20 h-20 stroke-[1.2]" />
                <span className="font-medieval text-xs tracking-wider mt-2">Sem Retrato</span>
              </div>
            )}
          </div>

          {/* Character Details & Column Metrics Card */}
          <div className="flex-1 p-6 flex flex-col justify-between space-y-6">
            <div>
              <span className="text-[10px] font-medieval tracking-widest text-medieval-gold uppercase bg-medieval-gold/10 border border-medieval-gold/20 px-2.5 py-0.5 rounded-sm inline-block">
                Dossiê de Herói
              </span>
              <h2 className="text-3xl font-bold font-medieval text-medieval-brightGold tracking-wider mt-2.5 leading-none">
                {character.name}
              </h2>
              {character.concept && (
                <p className="text-xs italic text-medieval-silver mt-2 border-l border-medieval-gold/25 pl-2.5">
                  "{character.concept}"
                </p>
              )}
            </div>

            {/* Core Statistics Block */}
            <div className="grimoire-card py-4 px-2 grid grid-cols-3 gap-1 text-center divide-x divide-medieval-gold/10 bg-medieval-stone/30">
              <div>
                <div className="flex justify-center text-medieval-gold mb-0.5">
                  <Star className="w-4 h-4 fill-medieval-gold/20" />
                </div>
                <span className="block text-base font-medieval font-bold text-medieval-brightGold">
                  {character.level}
                </span>
                <span className="block text-[8px] uppercase tracking-wider text-medieval-silver/70">Nível</span>
              </div>
              <div>
                <div className="flex justify-center text-red-400 mb-0.5">
                  <Heart className="w-4 h-4 fill-red-950/20" />
                </div>
                <span className="block text-base font-serif font-bold text-medieval-brightGold">
                  {character.hp}
                </span>
                <span className="block text-[8px] uppercase tracking-wider text-medieval-silver/70">Vida PV</span>
              </div>
              <div>
                <div className="flex justify-center text-blue-400 mb-0.5">
                  <Zap className="w-4 h-4 fill-blue-950/20" />
                </div>
                <span className="block text-base font-serif font-bold text-medieval-brightGold">
                  {character.mp}
                </span>
                <span className="block text-[8px] uppercase tracking-wider text-medieval-silver/70">Mana PM</span>
              </div>
            </div>

            {/* Dossier Meta info grid */}
            <div className="grid grid-cols-3 gap-2 border-t border-medieval-gold/10 pt-4 text-xs font-serif">
              <div>
                <span className="block text-[9px] text-medieval-gold/60 uppercase font-serif">Raça</span>
                <span className="font-semibold text-medieval-parchment truncate block">{character.race}</span>
              </div>
              <div>
                <span className="block text-[9px] text-medieval-gold/60 uppercase font-serif">Classe</span>
                <span className="font-semibold text-medieval-parchment truncate block">{character.class}</span>
              </div>
              <div>
                <span className="block text-[9px] text-medieval-gold uppercase font-medieval">Origem</span>
                <span className="font-bold text-medieval-brightGold truncate block">{character.origin}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Biography & Journey sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Side biography */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grimoire-card p-6 md:p-8 space-y-4">
            <h3 className="text-sm font-medieval text-medieval-gold uppercase tracking-widest border-b border-medieval-gold/10 pb-1.5 flex items-center space-x-1.5">
              <FileText className="w-4 h-4" />
              <span>Quem Eles São</span>
            </h3>
            <p className="text-sm text-medieval-parchment/85 leading-relaxed font-serif whitespace-pre-line text-justify">
              {character.description || 'Nenhum histórico geral registrado neste pergaminho.'}
            </p>

            {/* Notes / Secrets */}
            {character.notes && (
              <div className="p-4 bg-medieval-wine/5 border border-medieval-wine/25 rounded space-y-1 mt-4">
                <h4 className="text-[10px] font-medieval text-medieval-wine uppercase tracking-widest">
                  Notas de Campanha e Segredos
                </h4>
                <p className="text-xs text-red-100/70 leading-relaxed italic">
                  {character.notes}
                </p>
              </div>
            )}
          </div>

          {/* ── Evolutions & Comments Section ── */}
          <div className="grimoire-card p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-medieval-gold/10 pb-1.5">
              <h3 className="text-sm font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5">
                <MessageSquare className="w-4 h-4" />
                <span>Evolução & Comentários</span>
                <span className="text-[9px] bg-medieval-gold/15 border border-medieval-gold/25 text-medieval-gold rounded-full px-1.5 py-0.5 font-serif ml-1">
                  {character.evolutions?.length ?? 0}
                </span>
              </h3>
            </div>

            {/* Modern Search and Filter Panel */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 bg-medieval-stone/15 border border-medieval-gold/15 rounded-lg shadow-sm transition-all">
              {/* Search input */}
              <div className="md:col-span-7 relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Search className="w-3.5 h-3.5 text-medieval-gold/50" />
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar comentários por palavra-chave..."
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                  className="medieval-input w-full pl-8 pr-7 py-1 h-8 text-xs font-serif"
                />
                {filterText && (
                  <button
                    onClick={() => setFilterText('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-medieval-silver/40 hover:text-medieval-wine transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Adventure Filter Group */}
              <div className="md:col-span-5 flex flex-wrap items-center gap-2 justify-start md:justify-end">
                <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                  <BookOpen className="w-3.5 h-3.5 text-medieval-gold/50 flex-shrink-0" />
                  <select
                    value={filterMemoryId}
                    onChange={e => setFilterMemoryId(e.target.value)}
                    className="medieval-input py-1 px-2 text-[10px] h-8 bg-medieval-charcoal/40 flex-1 min-w-0"
                    title="Filtrar por aventura"
                  >
                    <option value="">Todas as aventuras</option>
                    {allMemories?.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                {(filterMemoryId || filterText) && (
                  <button
                    type="button"
                    onClick={() => { setFilterMemoryId(''); setFilterText(''); }}
                    className="btn-stone h-8 px-2.5 text-[10px] flex items-center space-x-1 border border-medieval-wine/20 text-medieval-wine/80 hover:text-medieval-wine hover:border-medieval-wine/40 bg-medieval-wine/5 rounded hover:bg-medieval-wine/10 transition-all cursor-pointer flex-shrink-0"
                    title="Limpar todos os filtros"
                  >
                    <X className="w-3 h-3" />
                    <span>Limpar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Evolution list */}
            {filteredEvolutions.length === 0 ? (
              <div className="text-center py-6 text-xs text-medieval-silver/40 italic">
                Nenhum registro encontrado com os filtros atuais.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleEvolutions.map((evo, idx) => {
                  const memTitle = evo.memoryId ? memoryMap[evo.memoryId] : null;
                  return (
                    <div
                      key={evo.id}
                      className="relative pl-4 border-l-2 border-medieval-gold/20 hover:border-medieval-gold/50 transition-colors space-y-1 py-1"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      {/* Dot */}
                      <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-medieval-charcoal border border-medieval-gold/50" />

                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[9px] font-medieval text-medieval-gold bg-medieval-gold/10 border border-medieval-gold/20 px-1.5 py-0.5 rounded">
                          {new Date(evo.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        {evo.author && (
                          <span className="text-[9px] font-medieval font-bold text-medieval-brightGold bg-medieval-gold/5 border border-medieval-gold/15 px-1.5 py-0.5 rounded">
                            {evo.author}
                          </span>
                        )}
                        {memTitle && (
                          <span className="text-[9px] font-serif italic text-medieval-silver/60 flex items-center space-x-1">
                            <BookOpen className="w-2.5 h-2.5 text-medieval-gold/40" />
                            <span>{memTitle}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-medieval-parchment/85 leading-relaxed whitespace-pre-line">
                        {evo.comment}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {(filterMemoryId || filterText) && filteredEvolutions.length < (character.evolutions?.length ?? 0) && (
              <p className="text-[10px] text-medieval-silver/40 text-center italic">
                Mostrando {filteredEvolutions.length} de {character.evolutions?.length} registros
              </p>
            )}

            {/* Load more button */}
            {hasMore && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount(prev => prev + 5)}
                  className="btn-stone py-1.5 px-4 text-[10px] text-medieval-gold hover:text-medieval-brightGold transition-colors"
                >
                  Carregar mais ({filteredEvolutions.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right side chronological milestones (narrative roadmap timeline) */}
        <div className="space-y-4">
          <h3 className="text-sm font-medieval text-medieval-gold uppercase tracking-widest border-b border-medieval-gold/10 pb-1.5 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Passos da Evolução</span>
          </h3>

          <div className="relative pl-5 border-l border-medieval-gold/15 ml-3.5 py-1 space-y-6">

            {/* Start point */}
            <div className="relative">
              <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-medieval-charcoal border border-medieval-gold flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-medieval-gold" />
              </div>
              <div className="grimoire-card p-3 space-y-1 text-xs">
                <span className="block text-[9px] font-medieval font-black text-medieval-gold uppercase">Nível 1</span>
                <span className="block font-semibold text-medieval-brightGold">Origens: {character.origin}</span>
                <p className="text-[10px] text-medieval-silver/80">Campanha iniciada com a classe {character.class}.</p>
              </div>
            </div>

            {/* Milestones from Memories */}
            {timeline && timeline.length > 0 ? (
              timeline.map((event) => {
                const { memory, levelReached } = event;
                return (
                  <TimelineStep
                    key={memory.id}
                    memory={memory}
                    levelReached={levelReached}
                  />
                );
              })
            ) : (
              <div className="text-center py-4 text-xs text-medieval-silver bg-medieval-stone/20 border border-dashed border-medieval-gold/15 rounded p-3">
                Nenhuma memória vinculada.
              </div>
            )}
          </div>
        </div>
      </div>

      {editModalOpen && (
        <CharacterModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          characterToEdit={character}
        />
      )}
    </div>
  );
};

// Internal timeline step node component
interface TimelineStepProps {
  memory: any;
  levelReached?: number;
}

const TimelineStep: React.FC<TimelineStepProps> = ({ memory, levelReached }) => {
  const { navigate } = useRouter();
  const imageUrl = useMediaUrl(memory.imageId, true); // Use thumbnail

  return (
    <div className="relative group">

      {/* Node */}
      <div className={`absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-medieval-charcoal border ${levelReached ? 'border-medieval-gold scale-110' : 'border-medieval-gold/50'
        } flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
        <div className={`w-1 h-1 rounded-full ${levelReached ? 'bg-medieval-gold' : 'bg-medieval-gold/40'}`} />
      </div>

      {/* Minified layout for timeline steps */}
      <div
        onClick={() => navigate({ type: 'memory-detail', id: memory.id })}
        className="grimoire-card grimoire-card-hover p-3 cursor-pointer space-y-1.5 text-xs shadow-sm"
      >
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center space-x-1.5">
            <span className="text-[8px] font-serif uppercase tracking-widest text-medieval-gold px-1.5 py-0.2 bg-medieval-gold/10 border border-medieval-gold/15 rounded">
              {memory.type}
            </span>
            {levelReached && (
              <span className="text-[8px] font-medieval font-black uppercase text-medieval-charcoal px-1.5 py-0.2 bg-medieval-gold rounded flex items-center">
                <ArrowRight className="w-2 h-2 mr-0.5" />
                <span>Nível {levelReached}</span>
              </span>
            )}
          </div>
          <span className="text-[9px] text-medieval-silver/50">
            {new Date(memory.eventDate).toLocaleDateString('pt-BR')}
          </span>
        </div>

        <div className="flex space-x-2 items-start">
          {imageUrl && (
            <div className="w-10 h-10 rounded overflow-hidden border border-medieval-gold/10 flex-shrink-0 bg-medieval-charcoal">
              <img src={imageUrl} alt={memory.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medieval font-bold text-medieval-brightGold group-hover:text-medieval-gold break-words whitespace-normal leading-tight">
              {memory.title}
            </h4>
            <p className="text-[10px] text-medieval-silver/80 line-clamp-2 mt-0.5">
              {memory.description}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
