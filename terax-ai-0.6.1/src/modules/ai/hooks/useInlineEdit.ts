import { useCallback } from 'react';
import { useEditorStore } from '../../editor/store/editorStore';

export function useInlineEdit(filePath: string) {
  const proposeEdit = useEditorStore((s) => s.proposeEdit);

  const propose = useCallback((range: { from: number, to: number }, suggestion: string, originalText: string) => {
    return proposeEdit(filePath, range, suggestion, originalText);
  }, [filePath, proposeEdit]);

  return { propose };
}
