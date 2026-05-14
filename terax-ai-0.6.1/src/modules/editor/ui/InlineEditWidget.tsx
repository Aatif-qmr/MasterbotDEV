import { Check, X, AlertCircle } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { cn } from '@/modules/core/utils';

interface InlineEditWidgetProps {
  editId: string;
  filePath: string;
  stale?: boolean;
}

export function InlineEditWidget({ editId, filePath, stale }: InlineEditWidgetProps) {
  const applyEdit = useEditorStore((s) => s.applyEdit);

  return (
    <div className={cn(
      "absolute z-10 flex gap-1 rounded bg-popover p-1 border border-border shadow-sm text-popover-foreground items-center",
      stale && "opacity-60 bg-muted"
    )}>
      {stale && (
        <span title="This suggestion may be outdated due to manual edits.">
          <AlertCircle size={14} className="text-orange-500 ml-0.5" />
        </span>
      )}
      <button 
        className={cn(
          "hover:bg-green-500/20 text-green-500 p-0.5 rounded",
          stale && "text-muted-foreground hover:bg-transparent cursor-not-allowed"
        )}
        onClick={() => !stale && applyEdit(filePath, editId, true)}
        disabled={stale}
        title={stale ? "Invalidated" : "Accept"}
      >
        <Check size={14} />
      </button>
      <button 
        className="hover:bg-red-500/20 text-red-500 p-0.5 rounded"
        onClick={() => applyEdit(filePath, editId, false)}
        title="Discard"
      >
        <X size={14} />
      </button>
    </div>
  );
}
