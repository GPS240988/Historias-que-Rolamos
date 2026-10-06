import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Memory, Character } from '../../types';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { useRouter } from '../../contexts/RouterContext';
import { useCampaign } from '../../contexts/CampaignContext';
import { formatDisplayDate } from '../../utils/date';
import { toRomanNumeral, getChronologicalChapterNumber } from '../../utils/roman';
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
  ArrowRight,
  Search,
  Maximize2,
  Minimize2,
  Bookmark,
  Scroll,
  X,
  Feather
} from 'lucide-react';

/* =========================================================================
   ORNAMENTOS MEDIEVAIS VETORIAIS (ARTE EXCLUSIVA PARA O TOMO SAGRADO)
   Desenhados à mão em SVG para emular gravuras em metal e iluminuras góticas.
   ========================================================================= */

// Cantoneira de Canto Ornamental em Latão/Ouro
const CornerFiligree: React.FC<{
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}> = ({ position, className = 'w-10 h-10 text-medieval-gold/40' }) => {
  const rotationClass = {
    'top-left': '',
    'top-right': 'rotate-90',
    'bottom-right': 'rotate-180',
    'bottom-left': '-rotate-90'
  }[position];

  return (
    <svg
      viewBox="0 0 40 40"
      fill="currentColor"
      className={`pointer-events-none select-none transition-opacity duration-300 ${rotationClass} ${className}`}
      aria-hidden="true"
    >
      {/* Vértice exterior reforçado */}
      <path d="M2 2 H14 V4 H4 V14 H2 Z" opacity="0.8" />
      {/* Nó gótico e voluta interior */}
      <path
        d="M6 6 C10 6 14 10 14 14 C14 12 16 10 18 10 C14 8 10 4 6 6 Z"
        opacity="0.6"
      />
      <circle cx="9" cy="9" r="1.5" opacity="0.9" />
      <circle cx="4" cy="20" r="1" opacity="0.5" />
      <circle cx="20" cy="4" r="1" opacity="0.5" />
      {/* Arabesco decorativo */}
      <path
        d="M4 22 C6 18 10 16 14 18 C11 16 9 13 9 10 C7 14 5 18 4 22 Z"
        opacity="0.4"
      />
      <path
        d="M22 4 C18 6 16 10 18 14 C16 11 13 9 10 9 C14 7 18 5 22 4 Z"
        opacity="0.4"
      />
    </svg>
  );
};

// Vinheta / Divisor Heráldico Central (Fleuron Medieval)
const MedievalDivider: React.FC<{ className?: string }> = ({ className = 'my-3 text-medieval-gold/40' }) => (
  <div className={`flex items-center justify-center space-x-2 select-none pointer-events-none ${className}`}>
    <div className="h-px bg-gradient-to-r from-transparent via-medieval-gold/30 to-medieval-gold/60 flex-1 max-w-[80px]" />
    <svg viewBox="0 0 24 16" fill="currentColor" className="w-5 h-3 text-medieval-gold/70">
      <path d="M12 0 C10 4 6 6 0 8 C6 10 10 12 12 16 C14 12 18 10 24 8 C18 6 14 4 12 0 Z" />
      <circle cx="12" cy="8" r="1.5" className="text-medieval-brightGold" />
    </svg>
    <div className="h-px bg-gradient-to-l from-transparent via-medieval-gold/30 to-medieval-gold/60 flex-1 max-w-[80px]" />
  </div>
);

interface SacredTomeBookProps {
  memories: Memory[];
  allCharacters: Character[];
  sortOrder?: 'asc' | 'desc';
  onEditMemory: (memory: Memory, e: React.MouseEvent) => void;
  onDeleteMemory: (memory: Memory, e: React.MouseEvent) => void;
}

