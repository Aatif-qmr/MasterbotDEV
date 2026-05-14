import { EditorView, Decoration, WidgetType } from '@codemirror/view';
import { StateField, StateEffect, type Transaction, EditorState, RangeSetBuilder } from '@codemirror/state';
import { type InlineEdit } from '../../types';
import { InlineEditWidget } from '../../components/InlineEditWidget';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { useEditorStore } from '../../store/editorStore';

export const addEditEffect = StateEffect.define<InlineEdit>();
export const applyEditEffect = StateEffect.define<{ id: string; accept: boolean }>();
export const invalidateEditEffect = StateEffect.define<string>();

interface InternalEdit {
  id: string;
  filePath: string;
  from: number;
  to: number;
  status: 'pending' | 'stale';
}

class EditWidget extends WidgetType {
  constructor(readonly editId: string, readonly filePath: string, readonly stale: boolean) { super(); }
  
  eq(other: EditWidget) {
    return this.editId === other.editId && this.stale === other.stale;
  }

  toDOM() {
    const div = document.createElement('div');
    const root = ReactDOM.createRoot(div);
    root.render(React.createElement(InlineEditWidget, { 
      editId: this.editId, 
      filePath: this.filePath,
      stale: this.stale 
    }));
    return div;
  }
}

/**
 * Manages the lifecycle of AI-suggested inline edits.
 * Tracks ranges and invalidates them if user manual edits overlap.
 */
export const inlineEditField = StateField.define<InternalEdit[]>({
  create() { return []; },
  update(value: InternalEdit[], tr: Transaction) {
    // 1. Map existing ranges to new document positions
    let nextValue = value.map(edit => ({
      ...edit,
      from: tr.changes.mapPos(edit.from, 1),
      to: tr.changes.mapPos(edit.to, -1)
    }));

    // 2. Detect user overlap and mark as stale
    if (!tr.changes.empty) {
      tr.changes.iterChanges((fromA, toA) => {
        // Use value (original positions) for overlap check
        value.forEach((edit, i) => {
          if (edit.status === 'stale') return;
          // Check if the manual change overlaps with the suggestion range
          const overlaps = Math.max(fromA, edit.from) < Math.min(toA, edit.to);
          if (overlaps) {
            nextValue[i].status = 'stale';
            
            // Dispatch notification to editorStore to sync logic state
            const store = useEditorStore.getState();
            // We use a small delay to ensure the UI update cycle completes first
            setTimeout(() => store.applyEdit(edit.filePath, edit.id, false), 2000);
          }
        });
      });
    }

    // 3. Handle incoming effects
    for (const e of tr.effects) {
      if (e.is(addEditEffect)) {
        nextValue.push({
          id: e.value.id,
          filePath: e.value.filePath,
          from: e.value.range.from,
          to: e.value.range.to,
          status: 'pending'
        });
      } else if (e.is(applyEditEffect)) {
        nextValue = nextValue.filter(edit => edit.id !== e.value.id);
      } else if (e.is(invalidateEditEffect)) {
        nextValue = nextValue.map(edit => edit.id === e.value ? { ...edit, status: 'stale' } : edit);
      }
    }
    
    return nextValue;
  },
  provide: (f) => EditorView.decorations.from(f, edits => {
    const builder = new RangeSetBuilder<Decoration>();
    const sorted = [...edits].sort((a, b) => a.from - b.from);
    for (const edit of sorted) {
      const isStale = edit.status === 'stale';
      const cls = isStale ? 'cm-inline-edit-stale' : 'cm-inline-edit-pending';
      
      builder.add(edit.from, edit.to, Decoration.mark({ 
        attributes: { class: cls } 
      }));
      
      builder.add(edit.to, edit.to, Decoration.widget({
        widget: new EditWidget(edit.id, edit.filePath, isStale),
        side: 1
      }));
    }
    return builder.finish();
  }),
});

/**
 * Transaction filter that automatically removes stale decorations
 * during subsequent interactions to keep the editor clean.
 */
export const inlineEditCleanupFilter = EditorState.transactionFilter.of(tr => {
  const edits = tr.startState.field(inlineEditField, false);
  if (!edits) return tr;

  const staleIds = edits.filter(e => e.status === 'stale').map(e => e.id);
  if (staleIds.length > 0 && tr.docChanged) {
    // If a subsequent change happens, we cleanup any existing stale edits
    return [tr, { effects: staleIds.map(id => applyEditEffect.of({ id, accept: false })) }];
  }
  return tr;
});

export const inlineEditTheme = EditorView.theme({
  '.cm-inline-edit-pending': { backgroundColor: 'rgba(254, 243, 199, 0.5)' },
  '.cm-inline-edit-stale': { 
    backgroundColor: 'rgba(243, 244, 246, 0.3)',
    textDecoration: 'line-through wavy rgba(239, 68, 68, 0.4)'
  },
});
