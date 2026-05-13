import { EditorView, Decoration, type DecorationSet } from '@codemirror/view';
import { StateField, StateEffect, type Transaction } from '@codemirror/state';
import { type InlineEdit } from '../types';

export const addEditEffect = StateEffect.define<InlineEdit>();
export const applyEditEffect = StateEffect.define<{ id: string; accept: boolean }>();

export const inlineEditField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(value: DecorationSet, tr: Transaction) {
    value = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(addEditEffect)) {
        // Here we'd map the InlineEdit range to decorations
      }
    }
    return value;
  },
  provide: (f: StateField<DecorationSet>) => EditorView.decorations.from(f),
});
