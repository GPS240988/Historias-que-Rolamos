import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useRouter } from '../contexts/RouterContext';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { getCategoryColorClass } from './TimelineView';
import type { Character, Media } from '../types';
import {
  Calendar,
  Tag,
  Users,
  ArrowUpRight,
  Shield,
  FileText,
  X,
  Image as ImageIcon
} from 'lucide-react';


interface MemoryDetailViewProps {
  id: string;
}

export const MemoryDetailView: React.FC<MemoryDetailViewProps> = ({ id }) => {
  const { navigate } = useRouter();
  const [activeTab, setActiveTab] = useState<'mestre' | 'rhodgar' | 'ernest'>('mestre');
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);

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

      {/* Top Banner Cover Visual */}
      <div className="relative w-full h-80 rounded-lg overflow-hidden border border-medieval-gold/30 shadow-gold bg-medieval-charcoal/80 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={memory.title}
            className="w-full h-full object-cover filter brightness-[0.6] contrast-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-medieval-stone to-medieval-charcoal flex flex-col items-center justify-center text-medieval-gold/15">
            <Shield className="w-24 h-24 stroke-[1.2]" />
            <span className="font-medieval text-sm tracking-widest mt-2 uppercase">Sem Ilustração</span>
          </div>
        )}

        {/* Overlay category badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className={`text-[10px] font-serif uppercase tracking-widest px-3 py-1 border rounded shadow-md ${getCategoryColorClass(memory.type)}`}>
            {memory.type}
          </span>
        </div>
      </div>

      {/* Main Narrative card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Columns: Text details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grimoire-card p-6 md:p-8 space-y-6">
            <div>
              <span className="text-xs font-serif text-medieval-silver flex items-center mb-1">
                <Calendar className="w-4 h-4 mr-1 text-medieval-gold" />
                Ocorrido em: {new Date(memory.eventDate).toLocaleDateString('pt-BR')}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold font-medieval text-medieval-brightGold tracking-wider mt-1 border-b border-medieval-gold/15 pb-3">
                {memory.title}
              </h2>
            </div>

            {/* Narrator Tabs */}
            <div className="flex border-b border-medieval-gold/15 mb-4 overflow-x-auto scrollbar-none space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('mestre')}
                className={`py-1.5 px-3 text-xs font-medieval tracking-wider transition-all duration-200 border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'mestre'
                    ? 'border-medieval-gold text-medieval-brightGold font-bold'
                    : 'border-transparent text-medieval-silver hover:text-medieval-gold'
                }`}
              >
                Relato do Mestre
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rhodgar')}
                className={`py-1.5 px-3 text-xs font-medieval tracking-wider transition-all duration-200 border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'rhodgar'
                    ? 'border-medieval-gold text-medieval-brightGold font-bold'
                    : 'border-transparent text-medieval-silver hover:text-medieval-gold'
                }`}
              >
                Visão de Rhodgar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ernest')}
                className={`py-1.5 px-3 text-xs font-medieval tracking-wider transition-all duration-200 border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'ernest'
                    ? 'border-medieval-gold text-medieval-brightGold font-bold'
                    : 'border-transparent text-medieval-silver hover:text-medieval-gold'
                }`}
              >
                Crônicas de Ernest
              </button>
            </div>

            {/* Description relato */}
            <div className="space-y-3 min-h-[120px]">
              {activeTab === 'mestre' && (
                <div>
                  <h4 className="text-[10px] font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Relato Narrativo Mestre</span>
                  </h4>
                  <p className="text-sm md:text-base text-medieval-parchment leading-relaxed text-justify whitespace-pre-line font-serif pl-0 md:pl-2 mt-2">
                    {memory.description}
                  </p>
                </div>
              )}

              {activeTab === 'rhodgar' && (
                <div>
                  <h4 className="text-[10px] font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Relato Narrativo Rhodgar</span>
                  </h4>
                  <p className="text-sm md:text-base text-medieval-parchment leading-relaxed text-justify whitespace-pre-line font-serif pl-0 md:pl-2 mt-2 italic">
                    {memory.descriptionRhodgar || 'Nenhum registro de Rhodgar anotado para esta memória.'}
                  </p>
                </div>
              )}

              {activeTab === 'ernest' && (
                <div>
                  <h4 className="text-[10px] font-medieval text-medieval-gold uppercase tracking-widest flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Relato Narrativo Ernest</span>
                  </h4>
                  <p className="text-sm md:text-base text-medieval-parchment leading-relaxed text-justify whitespace-pre-line font-serif pl-0 md:pl-2 mt-2 italic">
                    {memory.descriptionErnest || 'Nenhum registro de Ernest anotado para esta memória.'}
                  </p>
                </div>
              )}
            </div>

            {/* Detalhes do rodapé de Etiquetas */}
            {memory.tags.length > 0 && (
              <div className="flex items-center space-x-2 border-t border-medieval-gold/10 pt-4 font-serif text-xs">
                <Tag className="w-4 h-4 text-medieval-gold" />
                <span className="text-medieval-silver">Etiquetas:</span>
                <div className="flex flex-wrap gap-1">
                  {memory.tags.map(t => (
                    <span
                      key={t}
                      className="text-[10px] text-medieval-parchment bg-medieval-stone px-2 py-0.5 rounded border border-medieval-gold/10"
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
            <div className="grimoire-card p-6 md:p-8 space-y-4">
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

        {/* Right Column: Participating Heroes Dossier Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-medieval text-medieval-gold border-b border-medieval-gold/15 pb-2 flex items-center space-x-2">
            <Users className="w-5 h-5 text-medieval-gold" />
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
