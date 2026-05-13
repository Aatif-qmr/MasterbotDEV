import { X } from 'lucide-react';
import { type EditorPaneState } from '../types';

interface EditorPaneProps {
  state: EditorPaneState;
  isActive: boolean;
  onFocus: () => void;
  onClose: () => void;
}

export function EditorPane({ state, isActive, onFocus, onClose }: EditorPaneProps) {
  const fileName = state.filePath ? state.filePath.split('/').pop() : 'Untitled';

  return (
    <div 
      className={`h-full flex flex-col border ${isActive ? 'border-primary' : 'border-border'}`}
      onClick={onFocus}
    >
      <div className="flex items-center justify-between bg-muted px-2 py-1 text-xs text-muted-foreground">
        <span>{fileName}</span>
        <button onClick={onClose} className="hover:text-foreground">
          <X size={12} />
        </button>
      </div>
      <div className="flex-grow">
        {/* CodeMirror instance here */}
        <div className="p-4 text-xs">Editor for {state.filePath || 'No file'}</div>
      </div>
    </div>
  );
}
