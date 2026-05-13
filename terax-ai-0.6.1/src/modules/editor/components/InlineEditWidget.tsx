import { Check, X } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';

interface InlineEditWidgetProps {
  editId: string;
  filePath: string;
}

export function InlineEditWidget({ editId, filePath }: InlineEditWidgetProps) {
  const applyEdit = useEditorStore((s) => s.applyEdit);

  return (
    <div className="absolute z-10 flex gap-1 rounded bg-popover p-1 border border-border shadow-sm text-popover-foreground">
      <button 
        className="hover:bg-green-500/20 text-green-500 p-0.5 rounded"
        onClick={() => applyEdit(filePath, editId, true)}
        title="Accept"
      >
        <Check size={14} />
      </button>
      <button 
        className="hover:bg-red-500/20 text-red-500 p-0.5 rounded"
        onClick={() => applyEdit(filePath, editId, false)}
        title="Reject"
      >
        <X size={14} />
      </button>
    </div>
  );
}
