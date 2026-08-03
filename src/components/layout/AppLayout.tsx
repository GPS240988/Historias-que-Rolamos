import React, { useState } from 'react';
import { useRouter, type ViewState } from '../../contexts/RouterContext';
import { useSearch } from '../../contexts/SearchContext';
import { useCampaign } from '../../contexts/CampaignContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import {
  Book,
  Compass,
  Users,
  Image as ImageIcon,
  Settings as SettingsIcon,
  Search,
  X,
  ChevronLeft,
  Shield,
  FileText
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  showSearch?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, showSearch = true }) => {
  const { view, navigate, goBack } = useRouter();
  const { searchQuery, setSearchQuery } = useSearch();
  const { campaign } = useCampaign();
  const [isSearching, setIsSearching] = useState(false);

  // Spotlight search query
  const searchResults = useLiveQuery(async () => {
    if (!campaign || !searchQuery.trim()) return { characters: [], memories: [], tokens: [] };
    const q = searchQuery.toLowerCase().trim();

    // Query characters for active campaign
    const allChars = await db.characters.where('campaignId').equals(campaign.id).toArray();
    const chars = allChars.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.class.toLowerCase().includes(q) ||
      c.origin.toLowerCase().includes(q)
    ).slice(0, 3);

    // Query memories for active campaign
    const allMems = await db.memories.where('campaignId').equals(campaign.id).toArray();
    const mems = allMems.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.tags.some(t => t.toLowerCase().includes(q))
    ).slice(0, 3);

    // Query tokens for active campaign
    const allToks = await db.tokens.where('campaignId').equals(campaign.id).toArray();
    const toks = allToks.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.notes || '').toLowerCase().includes(q)
    ).slice(0, 3);

    return { characters: chars, memories: mems, tokens: toks };
  }, [searchQuery, campaign?.id]);

  const navItems = [
    { label: 'Campanha', icon: Compass, viewState: { type: 'dashboard' } as ViewState },
    { label: 'Memórias', icon: Book, viewState: { type: 'timeline' } as ViewState },
    { label: 'Heróis', icon: Users, viewState: { type: 'characters' } as ViewState },
    { label: 'Galeria', icon: ImageIcon, viewState: { type: 'gallery' } as ViewState },
    { label: 'Mais', icon: SettingsIcon, viewState: { type: 'settings' } as ViewState },
  ];

  const isViewActive = (itemViewState: ViewState) => {
    if (view.type === itemViewState.type) {
      if (view.type === 'gallery' && itemViewState.type === 'gallery') {
        return true;
      }
      return true;
    }
    return false;
  };

  const handleNavClick = (targetView: ViewState) => {
    navigate(targetView);
  };

  const canGoBack = view.type === 'character-profile' || view.type === 'memory-detail';

  const getHeaderTitle = () => {
    switch (view.type) {
      case 'dashboard': return 'Campanha';
      case 'timeline': return 'Memórias';
      case 'characters': return 'Heróis';
      case 'character-profile': return 'Herói';
      case 'memory-detail': return 'Memória';
      case 'gallery': return 'Galeria';
      case 'settings': return 'Mais';
      default: return 'Grimório';
    }
  };

  return (
    <div className="w-screen h-screen bg-[#0a0a0c] text-medieval-parchment flex justify-center overflow-hidden selection:bg-medieval-gold/30 selection:text-medieval-brightGold">

      {/* Centered Container (Mockup-style frame on Mobile, responsive and wider on Desktop) */}
      <div className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl h-full bg-medieval-charcoal flex flex-col relative md:border-x md:border-medieval-gold/15 md:shadow-[0_0_60px_rgba(0,0,0,0.85)]">

        {/* Sticky Header - Top Bar */}
        {isSearching ? (
          <header className="sticky top-0 z-30 bg-medieval-stone/95 border-b border-medieval-gold/15 backdrop-blur-md px-4 py-2 flex items-center justify-between shadow-md h-14 shrink-0 animate-fade-in">
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar registros, heróis..."
                className="w-full pl-8 pr-8 py-1.5 text-xs medieval-input bg-medieval-charcoal/50 border border-medieval-gold/20 rounded focus:border-medieval-gold"
                autoFocus
              />
              <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-medieval-silver/50" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-3.5 text-medieval-silver/50 hover:text-medieval-silver"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setIsSearching(false);
                setSearchQuery('');
              }}
              className="ml-3 text-xs text-medieval-gold font-medieval hover:text-medieval-brightGold uppercase tracking-wider"
            >
              Cancelar
            </button>
          </header>
        ) : (
          <header className="sticky top-0 z-30 bg-medieval-stone/95 border-b border-medieval-gold/15 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-md h-14 shrink-0">
            {/* Left Back Arrow icon */}
            <div className="flex items-center min-w-[50px]">
              {canGoBack && (
                <button
                  onClick={goBack}
                  className="p-1.5 rounded hover:bg-medieval-charcoal text-medieval-gold transition-colors duration-200"
                  aria-label="Voltar"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Centered Page Title */}
            <div className="text-center flex-1">
              <h1 className="text-sm font-medieval font-bold tracking-widest text-medieval-gold uppercase leading-none">
                {getHeaderTitle()}
              </h1>
            </div>

            {/* Right Search toggle trigger icon */}
            <div className="flex items-center justify-end min-w-[50px]">
              {showSearch && (
                <button
                  onClick={() => setIsSearching(true)}
                  className="p-1.5 rounded hover:bg-medieval-charcoal text-medieval-gold transition-colors duration-200"
                  aria-label="Pesquisar"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>
          </header>
        )}

        {/* Global Search Results Panel overlay */}
        {searchQuery.trim() && searchResults && (
          <div className="absolute top-14 left-0 right-0 p-4 bg-medieval-stone/98 border-b border-medieval-gold/25 z-40 max-h-[70vh] overflow-y-auto shadow-xl">
            <SearchResultsPanel
              results={searchResults}
              onItemClick={(targetViewState) => {
                setSearchQuery('');
                setIsSearching(false);
                navigate(targetViewState);
              }}
            />
          </div>
        )}

        {/* Scrollable Main Content Frame */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto scrollbar-none flex flex-col">
          {children}
        </main>

        {/* Sticky Bottom Tab Bar (Bottom Nav on both PC and Mobile) */}
        <nav className="w-full bg-medieval-stone border-t border-medieval-gold/25 backdrop-blur-md py-2 px-3 flex justify-around items-center shadow-2xl z-30 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isViewActive(item.viewState);
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.viewState)}
                className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all duration-200 hover:text-medieval-brightGold ${active ? 'text-medieval-brightGold scale-105' : 'text-medieval-silver/80'
                  }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.2] text-medieval-gold' : 'stroke-[1.8]'}`} />
                <span className="text-[9px] mt-1 font-serif tracking-wider font-semibold uppercase">{item.label}</span>
              </button>
            );
          })}
        </nav>

      </div>
    </div>
  );
};

