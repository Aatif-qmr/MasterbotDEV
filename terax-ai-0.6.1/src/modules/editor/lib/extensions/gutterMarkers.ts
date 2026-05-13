import { gutter, GutterMarker } from '@codemirror/view';
import { type InlineEdit } from '../../types';

class EditMarker extends GutterMarker {
  constructor(readonly edit: InlineEdit) { super(); }
  toDOM() {
    const div = document.createElement('div');
    div.className = `w-2 h-2 rounded-full ${this.edit.status === 'pending' ? 'bg-yellow-500' : this.edit.status === 'accepted' ? 'bg-green-500' : 'bg-red-500'}`;
    return div;
  }
}

export const editGutter = gutter({
  lineMarker: (_view, _line) => {
    return null;
  },
  initialSpacer: () => new EditMarker({} as any),
});
