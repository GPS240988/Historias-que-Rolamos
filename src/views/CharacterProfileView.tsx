import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useRouter } from '../contexts/RouterContext';
import { useMediaUrl } from '../hooks/useMediaUrl';
import {
  Shield,
  Heart,
  Zap,
  ArrowRight,
  TrendingUp,
  FileText,
  Star
} from 'lucide-react';

interface CharacterProfileViewProps {
  id: string;
}

export const CharacterProfileView: React.FC<CharacterProfileViewProps> = ({ id }) => {
  const { navigate } = useRouter();

  const character = useLiveQuery(() => db.characters.get(id), [id]);
  const avatarUrl = useMediaUrl(character?.imageId);

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

          {/* Character Details & Column Metrics Card (inspired by reference profile layout) */}
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

            {/* Core Statistics Block (columns style matching reference metrics card) */}
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
            <h4 className="font-medieval font-bold text-medieval-brightGold group-hover:text-medieval-gold truncate">
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
