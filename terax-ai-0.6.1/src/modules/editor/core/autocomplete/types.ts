export interface GhostSuggestion {
  text: string;
  range: { from: number, to: number };
  confidence: number;
  source: 'inline' | 'context';
}

export interface AutocompleteState {
  activeSuggestion: GhostSuggestion | null;
  isLoading: boolean;
  lastTrigger: number;
}
