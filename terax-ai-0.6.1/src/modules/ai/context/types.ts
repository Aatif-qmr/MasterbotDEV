export interface ContextDocument {
  id: string;
  project_path: string;
  file_path: string;
  content_snippet: string;
  language: string;
  importance_score: number;
  last_indexed: number;
}

export interface ProjectStats {
  file_count: number;
  languages: [string, number][];
  last_index_time: number;
}

export interface ContextState {
  isIndexing: boolean;
  indexedFileCount: number;
  lastSync: number | null;
}
