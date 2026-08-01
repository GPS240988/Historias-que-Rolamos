import React from 'react';
import { CampaignProvider, useCampaign } from './contexts/CampaignContext';
import { RouterProvider, useRouter } from './contexts/RouterContext';
import { SearchProvider } from './contexts/SearchContext';
import { AppLayout } from './components/layout/AppLayout';
import { CampaignSetup } from './views/CampaignSetup';
import { CampaignHome } from './views/CampaignHome';
import { CharactersView } from './views/CharactersView';
import { CharacterProfileView } from './views/CharacterProfileView';
import { TimelineView } from './views/TimelineView';
import { MemoryDetailView } from './views/MemoryDetailView';
import { GalleryView } from './views/GalleryView';
import { SettingsView } from './views/SettingsView';
import { Shield } from 'lucide-react';

const AppContent: React.FC = () => {
  const { campaign, loading } = useCampaign();
  const { view } = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen bg-medieval-charcoal flex flex-col items-center justify-center space-y-4">
        <Shield className="w-12 h-12 text-medieval-gold animate-pulse" />
        <span className="font-medieval text-medieval-gold tracking-widest text-sm animate-pulse">
          Lendo Registro de Memórias...
        </span>
      </div>
    );
  }

  if (!campaign) {
    return <CampaignSetup />;
  }

  const renderView = () => {
    switch (view.type) {
      case 'dashboard':
        return <CampaignHome />;
      case 'characters':
        return <CharactersView />;
      case 'character-profile':
        return <CharacterProfileView id={view.id} />;
      case 'timeline':
        return <TimelineView />;
      case 'memory-detail':
        return <MemoryDetailView id={view.id} />;
      case 'gallery':
        return <GalleryView tab={view.tab} />;
      case 'settings':
        return <SettingsView />;
      default:
        return <CampaignHome />;
    }
  };

  return <AppLayout>{renderView()}</AppLayout>;
};

function App() {
  return (
    <SearchProvider>
      <CampaignProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </CampaignProvider>
    </SearchProvider>
  );
}

export default App;