export const SacredTomeBook: React.FC<SacredTomeBookProps> = ({
  memories,
  allCharacters,
  sortOrder = 'desc',
  onEditMemory,
  onDeleteMemory
}) => {
  const { navigate } = useRouter();
  const { campaign } = useCampaign();

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isFlipping, setIsFlipping] = useState<'next' | 'prev' | null>(null);
  const [isTocOpen, setIsTocOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mobilePageMode, setMobilePageMode] = useState<'verso' | 'recto'>('verso');
  const [tocFilter, setTocFilter] = useState<string>('');

  const tomeContainerRef = useRef<HTMLDivElement>(null);

  // Garantir índice dentro dos limites
  useEffect(() => {
    if (activeIndex >= memories.length) {
      setActiveIndex(Math.max(0, memories.length - 1));
    }
  }, [memories.length, activeIndex]);

  // Resetar para a primeira memória exibida sempre que a ordenação sortOrder mudar
  useEffect(() => {
    setActiveIndex(0);
  }, [sortOrder]);

  // Navegação para a próxima sessão com animação física de virar página
  const handleNextPage = useCallback(() => {
    if (activeIndex >= memories.length - 1 || isFlipping) return;
    setIsFlipping('next');
    setTimeout(() => {
      setActiveIndex(prev => Math.min(prev + 1, memories.length - 1));
      setIsFlipping(null);
    }, 550);
  }, [activeIndex, memories.length, isFlipping]);

  // Navegação para a sessão anterior com animação física de virar página
  const handlePrevPage = useCallback(() => {
    if (activeIndex <= 0 || isFlipping) return;
    setIsFlipping('prev');
    setTimeout(() => {
      setActiveIndex(prev => Math.max(prev - 1, 0));
      setIsFlipping(null);
    }, 550);
  }, [activeIndex, isFlipping]);

  // Saltar diretamente para um capítulo através do Sumário
  const handleJumpToChapter = useCallback((index: number) => {
    if (index === activeIndex || isFlipping) {
      setIsTocOpen(false);
      return;
    }
    const dir = index > activeIndex ? 'next' : 'prev';
    setIsFlipping(dir);
    setTimeout(() => {
      setActiveIndex(index);
      setIsFlipping(null);
      setIsTocOpen(false);
    }, 350);
  }, [activeIndex, isFlipping]);

  // Teclado para navegação do Tomo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleJumpToChapter(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        handleJumpToChapter(memories.length - 1);
      } else if (e.key === 'Escape' && isTocOpen) {
        e.preventDefault();
        setIsTocOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage, handleJumpToChapter, memories.length, isTocOpen]);

  // Touch Swipe para dispositivos móveis
  const touchStartXRef = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null && e.changedTouches.length === 1) {
      const diff = touchStartXRef.current - e.changedTouches[0].clientX;
      if (diff > 55) {
        handleNextPage();
      } else if (diff < -55) {
        handlePrevPage();
      }
    }
    touchStartXRef.current = null;
  };

  // Filtragem do Sumário do Tomo
  const filteredChapters = useMemo(() => {
    if (!tocFilter.trim()) return memories.map((m, idx) => ({ memory: m, index: idx }));
    const q = tocFilter.toLowerCase().trim();
    return memories
      .map((m, idx) => ({ memory: m, index: idx }))
      .filter(({ memory }) =>
        memory.title.toLowerCase().includes(q) ||
        memory.type.toLowerCase().includes(q) ||
        memory.eventDate.includes(q) ||
        memory.tags.some(t => t.toLowerCase().includes(q))
      );
  }, [memories, tocFilter]);

  if (!memories || memories.length === 0) {
    return (
      <div className="grimoire-card p-12 text-center text-medieval-silver font-serif max-w-lg mx-auto">
        <Scroll className="w-10 h-10 text-medieval-gold mx-auto mb-3 opacity-60" />
        <h3 className="font-medieval text-base text-medieval-gold font-bold">O Tomo Repousa em Silêncio</h3>
        <p className="text-xs text-medieval-silver/80 mt-1 leading-relaxed">
          Nenhuma memória foi registrada até o momento nesta campanha. Escreva a primeira memória para dar vida às folhas sagradas do compêndio.
        </p>
      </div>
    );
  }

  const currentMemory = memories[activeIndex];
  const currentChapterNum = getChronologicalChapterNumber(activeIndex, memories.length, sortOrder);
  const currentRoman = toRomanNumeral(currentChapterNum);

  return (
    <div
      ref={tomeContainerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full select-none transition-all duration-500 ${
        isFullscreen ? 'fixed inset-0 z-50 bg-medieval-charcoal/95 p-2 sm:p-6 flex flex-col justify-center items-center backdrop-blur-md overflow-y-auto' : 'py-3'
      }`}
      aria-label="O Tomo Sagrado - Compêndio de Memórias"
    >
      {/* Barra de Ferramentas Superior do Escriba / Compêndio */}
      <div className="w-full max-w-6xl mx-auto mb-3 flex items-center justify-between px-2 sm:px-4">
        {/* Sumário / Índice do Tomo Button */}
        <button
          type="button"
          onClick={() => setIsTocOpen(true)}
          className="btn-stone py-1.5 px-3 text-xs flex items-center space-x-2 transition-all duration-300 shadow-sm hover:border-medieval-gold"
          title="Abrir Sumário das Memórias (Índice)"
          aria-label="Abrir Sumário das Memórias"
        >
          <Bookmark className="w-3.5 h-3.5 text-medieval-gold" />
          <span className="font-medieval tracking-wider uppercase text-[11px]">Sumário do Tomo</span>
          <span className="bg-medieval-gold/20 text-medieval-brightGold text-[10px] font-mono px-1.5 py-0.2 rounded-full">
            {memories.length}
          </span>
        </button>

        {/* Indicador Central de Página do Compêndio */}
        <div className="hidden sm:flex items-center space-x-2 text-xs font-serif text-medieval-silver">
          <Feather className="w-3.5 h-3.5 text-medieval-gold" />
          <span className="font-medieval text-medieval-gold uppercase tracking-widest text-[11px]">
            Memória {currentRoman}
          </span>
          <span className="text-medieval-silver/40">•</span>
          <span className="text-[11px]">
            {currentChapterNum === memories.length
              ? 'Último Registro Escrito'
              : currentChapterNum === 1
              ? 'Início da Jornada'
              : `Registro ${currentChapterNum} de ${memories.length}`}
          </span>
        </div>

        {/* Ações Rápidas: Tela Cheia & Navegação */}
        <div className="flex items-center space-x-2">
          {/* Alternador Mobile Verso / Reto */}
          <div className="flex lg:hidden bg-medieval-stone/80 border border-medieval-gold/20 rounded p-0.5 text-[10px] font-medieval">
            <button
              type="button"
              onClick={() => setMobilePageMode('verso')}
              className={`px-2 py-0.5 rounded transition-colors ${mobilePageMode === 'verso' ? 'bg-medieval-gold text-medieval-charcoal font-bold' : 'text-medieval-silver'}`}
            >
              Ilustração
            </button>
            <button
              type="button"
              onClick={() => setMobilePageMode('recto')}
              className={`px-2 py-0.5 rounded transition-colors ${mobilePageMode === 'recto' ? 'bg-medieval-gold text-medieval-charcoal font-bold' : 'text-medieval-silver'}`}
            >
              Manuscrito
            </button>
          </div>

          {/* Botão de Tela Cheia Imersiva (Luz de Velas) */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded bg-medieval-stone/60 border border-medieval-gold/20 text-medieval-silver hover:text-medieval-gold hover:border-medieval-gold transition-colors"
            title={isFullscreen ? 'Sair do Modo de Leitura Focada' : 'Modo Leitura Imersiva (Luz de Velas)'}
            aria-label="Alternar Modo Imersivo"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* =========================================================================
          ESTRUTURA FÍSICA DO LIVRO (ENCADERNAÇÃO, LOMBO E FOLHA DUPLA)
          ========================================================================= */}
      <div className="relative w-full max-w-6xl mx-auto">
        {/* Moldura da Capa de Couro/Metal (Leather Hardcover Case) */}
        <div className="relative rounded-2xl bg-gradient-to-b from-[#181512] via-[#0E0C0A] to-[#161310] p-3 sm:p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(197,168,128,0.12)] border-2 border-medieval-gold/30">
          
          {/* Cantoneiras Metálicas de Latão nas 4 Pontas da Capa */}
          <CornerFiligree position="top-left" className="absolute top-2 left-2 w-8 h-8 sm:w-12 sm:h-12 text-medieval-gold/70" />
          <CornerFiligree position="top-right" className="absolute top-2 right-2 w-8 h-8 sm:w-12 sm:h-12 text-medieval-gold/70" />
          <CornerFiligree position="bottom-left" className="absolute bottom-2 left-2 w-8 h-8 sm:w-12 sm:h-12 text-medieval-gold/70" />
          <CornerFiligree position="bottom-right" className="absolute bottom-2 right-2 w-8 h-8 sm:w-12 sm:h-12 text-medieval-gold/70" />

          {/* Costura Perimetral de Linha Dourada Envelhecida */}
          <div className="absolute inset-2 sm:inset-3 border border-dashed border-medieval-gold/20 rounded-xl pointer-events-none" />

          {/* PALCO CENTRAL DAS PÁGINAS (DUAL SPREAD / FOLHA DUPLA) */}
          <div
            className="relative w-full min-h-[580px] md:min-h-[640px] lg:h-[680px] rounded-lg overflow-hidden flex flex-col lg:flex-row shadow-2xl bg-[#0F0E0C]"
            style={{ perspective: '2200px' }}
          >
            {/* =========================================================
                FOLHA ESQUERDA (VERSO) - O REGISTRO VISUAL E HEROICO
                ========================================================= */}
            <div
              className={`w-full lg:w-1/2 h-full flex flex-col justify-between p-4 sm:p-6 md:p-8 relative transition-all duration-300 ${
                mobilePageMode === 'verso' ? 'flex' : 'hidden lg:flex'
              }`}
              style={{
                background: 'linear-gradient(135deg, #151412 0%, #11100E 100%)',
                borderRight: '1px solid rgba(197, 168, 128, 0.1)'
              }}
            >
              {/* Textura de Pergaminho & Cantoneiras Internas */}
              <CornerFiligree position="top-left" className="absolute top-3 left-3 w-6 h-6 text-medieval-gold/30" />
              <CornerFiligree position="bottom-left" className="absolute bottom-3 left-3 w-6 h-6 text-medieval-gold/30" />

              {/* Sombra da dobra do lombo à direita da folha esquerda */}
              <div className="absolute inset-y-0 right-0 w-8 pointer-events-none bg-gradient-to-l from-black/60 to-transparent hidden lg:block" />

              {/* Cabeçalho da Folha Verso */}
              <div className="flex items-center justify-between pb-3 border-b border-medieval-gold/15 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medieval text-[11px] text-medieval-gold uppercase tracking-widest font-bold">
                    Pergaminho {currentRoman}
                  </span>
                  <span className="text-medieval-silver/40">•</span>
                  <span className={`text-[9px] font-serif border px-2 py-0.5 rounded-sm uppercase tracking-wider ${getCategoryColorClass(currentMemory.type)}`}>
                    {currentMemory.type}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 text-xs text-medieval-silver/70 font-serif">
                  <Calendar className="w-3.5 h-3.5 text-medieval-gold" />
                  <span>{formatDisplayDate(currentMemory.eventDate)}</span>
                </div>
              </div>

              {/* Corpo da Folha Verso: Ilustração Emoldurada Medieval */}
              <div className="my-auto py-4 flex flex-col items-center justify-center">
                {/* Moldura Gótica da Ilustração */}
                <div className="relative w-full max-w-md aspect-[16/10] sm:aspect-[16/11] rounded-lg border-2 border-medieval-gold/40 shadow-inner overflow-hidden bg-black/50 group">
                  <MemoryIllustrationImage memory={currentMemory} />

                  {/* Cantoneiras da Moldura de Arte */}
                  <CornerFiligree position="top-left" className="absolute top-1 left-1 w-5 h-5 text-medieval-gold/80" />
                  <CornerFiligree position="top-right" className="absolute top-1 right-1 w-5 h-5 text-medieval-gold/80" />
                  <CornerFiligree position="bottom-left" className="absolute bottom-1 left-1 w-5 h-5 text-medieval-gold/80" />
                  <CornerFiligree position="bottom-right" className="absolute bottom-1 right-1 w-5 h-5 text-medieval-gold/80" />
                </div>

                {/* Título da Crônica em Fraunces e Divisor Heráldico */}
                <div className="w-full text-center mt-4 px-2">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-medieval font-bold text-medieval-brightGold tracking-wide leading-tight drop-shadow-sm">
                    {currentMemory.title}
                  </h2>
                  <MedievalDivider className="my-2" />
                </div>

                {/* Os Heróis Presentes (Dramatis Personae) */}
                <div className="w-full mt-2 bg-medieval-stone/30 border border-medieval-gold/15 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medieval uppercase tracking-wider text-medieval-gold flex items-center space-x-1.5">
                      <Users className="w-3 h-3 text-medieval-gold" />
                      <span>Comitiva de Heróis</span>
                    </span>
                    <span className="text-[10px] text-medieval-silver font-mono">
                      {currentMemory.characterIds.length} presente(s)
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {currentMemory.characterIds.length > 0 ? (
                      currentMemory.characterIds.map(charId => {
                        const hero = allCharacters.find(c => c.id === charId);
                        if (!hero) return null;
                        return (
                          <button
                            key={charId}
                            type="button"
                            onClick={() => navigate({ type: 'character-profile', id: hero.id })}
                            className="inline-flex items-center space-x-1 bg-medieval-stone/70 border border-medieval-gold/30 hover:border-medieval-gold px-2 py-0.5 rounded text-[11px] text-medieval-brightGold hover:bg-medieval-gold/10 transition-colors"
                            title={`Ver perfil de ${hero.name}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-medieval-gold" />
                            <span>{hero.name}</span>
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-medieval-silver/50 italic">
                        Nenhum herói específico vinculado a este registro.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rodapé da Folha Verso: Ações do Escriba & Número de Página */}
              <div className="pt-3 border-t border-medieval-gold/15 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={(e) => onEditMemory(currentMemory, e)}
                    className="p-1.5 rounded hover:bg-medieval-gold/15 text-medieval-silver hover:text-medieval-gold transition-colors"
                    title="Editar manuscrito da memória"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onDeleteMemory(currentMemory, e)}
                    className="p-1.5 rounded hover:bg-medieval-wine/30 text-medieval-silver hover:text-red-400 transition-colors"
                    title="Excluir memória do compêndio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[10px] font-mono text-medieval-silver/50 tracking-wider">
                  — PERGAMINHO {currentRoman} • {currentChapterNum} DE {memories.length} —
                </div>
              </div>
            </div>

            {/* =========================================================
                O LOMBO CENTRAL DO LIVRO (SPINE GUTTER & SHADOW CREASE)
                Emula o vinco central realista onde as páginas são costuradas.
                ========================================================= */}
            <div className="hidden lg:flex w-6 relative shrink-0 items-center justify-center select-none pointer-events-none z-20">
              {/* Gradiente de profundidade e sombra de dobra física */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(20,18,14,0.95) 50%, rgba(0,0,0,0.85) 100%)',
                  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.9)'
                }}
              />
              {/* Costura de linha dourada central */}
              <div className="absolute inset-y-4 w-px border-l border-dashed border-medieval-gold/30" />
            </div>

            {/* =========================================================
                FOLHA DIREITA (RECTO) - O MANUSCRITO E AS VOZES
                ========================================================= */}
            <div
              className={`w-full lg:w-1/2 h-full flex flex-col justify-between p-4 sm:p-6 md:p-8 relative transition-all duration-300 ${
                mobilePageMode === 'recto' ? 'flex' : 'hidden lg:flex'
              }`}
              style={{
                background: 'linear-gradient(135deg, #131210 0%, #161512 100%)',
                borderLeft: '1px solid rgba(197, 168, 128, 0.1)'
              }}
            >
              {/* Textura de Pergaminho & Cantoneiras Internas */}
              <CornerFiligree position="top-right" className="absolute top-3 right-3 w-6 h-6 text-medieval-gold/30" />
              <CornerFiligree position="bottom-right" className="absolute bottom-3 right-3 w-6 h-6 text-medieval-gold/30" />

              {/* Sombra da dobra do lombo à esquerda da folha direita */}
              <div className="absolute inset-y-0 left-0 w-8 pointer-events-none bg-gradient-to-r from-black/60 to-transparent hidden lg:block" />

              {/* Conteúdo Dinâmico do Manuscrito da Página Direita */}
              <RectoFolioNarrative
                memory={currentMemory}
                allCharacters={allCharacters}
                chapterNumber={currentChapterNum}
                campaignName={campaign?.name || 'Crônicas do Reino'}
                onReadFullDetail={() => navigate({ type: 'memory-detail', id: currentMemory.id })}
              />
            </div>

            {/* =========================================================
                MECÂNICA DE VIRAR PÁGINA 3D (PAGE-TURN FLIP EFFECT)
                ========================================================= */}
            {isFlipping === 'next' && (
              <>
                {/* Folha 3D Real que vira da direita para a esquerda */}
                <div className="hidden lg:block absolute right-0 inset-y-0 w-1/2 z-40 tome-leaf-next pointer-events-none rounded-r-lg overflow-hidden border-l border-medieval-gold/30 bg-[#141311]">
                  <div className="w-full h-full p-8 flex flex-col justify-between opacity-80 bg-gradient-to-l from-transparent via-[#100F0D] to-black/80">
                    <div className="w-full h-4 bg-medieval-gold/10 rounded" />
                    <div className="space-y-3">
                      <div className="w-3/4 h-3 bg-medieval-gold/15 rounded" />
                      <div className="w-full h-2.5 bg-medieval-silver/10 rounded" />
                      <div className="w-5/6 h-2.5 bg-medieval-silver/10 rounded" />
                    </div>
                    <div className="w-full h-px bg-medieval-gold/20" />
                  </div>
                </div>
                {/* Sombra de oclusão no lado esquerdo */}
                <div className="hidden lg:block absolute left-0 inset-y-0 w-1/2 z-30 tome-shadow-overlay pointer-events-none bg-gradient-to-r from-transparent to-black/60" />
              </>
            )}

            {isFlipping === 'prev' && (
              <>
                {/* Folha 3D Real que vira da esquerda para a direita */}
                <div className="hidden lg:block absolute left-0 inset-y-0 w-1/2 z-40 tome-leaf-prev pointer-events-none rounded-l-lg overflow-hidden border-r border-medieval-gold/30 bg-[#141311]">
                  <div className="w-full h-full p-8 flex flex-col justify-between opacity-80 bg-gradient-to-r from-transparent via-[#100F0D] to-black/80">
                    <div className="w-full h-4 bg-medieval-gold/10 rounded" />
                    <div className="space-y-3">
                      <div className="w-3/4 h-3 bg-medieval-gold/15 rounded" />
                      <div className="w-full h-2.5 bg-medieval-silver/10 rounded" />
                      <div className="w-5/6 h-2.5 bg-medieval-silver/10 rounded" />
                    </div>
                    <div className="w-full h-px bg-medieval-gold/20" />
                  </div>
                </div>
                {/* Sombra de oclusão no lado direito */}
                <div className="hidden lg:block absolute right-0 inset-y-0 w-1/2 z-30 tome-shadow-overlay pointer-events-none bg-gradient-to-l from-transparent to-black/60" />
              </>
            )}
          </div>
        </div>

        {/* =========================================================================
            CONTROLES DE FOLHEAMENTO CINEMATOGRÁFICO LATERAIS
            ========================================================================= */}
        {/* Folhear para a esquerda (Capítulo Anterior) */}
        {activeIndex > 0 && (
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={!!isFlipping}
            className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-medieval-charcoal/90 border-2 border-medieval-gold/60 text-medieval-gold hover:text-medieval-brightGold hover:border-medieval-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] backdrop-blur-md transition-all duration-300 transform hover:scale-110 active:scale-95 disabled:opacity-50"
            title="Virar para o capítulo anterior (Seta Esquerda)"
            aria-label="Capítulo Anterior"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Folhear para a direita (Próximo Capítulo) */}
        {activeIndex < memories.length - 1 && (
          <button
            type="button"
            onClick={handleNextPage}
            disabled={!!isFlipping}
            className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-medieval-charcoal/90 border-2 border-medieval-gold/60 text-medieval-gold hover:text-medieval-brightGold hover:border-medieval-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] backdrop-blur-md transition-all duration-300 transform hover:scale-110 active:scale-95 disabled:opacity-50"
            title="Virar para o próximo capítulo (Seta Direita)"
            aria-label="Próximo Capítulo"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* =========================================================================
          RODAPÉ INFORMATIVO E NAVEGADOR DE FÓLIOS
          ========================================================================= */}
      <div className="mt-4 flex flex-col items-center space-y-2 px-4 max-w-xl mx-auto text-center">
        {/* Slider de Fólio Rápido para Campanhas Grandes */}
        {memories.length > 1 && (
          <div className="w-full flex items-center space-x-3 py-1">
            <span className="text-[10px] font-mono text-medieval-silver/50 font-bold">1</span>
            <input
              type="range"
              min={0}
              max={memories.length - 1}
              value={activeIndex}
              onChange={(e) => setActiveIndex(Number(e.target.value))}
              className="w-full h-1.5 bg-medieval-stone rounded-lg appearance-none cursor-pointer accent-medieval-gold"
              aria-label="Navegador do Tomo"
            />
            <span className="text-[10px] font-mono text-medieval-silver/50 font-bold">{memories.length}</span>
          </div>
        )}

        <div className="text-[10px] text-medieval-silver/50 font-serif flex items-center space-x-2">
          <span>Use as setas <kbd className="px-1 py-0.5 rounded bg-medieval-stone border border-medieval-gold/20 text-medieval-gold font-mono">←</kbd> e <kbd className="px-1 py-0.5 rounded bg-medieval-stone border border-medieval-gold/20 text-medieval-gold font-mono">→</kbd> do teclado para folhear o Tomo</span>
          <span>•</span>
          <span><kbd className="px-1 py-0.5 rounded bg-medieval-stone border border-medieval-gold/20 text-medieval-gold font-mono">Sumário</kbd> para salto direto</span>
        </div>
      </div>

      {/* =========================================================================
          SUMÁRIO DO TOMO (RETRACTABLE TABLE OF CONTENTS DRAWER)
          Permite ao mestre ou jogador navegar instantaneamente por 100+ sessões.
          ========================================================================= */}
      {isTocOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md h-full bg-gradient-to-b from-[#151412] to-[#0D0C0A] border-l-2 border-medieval-gold/40 shadow-2xl p-5 flex flex-col justify-between overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Sumário */}
            <div className="pb-3 border-b border-medieval-gold/20 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Bookmark className="w-5 h-5 text-medieval-gold" />
                <div>
                  <h3 className="font-medieval text-base text-medieval-brightGold font-bold uppercase tracking-wider">
                    Sumário do Tomo
                  </h3>
                  <span className="text-[10px] font-serif text-medieval-silver">
                    Índice Cronológico das Memórias
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTocOpen(false)}
                className="p-1.5 rounded-full hover:bg-medieval-stone text-medieval-silver hover:text-medieval-gold transition-colors"
                title="Fechar Sumário"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campo de Busca Rápida no Sumário */}
            <div className="my-3 relative shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-medieval-silver/60" />
              <input
                type="text"
                value={tocFilter}
                onChange={(e) => setTocFilter(e.target.value)}
                placeholder="Filtrar por título, categoria ou data..."
                className="medieval-input pl-8 py-1.5 text-xs bg-medieval-stone/80"
              />
            </div>

            {/* Lista Rolável de Capítulos */}
            <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 space-y-2 select-none">
              {filteredChapters.length === 0 ? (
                <div className="p-6 text-center text-xs text-medieval-silver/60 italic font-serif">
                  Nenhum capítulo corresponde à busca.
                </div>
              ) : (
                filteredChapters.map(({ memory, index }) => {
                  const isCurrent = index === activeIndex;
                  return (
                    <button
                      key={memory.id}
                      type="button"
                      onClick={() => handleJumpToChapter(index)}
                      className={`w-full text-left p-3 rounded border transition-all duration-200 flex items-start space-x-3 ${
                        isCurrent
                          ? 'bg-medieval-gold/15 border-medieval-gold shadow-md'
                          : 'bg-medieval-stone/40 border-medieval-gold/10 hover:border-medieval-gold/40 hover:bg-medieval-stone/80'
                      }`}
                    >
                      {/* Numeral Romano do Capítulo */}
                      <span className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-medieval text-xs font-bold border ${
                        isCurrent
                          ? 'bg-medieval-gold text-medieval-charcoal border-medieval-brightGold'
                          : 'bg-medieval-charcoal text-medieval-gold border-medieval-gold/20'
                      }`}>
                        {toRomanNumeral(getChronologicalChapterNumber(index, memories.length, sortOrder))}
                      </span>

                      {/* Informações da Memória */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[9px] font-serif border px-1.5 py-0.2 rounded-sm uppercase tracking-wider ${getCategoryColorClass(memory.type)}`}>
                            {memory.type}
                          </span>
                          <span className="text-[10px] font-mono text-medieval-silver/50">
                            {formatDisplayDate(memory.eventDate)}
                          </span>
                        </div>
                        <h4 className="font-medieval text-sm font-bold text-medieval-parchment truncate mt-1">
                          {memory.title}
                        </h4>
                        <p className="text-[11px] font-serif text-medieval-silver/70 line-clamp-1 italic mt-0.5">
                          {memory.description}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Rodapé do Sumário */}
            <div className="pt-3 border-t border-medieval-gold/15 text-center shrink-0">
              <span className="text-[10px] font-medieval uppercase tracking-wider text-medieval-gold/70">
                Total de {memories.length} Memórias Gravadas
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   COMPONENTE: ILUSTRAÇÃO DA MEMÓRIA COM MOLDURA GÓTICA
   ========================================================================= */
const MemoryIllustrationImage: React.FC<{ memory: Memory }> = ({ memory }) => {
  const imageUrl = useMediaUrl(memory.imageId);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={memory.title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
    );
  }

  // Brasão / Selo Arcano quando não há ilustração fotográfica
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-radial from-medieval-stone/70 via-medieval-charcoal to-black p-4 text-center">
      <div className="relative mb-2">
        <div className="w-16 h-16 rounded-full border border-medieval-gold/30 flex items-center justify-center bg-medieval-charcoal/80">
          <BookOpen className="w-8 h-8 text-medieval-gold/50" />
        </div>
        <Sparkles className="w-4 h-4 text-medieval-brightGold absolute -top-1 -right-1 animate-pulse" />
      </div>
      <span className="text-xs font-medieval text-medieval-brightGold uppercase tracking-widest font-bold">
        Iluminura Sagrada
      </span>
      <span className="text-[10px] font-serif text-medieval-silver/60 italic mt-0.5">
        Relatado nas Crônicas do Compêndio
      </span>
    </div>
  );
};

/* =========================================================================
   COMPONENTE: FOLHA RECTO (MANUSCRITO, FITILHOS DE VOZ E CAPITULAR)
   ========================================================================= */
interface RectoFolioNarrativeProps {
  memory: Memory;
  allCharacters: Character[];
  chapterNumber: number;
  campaignName: string;
  onReadFullDetail: () => void;
}

const RectoFolioNarrative: React.FC<RectoFolioNarrativeProps> = ({
  memory,
  allCharacters,
  chapterNumber,
  campaignName,
  onReadFullDetail
}) => {
  const [selectedVoice, setSelectedVoice] = useState<'mestre' | string>('mestre');

  // Heróis que deixaram testemunho pessoal registrado
  const heroAccountIds = Object.keys(memory.heroDescriptions || {}).filter(
    id => !!memory.heroDescriptions?.[id]?.trim()
  );

  // Redefinir para o mestre ao mudar de memória caso a voz anterior não exista
  useEffect(() => {
    setSelectedVoice('mestre');
  }, [memory.id]);

  const activeNarrative = selectedVoice === 'mestre'
    ? memory.description
    : (memory.heroDescriptions?.[selectedVoice] || memory.description);

  const activeNarratorName = selectedVoice === 'mestre'
    ? 'A Voz do Mestre'
    : (allCharacters.find(c => c.id === selectedVoice)?.name || 'Herói');

  // Extrair primeira letra para a monumental Capitular Iluminada (Drop Cap)
  const trimmedNarrative = (activeNarrative || '').trim();
  const firstLetter = trimmedNarrative.charAt(0) || 'E';
  const remainingNarrative = trimmedNarrative.slice(1);

  return (
    <div className="h-full flex flex-col justify-between">
      {/* Cabeçalho da Folha Recto: Fitilhos de Cetim / Marcadores de Voz */}
      <div className="pb-3 border-b border-medieval-gold/15 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[10px] font-medieval text-medieval-silver/50 uppercase tracking-widest mr-1">
            Perspectiva:
          </span>

          {/* Fita do Mestre */}
          <button
            type="button"
            onClick={() => setSelectedVoice('mestre')}
            className={`py-0.5 px-2 rounded text-[10px] font-serif transition-all duration-300 ${
              selectedVoice === 'mestre'
                ? 'bg-medieval-gold text-medieval-charcoal font-bold shadow-sm'
                : 'bg-medieval-stone/60 text-medieval-silver hover:text-medieval-gold'
            }`}
          >
            Voz do Mestre
          </button>

          {/* Fitas dos Heróis com Relato Pessoal */}
          {heroAccountIds.map(charId => {
            const char = allCharacters.find(c => c.id === charId);
            const isSelected = selectedVoice === charId;
            return (
              <button
                key={charId}
                type="button"
                onClick={() => setSelectedVoice(charId)}
                className={`py-0.5 px-2 rounded text-[10px] font-serif transition-all duration-300 shrink-0 ${
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

        {/* Estandarte de Narrador Ativo */}
        <div className="hidden sm:flex items-center space-x-1 text-[10px] font-medieval text-medieval-gold/80 italic">
          <Sparkles className="w-3 h-3 text-medieval-gold" />
          <span>{activeNarratorName}</span>
        </div>
      </div>

      {/* Corpo Editorial: Capitular Iluminada Medieval e Texto Justificado */}
      <div className="my-auto py-4 overflow-y-auto scrollbar-thin max-h-[380px] lg:max-h-[440px] pr-2 select-text">
        <div className="text-justify font-serif text-sm md:text-base leading-relaxed text-medieval-parchment/90 space-y-3">
          <p className="whitespace-pre-line leading-relaxed">
            {/* Monumental Capitular Medieval (Illuminated Drop-Cap) */}
            <span
              className="float-left mr-3 mb-1 px-3 py-1 font-medieval font-black text-3xl sm:text-4xl text-medieval-charcoal bg-gradient-to-br from-medieval-brightGold via-medieval-gold to-[#8B7355] border-2 border-medieval-brightGold/80 rounded shadow-md select-none"
              style={{ lineHeight: 1 }}
            >
              {firstLetter}
            </span>
            {remainingNarrative}
          </p>
        </div>

        {/* Vinheta de Encerramento da Crônica */}
        <MedievalDivider className="my-4" />

        {/* Tags e Palavras-Chave Rúnicas */}
        {memory.tags && memory.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[9px] font-medieval text-medieval-silver/50 uppercase tracking-widest mr-1">
              Etiquetas:
            </span>
            {memory.tags.map(tag => (
              <span
                key={tag}
                className="text-[10px] font-serif text-medieval-silver bg-medieval-stone/80 border border-medieval-gold/10 px-2 py-0.5 rounded-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Rodapé da Folha Recto: Link para Detalhes e Numeração de Página */}
      <div className="pt-3 border-t border-medieval-gold/15 flex items-center justify-between shrink-0 gap-2">
        <div className="text-[10px] sm:text-[11px] font-serif text-medieval-silver/80 italic flex items-center space-x-1.5 min-w-0 pr-2">
          <span className="text-medieval-gold/70 font-medieval uppercase tracking-wider text-[9px] shrink-0">Tomo:</span>
          <span className="text-medieval-parchment font-medium truncate" title={campaignName}>
            {campaignName}
          </span>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={onReadFullDetail}
            className="btn-gold py-1 px-3 text-[11px] font-serif flex items-center space-x-1 shadow-sm hover:scale-105 transition-transform"
          >
            <span>Ver Pergaminho</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <span className="text-[10px] font-mono text-medieval-silver/50 tracking-wider">
            — MEMÓRIA {toRomanNumeral(chapterNumber)} —
          </span>
        </div>
      </div>
    </div>
  );
};
