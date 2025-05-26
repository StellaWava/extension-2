// src/utils/storage.ts
import { ProgramData, StorageData } from '../types/program';

export class StorageManager {
  private static readonly STORAGE_KEY = 'courseCompareData';

  static async getData(): Promise<StorageData> {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    return (result[this.STORAGE_KEY] as StorageData) || {
      programs: [],
      isPremium: false,
      settings: {
        maxFreePrograms: 3
      }
    };
  }

  static async saveData(data: StorageData): Promise<void> {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: data });
  }

  static async addProgram(program: ProgramData): Promise<boolean> {
    const data = await this.getData();

    const exists = data.programs.some(p =>
      p.university === program.university && p.title === program.title
    );

    if (exists) {
      return false;
    }

    if (!data.isPremium && data.programs.length >= data.settings.maxFreePrograms) {
      throw new Error('FREE_LIMIT_REACHED');
    }

    data.programs.push(program);
    await this.saveData(data);
    return true;
  }

  static async removeProgram(id: string): Promise<void> {
    const data = await this.getData();
    data.programs = data.programs.filter(p => p.id !== id);
    await this.saveData(data);
  }

  static async getPrograms(): Promise<ProgramData[]> {
    const data = await this.getData();
    return data.programs;
  }
}