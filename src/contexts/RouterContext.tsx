import React, { createContext, useContext, useState, useEffect } from 'react';

export type ViewState =
  | { type: 'dashboard' }
  | { type: 'characters' }
  | { type: 'character-profile'; id: string }
  | { type: 'timeline' }
  | { type: 'memory-detail'; id: string }
  | { type: 'gallery'; tab?: 'images' | 'files' | 'tokens' }
  | { type: 'settings' };

interface RouterContextType {
  view: ViewState;
  navigate: (view: ViewState) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

function parseHash(hash: string): ViewState {
  const path = hash.replace(/^#\/?/, '');
  if (!path) return { type: 'dashboard' };

  const parts = path.split('/');
  const route = parts[0];

  switch (route) {
    case 'characters':
      if (parts[1]) {
        return { type: 'character-profile', id: parts[1] };
      }
      return { type: 'characters' };
    case 'timeline':
      return { type: 'timeline' };
    case 'memories':
      if (parts[1]) {
        return { type: 'memory-detail', id: parts[1] };
      }
      return { type: 'timeline' };
    case 'gallery':
      const tab = parts[1] === 'tokens' ? 'tokens' : parts[1] === 'files' ? 'files' : 'images';
      return { type: 'gallery', tab };
    case 'settings':
      return { type: 'settings' };
    default:
      return { type: 'dashboard' };
  }
}

function viewToHash(view: ViewState): string {
  switch (view.type) {
    case 'dashboard':
      return '#/';
    case 'characters':
      return '#/characters';
    case 'character-profile':
      return `#/characters/${view.id}`;
    case 'timeline':
      return '#/timeline';
    case 'memory-detail':
      return `#/memories/${view.id}`;
    case 'gallery':
      return `#/gallery/${view.tab || 'images'}`;
    case 'settings':
      return '#/settings';
  }
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [view, setViewState] = useState<ViewState>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => {
      setViewState(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newView: ViewState) => {
    window.location.hash = viewToHash(newView);
  };

  const goBack = () => {
    window.history.back();
  };

  return (
    <RouterContext.Provider value={{ view, navigate, goBack }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
