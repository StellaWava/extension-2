// src/types/index.ts

export interface ProgramData {
  id: string;
  title: string;
  university: string;
  duration?: string;
  tuition?: string;
  deadline?: string;
  gre?: string;
  description?: string;
  url: string;
  extractedAt: number;
  additionalInfo?: Record<string, string>;
}

export interface StorageData {
  savedPrograms: ProgramData[];
  settings: UserSettings;
}

export interface UserSettings {
  isPremium: boolean;
  maxSavedPrograms: number;
  autoSave: boolean;
  notificationsEnabled: boolean;
}

export interface ExtractionPattern {
  selector: string;
  attribute?: string;
  transform?: (value: string) => string;
}

export interface ExtractionConfig {
  title: ExtractionPattern[];
  university: ExtractionPattern[];
  duration: ExtractionPattern[];
  tuition: ExtractionPattern[];
  deadline: ExtractionPattern[];
  gre: ExtractionPattern[];
  description: ExtractionPattern[];
}

export interface ComparisonData {
  programs: ProgramData[];
  fields: string[];
}

export type MessageType = 
  | 'EXTRACT_PROGRAM_DATA'
  | 'SAVE_PROGRAM'
  | 'GET_SAVED_PROGRAMS'
  | 'REMOVE_PROGRAM'
  | 'COMPARE_PROGRAMS'
  | 'UPDATE_SETTINGS';

export interface Message {
  type: MessageType;
  payload?: any;
}

export interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}