// Spotlight global search floating list
interface SearchResultsPanelProps {
  results: { characters: any[]; memories: any[]; tokens: any[] };
  onItemClick: (viewState: ViewState) => void;
}

const SearchResultsPanel: React.FC<SearchResultsPanelProps> = ({ results, onItemClick }) => {
  const hasResults = results.characters.length > 0 || results.memories.length > 0 || results.tokens.length > 0;

  return (
    <div className="grimoire-card bg-medieval-charcoal/90 border border-medieval-gold/20 rounded p-3 text-xs font-serif divide-y divide-medieval-gold/10">
      {!hasResults ? (
        <div className="py-3 text-center text-medieval-silver italic">
          Nenhum pergaminho ou herói encontrado nos registros.
        </div>
      ) : (
        <>
          {/* Characters section */}
          {results.characters.length > 0 && (
            <div className="py-2 first:pt-0">
              <span className="block text-[9px] text-medieval-gold uppercase font-medieval tracking-widest mb-1 flex items-center">
                <Users className="w-3.5 h-3.5 mr-1" /> Heróis
              </span>
              <div className="space-y-1">
                {results.characters.map(char => (
                  <button
                    key={char.id}
                    onClick={() => onItemClick({ type: 'character-profile', id: char.id })}
                    className="w-full text-left p-1.5 rounded hover:bg-medieval-stone text-medieval-parchment hover:text-medieval-brightGold transition-all block truncate"
                  >
                    <span className="font-semibold">{char.name}</span>
                    <span className="text-[10px] text-medieval-silver ml-1.5">({char.race} • {char.class})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Memories section */}
          {results.memories.length > 0 && (
            <div className="py-2">
              <span className="block text-[9px] text-medieval-gold uppercase font-medieval tracking-widest mb-1 flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1" /> Memórias
              </span>
              <div className="space-y-1">
                {results.memories.map(mem => (
                  <button
                    key={mem.id}
                    onClick={() => onItemClick({ type: 'memory-detail', id: mem.id })}
                    className="w-full text-left p-1.5 rounded hover:bg-medieval-stone text-medieval-parchment hover:text-medieval-brightGold transition-all block truncate"
                  >
                    <span className="font-semibold">{mem.title}</span>
                    <span className="text-[10px] text-medieval-silver ml-1.5">({mem.type})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tokens section */}
          {results.tokens.length > 0 && (
            <div className="py-2 last:pb-0">
              <span className="block text-[9px] text-medieval-gold uppercase font-medieval tracking-widest mb-1 flex items-center">
                <Shield className="w-3.5 h-3.5 mr-1" /> Tokens
              </span>
              <div className="space-y-1">
                {results.tokens.map(tok => (
                  <button
                    key={tok.id}
                    onClick={() => onItemClick({ type: 'gallery', tab: 'tokens' })}
                    className="w-full text-left p-1.5 rounded hover:bg-medieval-stone text-medieval-parchment hover:text-medieval-brightGold transition-all block truncate"
                  >
                    <span className="font-semibold">{tok.name}</span>
                    <span className="text-[10px] text-medieval-silver ml-1.5">({tok.category})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};