import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useRouter } from '../contexts/RouterContext';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { getCategoryColorClass } from './TimelineView';
import type { Character, Media } from '../types';
import { MemoryModal } from '../components/memory/MemoryModal';
import {
  Calendar,
  Tag,
  Users,
  ArrowUpRight,
  Shield,
  X,
  Image as ImageIcon,
  Edit3,
  BookOpen,
  Scroll,
  Flame
} from 'lucide-react';

interface MemoryDetailViewProps {
  id: string;
}

// Dynamic gradient and borders matching each category's mood (even if there is no image)
const getCategoryGradientClass = (type: string) => {
  switch (type) {
    case 'Batalha':
      return 'from-zinc-950 via-zinc-900/90 to-zinc-950/40 border-zinc-800';
    case 'Vitória':
    case 'Conquista':
      return 'from-green-950 via-green-900/80 to-emerald-950/20 border-green-800/40';
    case 'Derrota':
    case 'Tragédia':
      return 'from-medieval-wine/50 via-red-950/40 to-red-950/25 border-medieval-wine/50';
    case 'Descoberta':
    case 'Exploração':
      return 'from-blue-950 via-blue-900/80 to-cyan-950/20 border-blue-800/40';
    case 'Relacionamento':
      return 'from-pink-950/50 via-rose-950/40 to-rose-950/25 border-rose-900/30';
    case 'Momento Lendário':
      return 'from-medieval-gold/20 via-amber-950/30 to-medieval-stone border-medieval-gold/30';
    case 'Conhecimento':
      return 'from-purple-950 via-purple-900/80 to-violet-950/20 border-purple-800/30';
    case 'Momento Engraçado':
      return 'from-amber-950/50 via-amber-900/40 to-orange-950/25 border-amber-800/30';
    default:
      return 'from-medieval-stone to-medieval-charcoal border-medieval-gold/15';
  }
};

