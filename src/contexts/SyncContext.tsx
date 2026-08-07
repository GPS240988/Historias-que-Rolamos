import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SyncEngine } from '../services/sync';
import { SyncOutboxRepository } from '../repositories/SyncOutboxRepository';
import type { SyncOutbox, UserSession } from '../types';

interface SyncContextType {
  status: 'synced' | 'syncing' | 'pending' | 'conflict';
  error: string | null;
  isAuthenticated: boolean;
  username: string | null;
  conflicts: SyncOutbox[];
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  syncNow: () => Promise<void>;
  resolveConflict: (outboxId: number, resolution: 'keep_mine' | 'discard' | 'copy_as_new') => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<'synced' | 'syncing' | 'pending' | 'conflict'>('synced');
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('cloud_username'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('cloud_token'));

  // Reactively track conflicts in IndexedDB
  const conflicts = useLiveQuery(() => SyncOutboxRepository.listConflicts()) || [];

  // Update status based on conflicts or outbox status
  useEffect(() => {
    const checkStatus = async () => {
      const current = await SyncEngine.getStatus();
      setStatus(current);
    };
    checkStatus();
  }, [conflicts]);

  useEffect(() => {
    // Subscribe to SyncEngine notifications
    const unsubscribe = SyncEngine.subscribe((newStatus, newError) => {
      setStatus(newStatus);
      setError(newError || null);
    });

    // Run synchronization on startup, connectivity restore, and focus
    const runSync = () => SyncEngine.triggerSync();
    
    // Period sync every 45s
    const interval = setInterval(runSync, 45000);
    window.addEventListener('online', runSync);
    window.addEventListener('focus', runSync);
    
    runSync(); // Initial sync

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('online', runSync);
      window.removeEventListener('focus', runSync);
    };
  }, []);

  const login = async (user: string, pass: string) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });

    if (!res.ok) {
      const err = await res.json() as { error?: string };
      throw new Error(err.error || 'Falha ao autenticar.');
    }

    const data = await res.json() as UserSession;
    localStorage.setItem('cloud_token', data.token);
    localStorage.setItem('cloud_username', data.user.username);
    setIsAuthenticated(true);
    setUsername(data.user.username);
    
    // Run sync immediately after login
    SyncEngine.triggerSync();
  };

  const register = async (user: string, pass: string) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });

    if (!res.ok) {
      const err = await res.json() as { error?: string };
      throw new Error(err.error || 'Falha ao registrar conta.');
    }

    // Automatically login after successful registration
    await login(user, pass);
  };

  const logout = () => {
    localStorage.removeItem('cloud_token');
    localStorage.removeItem('cloud_username');
    setIsAuthenticated(false);
    setUsername(null);
    setStatus('synced');
    setError(null);
  };

  const syncNow = async () => {
    await SyncEngine.triggerSync();
  };

  const resolveConflict = async (outboxId: number, resolution: 'keep_mine' | 'discard' | 'copy_as_new') => {
    const outbox = await SyncOutboxRepository.get(outboxId);
    if (!outbox) return;

    if (resolution === 'discard') {
      const tableMap = {
        campaign: 'campaigns',
        character: 'characters',
        memory: 'memories',
        memoryCharacter: 'memoryCharacters',
        token: 'tokens',
        media: 'media'
      } as const;

      const tableName = tableMap[outbox.entityType];
      const targetTable = db[tableName];

      await db.transaction('rw', [db.sync_outbox, targetTable], async () => {
        if (!outbox.serverPayload) {
          // Server deleted the entity
          await (targetTable as any).delete(outbox.entityId);
        } else {
          // Server has updated entity
          await (targetTable as any).put(outbox.serverPayload);
        }
        await db.sync_outbox.delete(outboxId);
      });
    } else if (resolution === 'keep_mine') {
      await db.sync_outbox.update(outboxId, {
        status: 'pending',
        baseVersion: outbox.serverVersion || outbox.baseVersion
      });
    } else if (resolution === 'copy_as_new') {
      const newId = crypto.randomUUID();
      const payloadCopy = {
        ...outbox.payload,
        id: newId,
        version: 0,
        createdAt: new Date().toISOString()
      };
      
      // Import the repositories dynamically to avoid circular references
      const repoName = outbox.entityType.charAt(0).toUpperCase() + outbox.entityType.slice(1) + 'Repository';
      const repo = await import(`../repositories/${repoName}`);
      
      await repo[repoName].save(payloadCopy);
      await db.sync_outbox.delete(outboxId);
    }

    // Trigger sync to apply resolution
    SyncEngine.triggerSync();
  };

  return (
    <SyncContext.Provider value={{
      status,
      error,
      isAuthenticated,
      username,
      conflicts,
      login,
      register,
      logout,
      syncNow,
      resolveConflict
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
