import { invoke } from '@tauri-apps/api/core';
import { EditorView } from '@codemirror/view';
import { contextService } from '@/modules/ai/context/service';
import type { GhostSuggestion } from './types';

export class AutocompleteService {
  async triggerCompletion(view: EditorView, filePath: string, language: string): Promise<GhostSuggestion | null> {
    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    const prefix = line.text.slice(0, pos - line.from);

    // Heuristic: only trigger if line not empty or ends with trigger char
    if (prefix.trim().length === 0 && prefix.length > 0) return null;

    try {
      // 1. Get project context
      const related = await contextService.searchContext(prefix, 2);
      const relatedFiles = await Promise.all(
        related.map(async (doc) => ({
          path: doc.file_path,
          content: await contextService.getFileContent(doc.file_path) || ""
        }))
      );

      // 2. Invoke Rust command
      const result = await invoke<{ text: string, confidence: number }>('ac_get_suggestion', {
        context: {
          file_path: filePath,
          prefix: view.state.doc.sliceString(Math.max(0, pos - 1000), pos), // Send last 1000 chars for context
          language: language,
          related_files: relatedFiles
        }
      });

      if (!result.text) return null;

      return {
        text: result.text,
        range: { from: pos, to: pos },
        confidence: result.confidence,
        source: 'context'
      };
    } catch (err) {
      console.error('Autocomplete failed:', err);
      return null;
    }
  }

  acceptSuggestion(view: EditorView, suggestion: GhostSuggestion) {
    view.dispatch({
      changes: {
        from: suggestion.range.from,
        to: suggestion.range.to,
        insert: suggestion.text
      },
      selection: { anchor: suggestion.range.from + suggestion.text.length },
      userEvent: 'input.complete'
    });
  }
}

export const autocompleteService = new AutocompleteService();
