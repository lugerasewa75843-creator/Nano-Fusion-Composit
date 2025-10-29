
// Fix: Use a type-only import for the `Table` interface from Dexie.
// This is the correct way to import TypeScript interfaces and can resolve
// issues with subclass type resolution.
import Dexie, { type Table } from 'dexie';
import type { HistoryItem, Preset } from '../types';

export interface AppSettings {
    key: string;
    value: any;
}

export class NanoFusionDB extends Dexie {
  history!: Table<HistoryItem, number>;
  settings!: Table<AppSettings, string>;
  presets!: Table<Preset, number>;

  constructor() {
    super('NanoFusionDB');
    // CRITICAL: DO NOT INCREMENT THE DB VERSION WITHOUT A PROPER, NON-DESTRUCTIVE
    // .upgrade() MIGRATION PATH. Incrementing this number WILL WIPE ALL
    // USER DATA (history, settings) if not handled correctly.
    // See Dexie.js documentation on versioning.
    (this as Dexie).version(3).stores({
      history: '++id, timestamp', // Primary key and indexed props
      settings: 'key', // key-value store
      presets: '++id, name, timestamp', // Added presets table
    });
  }
}

export const db = new NanoFusionDB();
