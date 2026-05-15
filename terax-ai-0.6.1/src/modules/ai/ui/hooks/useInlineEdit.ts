import { useCallback } from 'react';
import { useEditorStore } from '@/modules/editor/store/editorStore';
import { timeTravelService } from '@/modules/core/time_travel/service';

export function useInlineEdit(filePath: string) {
  const proposeEdit = useEditorStore((s) => s.proposeEdit);

  const propose = useCallback(async (range: { from: number, to: number }, suggestion: string, originalText: string) => {
    // Take snapshot before edit
    await timeTravelService.createSnapshot(`Before AI Edit: ${filePath.split('/').pop()}`);
    return proposeEdit(filePath, range, suggestion, originalText);
  }, [filePath, proposeEdit]);

  return { propose };
}
