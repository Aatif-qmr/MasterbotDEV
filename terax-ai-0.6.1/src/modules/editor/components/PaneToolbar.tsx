import { Split, Rows, X } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';

export function PaneToolbar({ paneId }: { paneId: string }) {
  const addPane = useEditorStore((s) => s.addPane);
  const closePane = useEditorStore((s) => s.closePane);

  return (
    <div className="flex gap-2 p-1 border-b">
      <button onClick={() => addPane('horizontal')} title="Split Right">
        <Split size={14} />
      </button>
      <button onClick={() => addPane('vertical')} title="Split Down">
        <Rows size={14} />
      </button>
      <button onClick={() => closePane(paneId)} title="Close Pane">
        <X size={14} />
      </button>
    </div>
  );
}
