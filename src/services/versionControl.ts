import type { AuditAction, AuditEntityType, ChangeLogEntry, VersionHistoryRecord, SystemBackupSummary } from '../types';

const STORAGE_CURRENT_VERSION = 'export_current_version';
const STORAGE_PENDING_CHANGES = 'export_pending_changes';
const STORAGE_VERSION_HISTORY = 'export_version_history';
const STORAGE_VERSION_FINALIZED = 'export_version_finalized';

export const CHRONICLE_CHANGELOG_EVENT = 'chronicle_changelog_updated';

/**
 * Service to manage local change tracking (audit log) and deterministic versioning.
 *
 * Rules:
 * 1. Whenever any entity is created, modified or deleted, an entry is added to pending changes.
 * 2. If there are pending changes when exporting:
 *    - A new version is generated (version incremented by 1).
 *    - All pending changes are sealed into the version history for that version.
 *    - Pending changes are cleared.
 * 3. If there are NO pending changes (e.g. freshly imported or no edits since last export):
 *    - NO new version is generated.
 *    - Exports at the exact current version number.
 * 4. Importing resets pending changes to 0 and restores version history from the backup file,
 *    guaranteeing identical version state across devices without creating ghost versions.
 */
export const VersionControlService = {
  /**
   * Returns the current version number.
   * Defaults to 1 for initial installations.
   */
  getCurrentVersion(): number {
    const raw = localStorage.getItem(STORAGE_CURRENT_VERSION);
    const parsed = raw ? parseInt(raw, 10) : 1;
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  },

  /**
   * Indicates if the current version has already been exported/finalized at least once.
   */
  isVersionFinalized(): boolean {
    return localStorage.getItem(STORAGE_VERSION_FINALIZED) === 'true';
  },

  /**
   * Retrieves all changes made since the last export.
   */
  getPendingChanges(): ChangeLogEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_PENDING_CHANGES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Checks whether any modification was made since the last export or import.
   */
  hasPendingChanges(): boolean {
    return this.getPendingChanges().length > 0;
  },

  /**
   * Retrieves the full consolidated history of all past released versions and their change logs.
   */
  getVersionHistory(): VersionHistoryRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_VERSION_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Logs an action performed on any system entity.
   */
  logChange(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string,
    entityName: string,
    description: string
  ): void {
    const entry: ChangeLogEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      action,
      entityType,
      entityId,
      entityName,
      description
    };

    const currentPending = this.getPendingChanges();
    currentPending.push(entry);

    localStorage.setItem(STORAGE_PENDING_CHANGES, JSON.stringify(currentPending));
    this.notifyUpdate();
  },

  /**
   * Previews the version number that will be used on the next export.
   * - If pending changes exist and version was finalized: currentVersion + 1
   * - If initial unfinalized version: currentVersion (v1)
   * - If no pending changes: currentVersion (NO increment)
   */
  peekNextExportVersion(): { version: number; isNewVersion: boolean } {
    const current = this.getCurrentVersion();
    const hasChanges = this.hasPendingChanges();
    const isFinalized = this.isVersionFinalized();

    if (!isFinalized) {
      return { version: current, isNewVersion: true };
    }

    if (hasChanges) {
      return { version: current + 1, isNewVersion: true };
    }

    // No changes since last export or import: KEEP CURRENT VERSION
    return { version: current, isNewVersion: false };
  },

  /**
   * Commits the export:
   * If there were pending changes:
   *   - Updates version
   *   - Packages changes into VersionHistoryRecord
   *   - Clears pending changes
   * If no pending changes:
   *   - Does not increment version
   */
  commitExport(summary: SystemBackupSummary): { version: number; isNewVersion: boolean } {
    const { version, isNewVersion } = this.peekNextExportVersion();
    const pending = this.getPendingChanges();

    if (isNewVersion && (pending.length > 0 || !this.isVersionFinalized())) {
      // Seal pending changes into this version
      const finalizedChanges = pending.map(c => ({ ...c, version }));
      const history = this.getVersionHistory();

      const newRecord: VersionHistoryRecord = {
        version,
        exportedAt: new Date().toISOString(),
        summary: {
          totalChanges: finalizedChanges.length,
          campaignsCount: summary.campaignsCount,
          charactersCount: summary.charactersCount,
          memoriesCount: summary.memoriesCount,
          tokensCount: summary.tokensCount,
          mediaCount: summary.mediaCount
        },
        changes: finalizedChanges
      };

      // Add to beginning of history list (newest first)
      history.unshift(newRecord);

      localStorage.setItem(STORAGE_CURRENT_VERSION, version.toString());
      localStorage.setItem(STORAGE_VERSION_FINALIZED, 'true');
      localStorage.setItem(STORAGE_VERSION_HISTORY, JSON.stringify(history));
      localStorage.setItem(STORAGE_PENDING_CHANGES, '[]');

      this.notifyUpdate();
      return { version, isNewVersion: true };
    }

    // No changes: Keep current version
    localStorage.setItem(STORAGE_CURRENT_VERSION, version.toString());
    localStorage.setItem(STORAGE_VERSION_FINALIZED, 'true');
    this.notifyUpdate();
    return { version, isNewVersion: false };
  },

  /**
   * Called when a backup file is imported.
   * Completely resets pending changes to 0 and adopts the imported version and history.
   * Prevents creating a new version upon export if no changes are made after import.
   */
  syncFromImport(importedVersion: number, importedHistory?: VersionHistoryRecord[]): void {
    const safeVersion = Math.max(1, importedVersion || 1);

    localStorage.setItem(STORAGE_CURRENT_VERSION, safeVersion.toString());
    localStorage.setItem(STORAGE_VERSION_FINALIZED, 'true');
    localStorage.setItem(STORAGE_PENDING_CHANGES, '[]'); // ZERO pending changes!

    if (Array.isArray(importedHistory) && importedHistory.length > 0) {
      localStorage.setItem(STORAGE_VERSION_HISTORY, JSON.stringify(importedHistory));
    } else {
      // Create a default initial snapshot for the imported version if history was empty
      const fallbackRecord: VersionHistoryRecord = {
        version: safeVersion,
        exportedAt: new Date().toISOString(),
        summary: {
          totalChanges: 1,
          campaignsCount: 0,
          charactersCount: 0,
          memoriesCount: 0,
          tokensCount: 0,
          mediaCount: 0
        },
        changes: [
          {
            id: crypto.randomUUID ? crypto.randomUUID() : 'import-init',
            timestamp: new Date().toISOString(),
            action: 'update',
            entityType: 'system',
            entityId: `v${safeVersion}`,
            entityName: `Backup v${safeVersion}`,
            description: `Importação inicial da versão v${safeVersion}`,
            version: safeVersion
          }
        ]
      };
      localStorage.setItem(STORAGE_VERSION_HISTORY, JSON.stringify([fallbackRecord]));
    }

    this.notifyUpdate();
  },

  /**
   * Resets all logs and version counters.
   */
  clearAll(): void {
    localStorage.removeItem(STORAGE_CURRENT_VERSION);
    localStorage.removeItem(STORAGE_PENDING_CHANGES);
    localStorage.removeItem(STORAGE_VERSION_HISTORY);
    localStorage.removeItem(STORAGE_VERSION_FINALIZED);
    this.notifyUpdate();
  },

  /**
   * Dispatches a window event so React views update instantaneously without full page reload.
   */
  notifyUpdate(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CHRONICLE_CHANGELOG_EVENT));
    }
  }
};
