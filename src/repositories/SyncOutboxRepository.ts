import { db } from '../db';
import type { SyncOutbox } from '../types';

export const SyncOutboxRepository = {
  async add(outbox: Omit<SyncOutbox, 'createdAt' | 'status'>): Promise<number> {
    const record: SyncOutbox = {
      ...outbox,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    return await db.sync_outbox.add(record);
  },

  async listPending(): Promise<SyncOutbox[]> {
    return await db.sync_outbox
      .where('status')
      .anyOf(['pending', 'failed'])
      .toArray();
  },

  async listConflicts(): Promise<SyncOutbox[]> {
    return await db.sync_outbox
      .where('status')
      .equals('conflict')
      .toArray();
  },

  async updateStatus(id: number, status: SyncOutbox['status'], errorMessage?: string): Promise<void> {
    await db.sync_outbox.update(id, { status, errorMessage });
  },

  async updateConflict(id: number, serverVersion: number, serverPayload: any): Promise<void> {
    await db.sync_outbox.update(id, {
      status: 'conflict',
      serverVersion,
      serverPayload
    });
  },

  async delete(id: number): Promise<void> {
    await db.sync_outbox.delete(id);
  },

  async get(id: number): Promise<SyncOutbox | undefined> {
    return await db.sync_outbox.get(id);
  }
};
