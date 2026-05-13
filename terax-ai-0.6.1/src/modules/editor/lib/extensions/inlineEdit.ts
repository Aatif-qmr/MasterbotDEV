import { EditorView, Decoration, type DecorationSet, WidgetType } from '@codemirror/view';
import { StateField, StateEffect, type Transaction } from '@codemirror/state';
import { type InlineEdit } from '../../types';
import { InlineEditWidget } from '../../components/InlineEditWidget';
import React from 'react';
import ReactDOM from 'react-dom/client';

export const addEditEffect = StateEffect.define<InlineEdit>();
export const applyEditEffect = StateEffect.define<{ id: string; accept: boolean }>();

class EditWidget extends WidgetType {
  constructor(readonly editId: string, readonly filePath: string) { super(); }
  toDOM() {
    const div = document.createElement('div');
    const root = ReactDOM.createRoot(div);
    root.render(React.createElement(InlineEditWidget, { editId: this.editId, filePath: this.filePath }));
    return div;
  }
}

export const inlineEditField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(value: DecorationSet, tr: Transaction) {
    value = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(addEditEffect)) {
        const edit = e.value;
        const decoration = Decoration.mark({ 
          attributes: { class: 'cm-inline-edit-pending' } 
        });
        const widget = Decoration.widget({ 
          widget: new EditWidget(edit.id, edit.filePath), 
          side: 1 
        });
        value = value.update({
          add: [
            decoration.range(edit.range.from, edit.range.to),
            widget.range(edit.range.to)
          ]
        });
      }
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const inlineEditTheme = EditorView.theme({
  '.cm-inline-edit-pending': { backgroundColor: '#fef3c7' },
});
