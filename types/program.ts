export interface ProgramData {
  id: string;
  title: string;
  university: string;
  duration?: string;
  tuition?: string;
  deadline?: string;
  gre?: string;
  url: string;
  savedAt: number;
  extractedData: Record<string, string>;
}

export interface StorageData {
  programs: ProgramData[];
  isPremium: boolean;
  settings: {
    maxFreePrograms: number;
  };
}
