import React, { useState } from 'react';
import { useCampaign } from '../contexts/CampaignContext';
import { useRouter } from '../contexts/RouterContext';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Shield, BookOpen, Clock, Users, Scroll, Edit2 } from 'lucide-react';
import { EditCampaignModal } from '../components/campaign/EditCampaignModal';

export const CampaignHome: React.FC = () => {
  const { campaign } = useCampaign();
  const { navigate } = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  if (!campaign) return null;

  const coverUrl = useMediaUrl(campaign.coverImageId);

  // Queries
  const stats = useLiveQuery(async () => {
    const chars = await db.characters.where('campaignId').equals(campaign.id).count();
    const mems = await db.memories.where('campaignId').equals(campaign.id).count();
    const tokensCount = await db.tokens.where('campaignId').equals(campaign.id).count();
    return { chars, mems, tokensCount };
  }, [campaign.id]);

  const latestMemory = useLiveQuery(async () => {
    const mems = await db.memories.where('campaignId').equals(campaign.id).sortBy('eventDate');
    return mems.length > 0 ? mems[mems.length - 1] : undefined;
  }, [campaign.id]);

  const mainCharacters = useLiveQuery(async () => {
    return await db.characters.where('campaignId').equals(campaign.id).limit(4).toArray();
  }, [campaign.id]);

  // Calculate campaign duration
  const getDurationString = () => {
    const start = new Date(campaign.startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return 'Iniciada hoje';
    if (diffDays < 30) return `${diffDays} dias`;

    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;

    if (months === 1) {
      return remainingDays > 0 ? `1m ${remainingDays}d` : '1 mês';
    }
    return remainingDays > 0 ? `${months}m ${remainingDays}d` : `${months} meses`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Living Cover Hero Section */}
      <div className="relative h-64 md:h-80 w-full border border-medieval-gold/30 shadow-gold group/banner">

        {/* Edit Button */}
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="absolute top-4 right-4 p-2 rounded bg-medieval-stone/90 border border-medieval-gold/25 text-medieval-gold hover:border-medieval-gold hover:text-medieval-brightGold hover:scale-105 transition-all duration-200 shadow-gold z-20 md:opacity-0 md:group-hover/banner:opacity-100"
          title="Editar Campanha"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        {coverUrl ? (
          <img
            src={coverUrl}
            alt={campaign.name}
            className="w-full h-full object-cover object-center filter brightness-[0.4]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-medieval-stone to-medieval-charcoal flex items-center justify-center">
            <Shield className="w-20 h-20 text-medieval-gold/20" />
          </div>
        )}

        {/* Banner Details Overlay */}
        <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end bg-gradient-to-t from-medieval-charcoal via-medieval-charcoal/40 to-transparent">
          <div className="flex items-center space-x-2 text-medieval-gold text-xs font-serif tracking-widest uppercase">
            <BookOpen className="w-4 h-4" />
            <span>SISTEMA: {campaign.system}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold font-medieval text-medieval-brightGold tracking-wider mt-1 drop-shadow-md">
            {campaign.name}
          </h2>
          <div className="mt-2 max-w-2xl">
            <p className={`text-sm md:text-base font-serif text-medieval-parchment/80 italic whitespace-pre-line ${isDescriptionExpanded ? '' : 'line-clamp-2'}`}>
              "{campaign.description || 'Uma jornada sem descrição, aguardando que suas memórias sejam entalhadas.'}"
            </p>
            {(campaign.description && campaign.description.length > 100) && (
              <button
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="text-xs text-medieval-gold font-medieval tracking-wider mt-1 hover:text-medieval-brightGold transition-colors duration-200 flex items-center space-x-1"
              >
                <span>{isDescriptionExpanded ? 'Ver Menos' : 'Ver Mais'}</span>
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${isDescriptionExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* The Journey So Far - Columns Metrics Card */}
      <div className="space-y-4">
        <h3 className="text-xs font-medieval text-medieval-gold uppercase tracking-widest border-b border-medieval-gold/10 pb-1.5 flex items-center space-x-2">
          <Scroll className="w-4 h-4" />
          <span>A Jornada Até Aqui</span>
        </h3>
        <div className="grimoire-card py-5 px-4 grid grid-cols-3 gap-2 text-center divide-x divide-medieval-gold/10 shadow-lg">
          <div>
            <div className="flex justify-center text-medieval-gold mb-1">
              <Scroll className="w-4.5 h-4.5" />
            </div>
            <span className="block text-xl font-medieval font-bold text-medieval-brightGold">
              {stats?.mems ?? 0}
            </span>
            <span className="block text-[9px] uppercase tracking-wider text-medieval-silver/70 mt-0.5">Memórias</span>
          </div>
          <div>
            <div className="flex justify-center text-medieval-gold mb-1">
              <Users className="w-4.5 h-4.5" />
            </div>
            <span className="block text-xl font-medieval font-bold text-medieval-brightGold">
              {stats?.chars ?? 0}
            </span>
            <span className="block text-[9px] uppercase tracking-wider text-medieval-silver/70 mt-0.5">Heróis</span>
          </div>
          <div>
            <div className="flex justify-center text-medieval-gold mb-1">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <span className="block text-sm font-serif font-semibold text-medieval-brightGold truncate px-1">
              {getDurationString()}
            </span>
            <span className="block text-[9px] uppercase tracking-wider text-medieval-silver/70 mt-1">Duração</span>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Featured Memory Section */}
        <section className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-medieval text-medieval-gold uppercase tracking-widest border-b border-medieval-gold/10 pb-1.5 flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <span>Última Memória em Destaque</span>
          </h3>

          {latestMemory ? (
            <FeaturedMemoryCard memory={latestMemory} />
          ) : (
            <div className="grimoire-card p-8 text-center text-medieval-silver font-serif">
              Nenhuma memória escrita. Adicione a primeira página à sua memória.
              <button
                onClick={() => navigate({ type: 'timeline' })}
                className="block mx-auto mt-4 btn-gold py-1 px-3 text-xs"
              >
                Escrever Memória
              </button>
            </div>
          )}
        </section>

        {/* Campaign Heroes Section */}
        <section className="space-y-4">
          <h3 className="text-xs font-medieval text-medieval-gold uppercase tracking-widest border-b border-medieval-gold/10 pb-1.5 flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Heróis Ativos</span>
          </h3>

          {mainCharacters && mainCharacters.length > 0 ? (
            <div className="flex flex-col space-y-3">
              {mainCharacters.map((char) => (
                <CharacterCardShortcut key={char.id} character={char} />
              ))}
            </div>
          ) : (
            <div className="grimoire-card p-8 text-center text-medieval-silver font-serif">
              Nenhum herói registrado nesta memória ainda.
              <button
                onClick={() => navigate({ type: 'characters' })}
                className="block mx-auto mt-4 btn-stone py-1 px-3 text-xs"
              >
                Registrar Herói
              </button>
            </div>
          )}
        </section>

      </div>

      {/* Edit Modal */}
      <EditCampaignModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
};

// Featured cinematic memory visual component
const FeaturedMemoryCard: React.FC<{ memory: any }> = ({ memory }) => {
  const { navigate } = useRouter();
  const imageUrl = useMediaUrl(memory.imageId);

  return (
    <div
      onClick={() => navigate({ type: 'memory-detail', id: memory.id })}
      className="grimoire-card grimoire-card-hover overflow-hidden cursor-pointer flex flex-col space-y-4 shadow-md"
    >
      {imageUrl && (
        <div className="w-full h-48 md:h-64 overflow-hidden border-b border-medieval-gold/15 relative">
          <img src={imageUrl} alt={memory.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-medieval-stone via-transparent to-transparent" />
        </div>
      )}
      <div className="p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-serif uppercase tracking-widest text-medieval-gold px-2.5 py-0.5 bg-medieval-gold/10 border border-medieval-gold/15 rounded">
            {memory.type}
          </span>
          <span className="text-[10px] font-serif text-medieval-silver/50">
            {new Date(memory.eventDate).toLocaleDateString('pt-BR')}
          </span>
        </div>
        <h4 className="text-xl md:text-2xl font-medieval font-bold text-medieval-brightGold hover:text-medieval-gold transition-colors duration-200">
          {memory.title}
        </h4>
        <p className="text-xs md:text-sm font-serif text-medieval-silver line-clamp-3 leading-relaxed">
          {memory.description}
        </p>
        <div className="flex justify-end pt-2">
          <span className="text-xs text-medieval-brightGold font-medieval tracking-widest flex items-center hover:underline">
            Ler Registro Completo &rarr;
          </span>
        </div>
      </div>
    </div>
  );
};

// Horizontal layout character shortcut component
const CharacterCardShortcut: React.FC<{ character: any }> = ({ character }) => {
  const { navigate } = useRouter();
  const avatarUrl = useMediaUrl(character.imageId, true); // Use thumbnail

  return (
    <div
      onClick={() => navigate({ type: 'character-profile', id: character.id })}
      className="grimoire-card grimoire-card-hover p-3 flex items-center justify-between cursor-pointer group shadow-sm"
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div className="w-11 h-11 rounded-full border border-medieval-gold/30 overflow-hidden flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-medieval-charcoal flex items-center justify-center text-medieval-gold/40 text-xs">
              {character.name.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-medieval font-bold text-medieval-brightGold truncate leading-none">
            {character.name}
          </h4>
          <span className="text-[11px] font-serif text-medieval-silver block mt-1 truncate">
            {character.race} • {character.class}
          </span>
        </div>
      </div>
      <div className="text-medieval-gold/40 group-hover:text-medieval-gold group-hover:translate-x-0.5 transition-all duration-200">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};