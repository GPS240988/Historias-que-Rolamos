import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Memory, Character } from '../../types';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { useRouter } from '../../contexts/RouterContext';
import { formatDisplayDate } from '../../utils/date';
import { getChronologicalChapterNumber } from '../../utils/roman';
import { getCategoryColorClass } from '../../views/TimelineView';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Calendar,
  Sparkles,
  Users,
  Edit3,
  Trash2,
  ArrowRight
} from 'lucide-react';

interface SpatialGrimoire3DProps {
  memories: Memory[];
  allCharacters: Character[];
  sortOrder?: 'asc' | 'desc';
  onEditMemory: (memory: Memory, e: React.MouseEvent) => void;
  onDeleteMemory: (memory: Memory, e: React.MouseEvent) => void;
}

export const SpatialGrimoire3D: React.FC<SpatialGrimoire3DProps> = ({
  memories,
  allCharacters,
  sortOrder = 'desc',
  onEditMemory,
  onDeleteMemory
}) => {
  const { navigate } = useRouter();
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number; glossX: number; glossY: number }>({
    rotateX: 0,
    rotateY: 0,
    glossX: 50,
    glossY: 50
  });

  // Touch / Drag interaction state
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep activeIndex within bounds when memories array updates
  useEffect(() => {
    if (activeIndex >= memories.length) {
      setActiveIndex(Math.max(0, memories.length - 1));
    }
  }, [memories.length, activeIndex]);

  // Reset to first memory (newest/oldest) when sortOrder changes
  useEffect(() => {
    setActiveIndex(0);
  }, [sortOrder]);

  const handleNext = useCallback(() => {
    setActiveIndex(prev => Math.min(prev + 1, memories.length - 1));
    setTilt({ rotateX: 0, rotateY: 0, glossX: 50, glossY: 50 });
  }, [memories.length]);

  const handlePrev = useCallback(() => {
    setActiveIndex(prev => Math.max(prev - 1, 0));
    setTilt({ rotateX: 0, rotateY: 0, glossX: 50, glossY: 50 });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input or modal
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(memories.length - 1);
      } else if (e.key === 'Enter') {
        const activeMem = memories[activeIndex];
        if (activeMem) {
          navigate({ type: 'memory-detail', id: activeMem.id });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, memories, activeIndex, navigate]);

  // Controlled horizontal / shift-wheel handling:
  // We NEVER hijack standard vertical scroll (deltaY), ensuring the user can scroll
  // the page naturally up and down without accidentally flipping cards.
  const lastWheelTime = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    // Only flip cards if user is explicitly scrolling horizontally (e.g., trackpad)
    // or holding Shift for horizontal intention
    const isHorizontalIntent = e.shiftKey || (Math.abs(e.deltaX) > 40 && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5);
    if (!isHorizontalIntent) return;

    const now = Date.now();
    if (now - lastWheelTime.current < 300) return;

    const delta = e.shiftKey ? e.deltaY : e.deltaX;
    if (Math.abs(delta) > 30) {
      lastWheelTime.current = now;
      if (delta > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  // Holographic 3D Tilt on active central card
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - card.left;
    const y = e.clientY - card.top;
    const centerX = card.width / 2;
    const centerY = card.height / 2;

    const rotateX = ((y - centerY) / centerY) * -7;
    const rotateY = ((x - centerX) / centerX) * 7;
    const glossX = (x / card.width) * 100;
    const glossY = (y / card.height) * 100;

    setTilt({ rotateX, rotateY, glossX, glossY });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, glossX: 50, glossY: 50 });
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setDragStartX(e.touches[0].clientX);
      setDragCurrentX(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartX !== null && e.touches.length === 1) {
      setDragCurrentX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (dragStartX !== null && dragCurrentX !== null) {
      const diff = dragStartX - dragCurrentX;
      if (diff > 50) {
        handleNext();
      } else if (diff < -50) {
        handlePrev();
      }
    }
    setDragStartX(null);
    setDragCurrentX(null);
  };

  if (!memories || memories.length === 0) {
    return (
      <div className="grimoire-card p-12 text-center text-medieval-silver font-serif max-w-lg mx-auto">
        <Sparkles className="w-8 h-8 text-medieval-gold mx-auto mb-2 opacity-60" />
        <p className="font-medieval text-sm text-medieval-gold">Nenhum manuscrito encontrado.</p>
        <span className="text-xs text-medieval-silver/70 block mt-1">
          Escreva a primeira memória da campanha para ativar o Grimório 3D.
        </span>
      </div>
    );
  }

  const activeMemory = memories[activeIndex];

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full select-none focus:outline-none py-4"
      tabIndex={0}
      aria-label="Grimório 3D de Memórias"
    >
      {/* 3D Arcane Stage */}
      <div className="relative w-full h-[580px] sm:h-[620px] md:h-[650px] flex items-center justify-center overflow-hidden perspective-container">
        
        {/* Arcane Ambient Light Rays and Runes */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[320px] sm:w-[460px] md:w-[600px] h-[320px] sm:h-[460px] md:h-[600px] rounded-full bg-radial from-medieval-gold/10 via-medieval-gold/2 to-transparent blur-2xl transform-gpu animate-pulse" />
          <div className="absolute w-[400px] md:w-[580px] h-[400px] md:h-[580px] rounded-full border border-medieval-gold/10 border-dashed animate-[spin_120s_linear_infinite]" />
        </div>

        {/* 3D Stack of Cards */}
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {memories.map((memory, index) => {
            const diff = index - activeIndex;
            // Render only cards in visual range [-3, 3] for maximum GPU performance
            if (Math.abs(diff) > 3) return null;

            const isCenter = diff === 0;

            // Mathematical positioning for elliptical spatial ring
            const translateX = diff * (typeof window !== 'undefined' && window.innerWidth < 640 ? 220 : 280);
            const translateZ = isCenter ? 65 : -Math.abs(diff) * 140;
            const rotateY = diff * -24;
            const scale = Math.max(0.68, 1 - Math.abs(diff) * 0.12);
            const opacity = isCenter ? 1 : Math.max(0.2, 0.85 - Math.abs(diff) * 0.28);
            const zIndex = 50 - Math.abs(diff);

            return (
              <div
                key={memory.id}
                onClick={() => {
                  if (!isCenter) setActiveIndex(index);
                }}
                onMouseMove={isCenter ? handleMouseMove : undefined}
                onMouseLeave={isCenter ? handleMouseLeave : undefined}
                style={{
                  transform: isCenter
                    ? `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY + tilt.rotateY}deg) rotateX(${tilt.rotateX}deg) scale(${scale})`
                    : `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  transformStyle: 'preserve-3d',
                  willChange: 'transform, opacity',
                  transition: isCenter
                    ? 'transform 0.1s ease-out, opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                    : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease'
                }}
                className={`absolute w-[300px] sm:w-[360px] md:w-[410px] h-[500px] sm:h-[530px] md:h-[560px] rounded-xl cursor-pointer ${
                  isCenter ? 'cursor-default pointer-events-auto' : 'pointer-events-auto hover:brightness-110'
                }`}
              >
                <GrimoireCardContent
                  memory={memory}
                  isCenter={isCenter}
                  allCharacters={allCharacters}
                  glossX={tilt.glossX}
                  glossY={tilt.glossY}
                  onInspect={() => navigate({ type: 'memory-detail', id: memory.id })}
                  onSelectCharacter={(charId) => navigate({ type: 'character-profile', id: charId })}
                  onEdit={(e) => onEditMemory(memory, e)}
                  onDelete={(e) => onDeleteMemory(memory, e)}
                />
              </div>
            );
          })}
        </div>

        {/* Cinematic Left & Right Navigation Orbs */}
        {activeIndex > 0 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-40 p-2.5 sm:p-3 rounded-full bg-medieval-charcoal/80 border border-medieval-gold/40 text-medieval-gold hover:text-medieval-brightGold hover:border-medieval-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] backdrop-blur-md transition-all duration-300 transform hover:scale-110 active:scale-95"
            title="Sessão Anterior (Seta Esquerda)"
            aria-label="Sessão Anterior"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {activeIndex < memories.length - 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-40 p-2.5 sm:p-3 rounded-full bg-medieval-charcoal/80 border border-medieval-gold/40 text-medieval-gold hover:text-medieval-brightGold hover:border-medieval-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] backdrop-blur-md transition-all duration-300 transform hover:scale-110 active:scale-95"
            title="Próxima Sessão (Seta Direita)"
            aria-label="Próxima Sessão"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* Bottom Chronological Scrubber & Era Nodes */}
      <div className="mt-4 flex flex-col items-center space-y-3 px-4 max-w-2xl mx-auto">
        
        {/* Session Indicator Badge */}
        <div className="flex items-center space-x-2 text-xs font-serif">
          <span className="text-medieval-gold font-medieval tracking-widest uppercase">
            Memória {getChronologicalChapterNumber(activeIndex, memories.length, sortOrder)} de {memories.length}
          </span>
          <span className="text-medieval-silver/40">•</span>
          <span className="text-medieval-silver">
            {formatDisplayDate(activeMemory.eventDate)}
          </span>
        </div>

        {/* Timeline Rune Track - Adaptativo para poucas ou muitas memórias */}
        {memories.length <= 16 ? (
          <div className="relative w-full flex items-center justify-between py-2">
            {/* Glowing track bar */}
            <div className="absolute inset-x-0 h-0.5 bg-medieval-gold/20" />
            <div
              className="absolute left-0 h-0.5 bg-medieval-gold transition-all duration-300 shadow-[0_0_10px_rgba(212,175,55,0.5)]"
              style={{
                width: `${(activeIndex / Math.max(1, memories.length - 1)) * 100}%`
              }}
            />

            {/* Scrubber Nodes */}
            {memories.map((m, idx) => {
              const isActive = idx === activeIndex;
              const isPassed = idx < activeIndex;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  title={`${m.title} (${formatDisplayDate(m.eventDate)})`}
                  className={`relative z-10 rounded-full transition-all duration-300 flex items-center justify-center ${
                    isActive
                      ? 'w-6 h-6 bg-medieval-gold text-medieval-charcoal font-bold shadow-[0_0_15px_rgba(212,175,55,0.7)] scale-110'
                      : isPassed
                      ? 'w-4 h-4 bg-medieval-gold/60 hover:bg-medieval-gold text-transparent'
                      : 'w-3.5 h-3.5 bg-medieval-stone border border-medieval-gold/30 hover:border-medieval-gold text-transparent'
                  }`}
                >
                  {isActive && (
                    <span className="text-[10px] font-mono leading-none">
                      {getChronologicalChapterNumber(idx, memories.length, sortOrder)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="relative w-full py-2 flex items-center space-x-3">
            <span className="text-[10px] font-mono text-medieval-silver/50 font-bold">1</span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={memories.length - 1}
                value={activeIndex}
                onChange={(e) => setActiveIndex(Number(e.target.value))}
                className="w-full h-1.5 bg-medieval-stone rounded-lg appearance-none cursor-pointer accent-medieval-gold"
                aria-label="Navegador Cronológico de Memórias"
              />
            </div>
            <span className="text-[10px] font-mono text-medieval-silver/50 font-bold">{memories.length}</span>
          </div>
        )}

        {/* Quick Keyboard Helper Guide */}
        <div className="text-[10px] text-medieval-silver/50 font-serif flex items-center space-x-3">
          <span>Use <kbd className="px-1.5 py-0.5 rounded bg-medieval-stone border border-medieval-gold/20 text-medieval-gold font-mono">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-medieval-stone border border-medieval-gold/20 text-medieval-gold font-mono">→</kbd> para navegar</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-medieval-stone border border-medieval-gold/20 text-medieval-gold font-mono">Enter</kbd> para abrir</span>
        </div>

      </div>
    </div>
  );
};

interface GrimoireCardContentProps {
  memory: Memory;
  isCenter: boolean;
  allCharacters: Character[];
  glossX: number;
  glossY: number;
  onInspect: () => void;
  onSelectCharacter: (charId: string) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

const GrimoireCardContent: React.FC<GrimoireCardContentProps> = ({
  memory,
  isCenter,
  allCharacters,
  glossX,
  glossY,
  onInspect,
  onSelectCharacter,
  onEdit,
  onDelete
}) => {
  const imageUrl = useMediaUrl(memory.imageId);
  const [voiceTab, setVoiceTab] = useState<'mestre' | string>('mestre');

  // List of heroes with personal accounts in this memory
  const heroAccounts = Object.keys(memory.heroDescriptions || {}).filter(
    id => !!memory.heroDescriptions?.[id]?.trim()
  );

  const charactersPresent = allCharacters.filter(c => memory.characterIds.includes(c.id));

  // Determine active displayed narrative text
  const currentNarrative = voiceTab === 'mestre'
    ? memory.description
    : (memory.heroDescriptions?.[voiceTab] || memory.description);

  const activeSpeakerName = voiceTab === 'mestre'
    ? 'Relato do Mestre'
    : allCharacters.find(c => c.id === voiceTab)?.name || 'Herói';

  return (
    <div
      className={`w-full h-full rounded-xl bg-medieval-charcoal/95 border transition-all duration-300 flex flex-col overflow-hidden relative shadow-2xl ${
        isCenter
          ? 'border-medieval-gold/70 shadow-[0_0_35px_rgba(212,175,55,0.35)]'
          : 'border-medieval-gold/20 hover:border-medieval-gold/40'
      }`}
    >
      {/* Holographic dynamic gloss reflection on active card */}
      {isCenter && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl z-30 transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle at ${glossX}% ${glossY}%, rgba(212, 175, 55, 0.15) 0%, transparent 65%)`
          }}
        />
      )}

      {/* Card Header */}
      <div className="p-3 sm:p-4 pb-2 border-b border-medieval-gold/15 flex items-center justify-between gap-2 shrink-0 bg-medieval-stone/30">
        <div className="flex items-center space-x-2 min-w-0">
          <span className={`text-[9px] font-serif border px-2 py-0.5 rounded-sm uppercase tracking-wider shrink-0 ${getCategoryColorClass(memory.type)}`}>
            {memory.type}
          </span>
          <span className="text-[10px] font-serif text-medieval-silver/60 flex items-center space-x-1 shrink-0">
            <Calendar className="w-3 h-3 text-medieval-gold" />
            <span>{formatDisplayDate(memory.eventDate)}</span>
          </span>
        </div>

        {/* Actions Menu */}
        <div className="flex items-center space-x-1 shrink-0" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded hover:bg-medieval-gold/15 text-medieval-silver hover:text-medieval-gold transition-colors"
            title="Editar Memória"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded hover:bg-medieval-wine/30 text-medieval-silver hover:text-red-400 transition-colors"
            title="Excluir Memória"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Memory Illustration / Arcane Emblem Header */}
      <div className="relative w-full h-36 sm:h-40 bg-medieval-charcoal overflow-hidden shrink-0 border-b border-medieval-gold/15">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={memory.title}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-radial from-medieval-stone/50 to-medieval-charcoal p-4 text-center">
            <BookOpen className="w-10 h-10 text-medieval-gold/30 mb-1" />
            <span className="text-[10px] font-medieval text-medieval-gold/40 uppercase tracking-widest">
              Memória Registrada
            </span>
          </div>
        )}

        {/* Vignette Shadow on Image */}
        <div className="absolute inset-0 bg-gradient-to-t from-medieval-charcoal via-transparent to-transparent pointer-events-none" />

        {/* Title Overlay in bottom of illustration */}
        <div className="absolute bottom-2 inset-x-3 pointer-events-none">
          <h3 className="text-base sm:text-lg font-medieval font-bold text-medieval-brightGold drop-shadow-md truncate leading-tight">
            {memory.title}
          </h3>
        </div>
      </div>

      {/* Voice / Narrator Switcher Pills */}
      {heroAccounts.length > 0 && (
        <div className="px-3 pt-2 pb-1 flex items-center space-x-1.5 overflow-x-auto scrollbar-none border-b border-medieval-gold/10 shrink-0 text-xs">
          <span className="text-[9px] uppercase font-medieval text-medieval-silver/50 mr-0.5">Voz:</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setVoiceTab('mestre');
            }}
            className={`py-0.5 px-2 rounded text-[10px] font-serif transition-colors ${
              voiceTab === 'mestre'
                ? 'bg-medieval-gold text-medieval-charcoal font-bold shadow-sm'
                : 'bg-medieval-stone/60 text-medieval-silver hover:text-medieval-gold'
            }`}
          >
            Mestre
          </button>
          {heroAccounts.map(charId => {
            const char = allCharacters.find(c => c.id === charId);
            const isSelected = voiceTab === charId;
            return (
              <button
                key={charId}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setVoiceTab(charId);
                }}
                className={`py-0.5 px-2 rounded text-[10px] font-serif transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-medieval-gold text-medieval-charcoal font-bold shadow-sm'
                    : 'bg-medieval-stone/60 text-medieval-silver hover:text-medieval-gold'
                }`}
              >
                {char?.name.split(' ')[0] || 'Herói'}
              </button>
            );
          })}
        </div>
      )}

      {/* Narrative Excerpt */}
      <div
        onWheel={(e) => e.stopPropagation()}
        className="flex-1 p-3 sm:p-4 overflow-y-auto scrollbar-thin text-xs font-serif leading-relaxed text-medieval-parchment/90 space-y-2 select-text"
      >
        <div className="text-[10px] font-medieval text-medieval-gold flex items-center space-x-1">
          <Sparkles className="w-3 h-3" />
          <span>{activeSpeakerName}</span>
        </div>
        <p className="whitespace-pre-line text-justify italic line-clamp-6">
          "{currentNarrative}"
        </p>
      </div>

      {/* Card Footer: Characters and CTA */}
      <div className="p-3 border-t border-medieval-gold/15 bg-medieval-stone/20 shrink-0 flex items-center justify-between gap-2">
        
        {/* Participating Characters Icons with Avatars */}
        <div className="flex items-center space-x-1.5 min-w-0">
          <Users className="w-3.5 h-3.5 text-medieval-gold/60 shrink-0" />
          <div className="flex items-center -space-x-1.5 overflow-visible">
            {charactersPresent.slice(0, 4).map(char => (
              <HeroAvatarBadge
                key={char.id}
                character={char}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCharacter(char.id);
                }}
              />
            ))}
            {charactersPresent.length > 4 && (
              <span className="text-[9px] text-medieval-silver font-mono pl-2">
                +{charactersPresent.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Read Full Memory CTA Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInspect();
          }}
          className="btn-gold py-1 px-3 text-[11px] font-serif flex items-center space-x-1 shadow-sm shrink-0 hover:scale-105 transition-transform"
        >
          <span>Ler Memória</span>
          <ArrowRight className="w-3 h-3" />
        </button>

      </div>
    </div>
  );
};

// Avatar Badge com foto e hover dourado interativo
const HeroAvatarBadge: React.FC<{
  character: Character;
  onClick: (e: React.MouseEvent) => void;
}> = ({ character, onClick }) => {
  const avatarUrl = useMediaUrl(character.imageId, true);
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-medieval-gold/60 bg-medieval-charcoal overflow-hidden shadow-sm hover:border-medieval-brightGold hover:scale-125 hover:z-30 hover:shadow-[0_0_10px_rgba(212,175,55,0.7)] transition-all duration-300 flex items-center justify-center cursor-pointer shrink-0"
      title={`${character.name} (${character.class || 'Herói'}) — Ver perfil`}
      aria-label={`Ver perfil de ${character.name}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={character.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-[9px] font-medieval text-medieval-gold font-bold">
          {character.name.charAt(0).toUpperCase()}
        </span>
      )}
    </button>
  );
};