export const MemoryDetailView: React.FC<MemoryDetailViewProps> = ({ id }) => {
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<'mestre' | 'rhodgar' | 'ernest'>('mestre');
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Query memory record
  const memory = useLiveQuery(() => db.memories.get(id), [id]);
  const imageUrl = useMediaUrl(memory?.imageId); // Load full quality image

  // Query linked photos
  const linkedPhotos = useLiveQuery(() => {
    if (!memory) return [];
    return db.media.where('campaignId').equals(memory.campaignId).filter(m => m.relatedMemoryId === id).toArray();
  }, [id, memory]) || [];

  // Query participating characters & check if they leveled up in this memory
  const participants = useLiveQuery(async () => {
    if (!memory) return [];

    const chars = [];
    for (const charId of memory.characterIds) {
      const char = await db.characters.get(charId);
      if (char) {
        // Look up if they reached a level here
        const rel = await db.memoryCharacters
          .where('memoryId')
          .equals(memory.id)
          .filter(r => r.characterId === char.id)
          .first();

        chars.push({
          character: char,
          levelReached: rel?.levelReached
        });
      }
    }
    return chars;
  }, [memory]);

  if (memory === undefined) {
    return (
      <div className="text-center py-12 font-medieval text-medieval-gold text-lg animate-pulse">
        Lendo Memória do Evento...
      </div>
    );
  }

  if (memory === null) {
    return (
      <div className="grimoire-card p-8 text-center text-medieval-silver font-serif max-w-md mx-auto">
        Memória não encontrada nos pergaminhos da campanha.
        <button
          onClick={() => navigate({ type: 'timeline' })}
          className="block mx-auto mt-4 btn-stone py-1 px-3 text-xs"
        >
          Voltar à Linha do Tempo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-serif">

      {/* Cinematic Header Banner with Ambient Gradient Backdrops */}
      <div className={`relative w-full min-h-[220px] md:h-80 rounded-lg overflow-hidden border shadow-gold bg-medieval-charcoal/80 flex items-end p-5 md:p-8 ${getCategoryGradientClass(memory.type)}`}>

        {/* Background Image / Ambient Gradient Cover */}
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={memory.title}
              className="absolute inset-0 w-full h-full object-cover filter brightness-[0.45] contrast-[1.05] transition-transform duration-700 hover:scale-105"
            />
            {/* Soft shadow overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/65 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br opacity-40 mix-blend-overlay flex items-center justify-center text-medieval-gold/5 pointer-events-none">
            <Shield className="w-48 h-48 stroke-[0.8]" />
          </div>
        )}

        {/* Edit button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => setEditModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-medieval-charcoal/80 hover:bg-medieval-stone border border-medieval-gold/30 text-medieval-gold hover:text-medieval-brightGold text-[11px] font-medieval uppercase tracking-wider backdrop-blur-sm transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>
        </div>

        {/* Overlay category badge */}
        <div className="absolute top-4 right-4 z-10">
          <span className={`text-[10px] font-serif uppercase tracking-widest px-3 py-1 border rounded shadow-md backdrop-blur-sm ${getCategoryColorClass(memory.type)}`}>
            {memory.type}
          </span>
        </div>

        {/* Cinematic Title Details */}
        <div className="relative z-10 w-full space-y-2 md:space-y-3">
          <div className="flex items-center space-x-2 text-medieval-silver/80 text-[11px] font-serif">
            <Calendar className="w-4 h-4 text-medieval-gold shrink-0" />
            <span>Registrado em: {new Date(memory.eventDate).toLocaleDateString('pt-BR')}</span>
          </div>

          <h2 className="text-xl md:text-3xl lg:text-4xl font-bold font-medieval text-medieval-brightGold tracking-wider break-words whitespace-normal leading-tight drop-shadow-md select-text">
            {memory.title}
          </h2>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Side: Chronicles & Photos */}
        <div className="lg:col-span-2 space-y-6">

          <div className="grimoire-card p-5 md:p-6 space-y-6">

            {/* Thematic RPG tabs bar */}
            <div className="grid grid-cols-3 gap-2 border-b border-medieval-gold/10 pb-4">
              <button
                type="button"
                onClick={() => setActiveTab('mestre')}
                className={`py-2 px-1 rounded border text-[10px] sm:text-xs font-medieval tracking-wider transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer hover:border-medieval-gold/50 ${activeTab === 'mestre'
                    ? 'bg-medieval-gold/10 border-medieval-gold text-medieval-brightGold shadow-[0_0_10px_rgba(197,168,128,0.1)]'
                    : 'bg-medieval-charcoal/40 border-medieval-gold/10 text-medieval-silver'
                  }`}
              >
                <BookOpen className={`w-3.5 h-3.5 ${activeTab === 'mestre' ? 'text-medieval-brightGold animate-pulse' : 'text-medieval-silver/60'}`} />
                <span className="font-bold">Mestre</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rhodgar')}
                className={`py-2 px-1 rounded border text-[10px] sm:text-xs font-medieval tracking-wider transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer hover:border-medieval-gold/50 ${activeTab === 'rhodgar'
                    ? 'bg-medieval-wine/25 border-medieval-wine/60 text-medieval-brightGold shadow-[0_0_10px_rgba(88,28,32,0.15)]'
                    : 'bg-medieval-charcoal/40 border-medieval-gold/10 text-medieval-silver'
                  }`}
              >
                <Flame className={`w-3.5 h-3.5 ${activeTab === 'rhodgar' ? 'text-orange-400 animate-pulse' : 'text-medieval-silver/60'}`} />
                <span className="font-bold">Rhodgar</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ernest')}
                className={`py-2 px-1 rounded border text-[10px] sm:text-xs font-medieval tracking-wider transition-all duration-300 flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer hover:border-medieval-gold/50 ${activeTab === 'ernest'
                    ? 'bg-purple-950/20 border-purple-800/40 text-medieval-brightGold shadow-[0_0_10px_rgba(147,51,234,0.1)]'
                    : 'bg-medieval-charcoal/40 border-medieval-gold/10 text-medieval-silver'
                  }`}
              >
                <Scroll className={`w-3.5 h-3.5 ${activeTab === 'ernest' ? 'text-purple-400 animate-pulse' : 'text-medieval-silver/60'}`} />
                <span className="font-bold">Ernest</span>
              </button>
            </div>

            {/* Narrative Scroll Text (select-text enabled for copying stories) */}
            <div className="relative p-4 md:p-6 bg-medieval-charcoal/40 border-l-2 border-medieval-gold/30 rounded-r min-h-[160px] shadow-inner select-text">
              {activeTab === 'mestre' && (
                <div className="animate-fade-in space-y-2">
                  <h4 className="text-[9px] font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5 mb-2 opacity-80">
                    <BookOpen className="w-3 h-3 text-medieval-gold" />
                    <span>Pergaminho Sagrado do Mestre</span>
                  </h4>
                  <p className="text-sm sm:text-base text-medieval-parchment leading-relaxed text-justify whitespace-pre-line font-serif pl-1 first-letter:text-4xl first-letter:font-medieval first-letter:font-bold first-letter:text-medieval-brightGold first-letter:float-left first-letter:mr-2 first-letter:leading-none">
                    {memory.description}
                  </p>
                </div>
              )}

              {activeTab === 'rhodgar' && (
                <div className="animate-fade-in space-y-2">
                  <h4 className="text-[9px] font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5 mb-2 opacity-80">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span>Diário de Batalha de Rhodgar</span>
                  </h4>
                  <p className="text-sm sm:text-base text-medieval-parchment/90 leading-relaxed text-justify whitespace-pre-line font-serif pl-1 italic">
                    {memory.descriptionRhodgar || 'Nenhum registro de Rhodgar anotado para esta memória.'}
                  </p>
                </div>
              )}

              {activeTab === 'ernest' && (
                <div className="animate-fade-in space-y-2">
                  <h4 className="text-[9px] font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5 mb-2 opacity-80">
                    <Scroll className="w-3 h-3 text-purple-400" />
                    <span>Crônicas e Contos de Ernest</span>
                  </h4>
                  <p className="text-sm sm:text-base text-medieval-parchment/90 leading-relaxed text-justify whitespace-pre-line font-serif pl-1 italic">
                    {memory.descriptionErnest || 'Nenhum registro de Ernest anotado para esta memória.'}
                  </p>
                </div>
              )}
            </div>

            {/* Labels footer */}
            {memory.tags.length > 0 && (
              <div className="flex items-center space-x-2 border-t border-medieval-gold/10 pt-4 font-serif text-xs">
                <Tag className="w-3.5 h-3.5 text-medieval-gold shrink-0" />
                <span className="text-medieval-silver text-[10px] font-bold uppercase tracking-wider font-medieval">Etiquetas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {memory.tags.map(t => (
                    <span
                      key={t}
                      className="text-[10px] text-medieval-brightGold bg-medieval-stone/80 hover:bg-medieval-stone px-2.5 py-1 rounded border border-medieval-gold/20 hover:border-medieval-gold/40 shadow-sm transition-all"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Linked Photos Grid */}
          {linkedPhotos.length > 0 && (
            <div className="grimoire-card p-5 md:p-6 space-y-4 animate-fade-in">
              <h4 className="text-xs font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5 border-b border-medieval-gold/10 pb-2">
                <ImageIcon className="w-4 h-4" />
                <span>Fotos e Imagens Registradas ({linkedPhotos.length})</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {linkedPhotos.map(photo => (
                  <MemoryPhotoCard
                    key={photo.id}
                    photo={photo}
                    onClick={() => setLightboxPhotoId(photo.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Participating Heroes */}
        <div className="space-y-4">
          <h3 className="text-sm font-medieval text-medieval-gold uppercase tracking-wider border-b border-medieval-gold/15 pb-2 flex items-center space-x-2">
            <Users className="w-4 h-4 text-medieval-gold" />
            <span>Heróis Presentes</span>
          </h3>

          {participants === undefined ? (
            <div className="text-center py-4 text-xs font-serif text-medieval-silver">Carregando heróis...</div>
          ) : participants.length === 0 ? (
            <div className="grimoire-card p-6 text-center text-xs text-medieval-silver italic">
              Nenhum herói registrado participou deste feito.
            </div>
          ) : (
            <div className="space-y-3">
              {participants.map((entry) => {
                const { character, levelReached } = entry;
                return (
                  <ParticipantCard
                    key={character.id}
                    character={character}
                    levelReached={levelReached}
                  />
                );
              })}
            </div>
          )}
        </div>

      </div>

      {editModalOpen && (
        <MemoryModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          memoryToEdit={memory}
        />
      )}

      {lightboxPhotoId && (
        <PhotoLightbox
          photoId={lightboxPhotoId}
          onClose={() => setLightboxPhotoId(null)}
        />
      )}

    </div>
  );
};

// Sub-component for individual memory photo item
const MemoryPhotoCard: React.FC<{ photo: Media; onClick: () => void }> = ({ photo, onClick }) => {
  const url = useMediaUrl(photo.id, true); // use thumbnail
  return (
    <div
      onClick={onClick}
      className="grimoire-card grimoire-card-hover aspect-square overflow-hidden relative cursor-pointer group flex items-center justify-center bg-medieval-charcoal/50 border-medieval-gold/10"
    >
      {url ? (
        <img
          src={url}
          alt={photo.filename}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="text-[10px] text-medieval-silver">Lendo...</div>
      )}
    </div>
  );
};

// Sub-component for memory photo fullscreen lightbox
const PhotoLightbox: React.FC<{ photoId: string; onClose: () => void }> = ({ photoId, onClose }) => {
  const url = useMediaUrl(photoId); // load high resolution original
  return (
    <div
      className="fixed inset-0 z-50 bg-[#000000]/95 flex flex-col justify-center items-center p-4 animate-fade-in cursor-zoom-out"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-medieval-silver hover:text-medieval-gold transition-colors p-2 cursor-pointer"
      >
        <X className="w-8 h-8" />
      </button>
      <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {url ? (
          <img
            src={url}
            alt="Registro Visual em Alta Resolução"
            className="max-w-full max-h-full object-contain rounded border border-medieval-gold/30 shadow-gold"
          />
        ) : (
          <div className="text-medieval-gold animate-pulse text-sm font-medieval">Carregando imagem...</div>
        )}
      </div>
    </div>
  );
};

// Internal Sub-component for character list links
const ParticipantCard: React.FC<{ character: Character; levelReached?: number }> = ({ character, levelReached }) => {
  const { navigate } = useRouter();
  const avatarUrl = useMediaUrl(character.imageId, true); // Use thumbnail for side cards

  return (
    <div
      onClick={() => navigate({ type: 'character-profile', id: character.id })}
      className="grimoire-card grimoire-card-hover p-3 flex items-center justify-between cursor-pointer"
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div className="w-10 h-10 rounded border border-medieval-gold/30 overflow-hidden flex-shrink-0 bg-medieval-charcoal flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-medieval-gold/50 text-sm font-medieval">
              {character.name.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-medieval font-bold text-medieval-brightGold truncate leading-none">
            {character.name}
          </h4>
          <span className="text-[10px] text-medieval-silver truncate block mt-1">
            Nível {character.level} • {character.class}
          </span>
        </div>
      </div>

      {levelReached && (
        <div className="flex flex-col items-end flex-shrink-0 pl-2">
          <span className="text-[9px] font-medieval font-black uppercase text-medieval-charcoal bg-medieval-gold px-2 py-0.5 rounded flex items-center leading-none">
            <ArrowUpRight className="w-2.5 h-2.5 text-medieval-charcoal mr-0.5" />
            <span>Nv {levelReached}</span>
          </span>
          <span className="text-[8px] font-serif text-medieval-gold mt-0.5 leading-none">Subiu de Nível!</span>
        </div>
      )}
    </div>
  );
};
