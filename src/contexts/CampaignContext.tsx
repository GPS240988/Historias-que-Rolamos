import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Campaign } from '../types';
import { MediaService } from '../services/media';

interface CampaignContextType {
  campaign: Campaign | null;
  campaigns: Campaign[];
  loading: boolean;
  createCampaign: (name: string, system: string, description: string, coverFile?: File) => Promise<Campaign>;
  updateCampaign: (updates: Partial<Campaign>, coverFile?: File) => Promise<void>;
  resetCampaign: () => Promise<void>;
  switchCampaign: (id: string | 'new') => void;
  deleteCampaign: (id: string) => Promise<void>;
  theme: string;
  setTheme: (theme: string) => void;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<string>(() => {
    const saved = localStorage.getItem('theme');
    // Map old 'dark' theme to new 'grimoire' theme
    if (saved === 'dark') return 'grimoire';
    return saved || 'grimoire';
  });
  const [activeCampaignId, setActiveCampaignIdState] = useState<string | null>(
    () => localStorage.getItem('activeCampaignId')
  );

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  // Reactive query of all campaigns.
  const campaignsList = useLiveQuery(() => db.campaigns.toArray());
  const campaigns = campaignsList || [];

  const switchCampaign = (id: string | 'new') => {
    setActiveCampaignIdState(id);
    if (id !== 'new') {
      localStorage.setItem('activeCampaignId', id);
    }
  };

  const deleteCampaign = async (id: string) => {
    await db.transaction('rw', [db.campaigns, db.characters, db.memories, db.tokens, db.memoryCharacters, db.media], async () => {
      // Find memories to delete relations
      const memories = await db.memories.where('campaignId').equals(id).toArray();
      const memoryIds = memories.map(m => m.id);

      // Delete relationships
      if (memoryIds.length > 0) {
        await db.memoryCharacters.where('memoryId').anyOf(memoryIds).delete();
      }

      // Delete characters, memories, tokens, media, campaign
      await db.characters.where('campaignId').equals(id).delete();
      await db.memories.where('campaignId').equals(id).delete();
      await db.tokens.where('campaignId').equals(id).delete();
      await db.media.where('campaignId').equals(id).delete();
      await db.campaigns.delete(id);
    });

    // Reset active ID if we deleted the current active campaign
    if (activeCampaignId === id) {
      const remaining = campaigns.filter(c => c.id !== id);
      if (remaining.length > 0) {
        switchCampaign(remaining[0].id);
      } else {
        switchCampaign('new');
      }
    }
  };

  let campaign: Campaign | null = null;
  if (activeCampaignId === 'new') {
    campaign = null;
  } else if (activeCampaignId) {
    campaign = campaigns.find(c => c.id === activeCampaignId) || null;
  }

  if (!campaign && campaigns.length > 0 && activeCampaignId !== 'new') {
    campaign = campaigns[0];
    localStorage.setItem('activeCampaignId', campaign.id);
  }

  useEffect(() => {
    if (campaignsList !== undefined) {
      setLoading(false);
    }
  }, [campaignsList]);

  const createCampaign = async (name: string, system: string, description: string, coverFile?: File): Promise<Campaign> => {
    const campaignId = crypto.randomUUID();
    let coverImageId: string | undefined;

    if (coverFile) {
      coverImageId = await MediaService.saveMedia(coverFile, campaignId, true);
    }

    const newCampaign: Campaign = {
      id: campaignId,
      name,
      system,
      description,
      coverImageId,
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.campaigns.put(newCampaign);
    switchCampaign(campaignId);
    return newCampaign;
  };

  const updateCampaign = async (updates: Partial<Campaign>, coverFile?: File): Promise<void> => {
    if (!campaign) throw new Error('No active campaign to update.');

    let coverImageId = campaign.coverImageId;

    if (coverFile) {
      // If there was a previous cover image, clean it up
      if (campaign.coverImageId) {
        await MediaService.deleteMedia(campaign.coverImageId);
      }
      coverImageId = await MediaService.saveMedia(coverFile, campaign.id, true);
    }

    const updatedCampaign: Campaign = {
      ...campaign,
      ...updates,
      coverImageId,
      updatedAt: new Date().toISOString()
    };

    await db.campaigns.put(updatedCampaign);
  };

  const resetCampaign = async (): Promise<void> => {
    // Clear IndexedDB completely
    await db.clearAll();
    localStorage.removeItem('activeCampaignId');
  };

  return (
    <CampaignContext.Provider value={{ campaign, campaigns, loading, createCampaign, updateCampaign, resetCampaign, switchCampaign, deleteCampaign, theme, setTheme }}>
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};
