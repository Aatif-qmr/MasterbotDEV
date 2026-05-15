import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  keymap,
} from "@codemirror/view";
import {
  StateField,
  StateEffect,
  Prec,
} from "@codemirror/state";
import { GhostSuggestion } from "./types";
import { autocompleteService } from "./service";
import { useEditorStore } from "../../store/editorStore";

// Effects
export const setGhostSuggestion = StateEffect.define<GhostSuggestion | null>();

// State Field
export const ghostTextState = StateField.define<{
  suggestion: GhostSuggestion | null;
}>({
  create() {
    return { suggestion: null };
  },
  update(value, tr) {
    for (let effect of tr.effects) {
      if (effect.is(setGhostSuggestion)) {
        return { suggestion: effect.value };
      }
    }
    // Clear on document change if it doesn't match
    if (tr.docChanged && value.suggestion) {
        return { suggestion: null };
    }
    return value;
  },
});

class GhostTextWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  toDOM() {
    let span = document.createElement("span");
    span.className = "cm-ghost-text";
    span.textContent = this.text;
    return span;
  }
}

// View Plugin for rendering
const ghostTextView = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.getDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = this.getDecorations(update.view);
      }
    }
    getDecorations(view: EditorView) {
      const state = view.state.field(ghostTextState);
      if (!state.suggestion) return Decoration.none;

      return Decoration.set([
        Decoration.widget({
          widget: new GhostTextWidget(state.suggestion.text),
          side: 1,
        }).range(state.suggestion.range.to),
      ]);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// Triggers and keybindings
const ghostTextTriggers = (config: { getPath: () => string, getLanguage: () => string | null }) => ViewPlugin.fromClass(
  class {
    private timer: any = null;
    constructor(private view: EditorView) {}

    update(update: ViewUpdate) {
      if (update.docChanged) {
        const s = useEditorStore.getState();
        if (!s.enableGhostText) return;

        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.trigger();
        }, 300); // 300ms debounce
      }
    }

    async trigger() {
      const path = config.getPath();
      const lang = config.getLanguage() || "text";
      
      const suggestion = await autocompleteService.triggerCompletion(this.view, path, lang);
      if (suggestion) {
        this.view.dispatch({
          effects: setGhostSuggestion.of(suggestion),
        });
      }
    }

    destroy() {
      clearTimeout(this.timer);
    }
  }
);

const ghostTextKeymap = keymap.of([
  {
    key: "Tab",
    run: (view) => {
      const state = view.state.field(ghostTextState);
      if (state.suggestion) {
        autocompleteService.acceptSuggestion(view, state.suggestion);
        view.dispatch({ effects: setGhostSuggestion.of(null) });
        return true;
      }
      return false;
    },
  },
  {
    key: "Escape",
    run: (view) => {
      const state = view.state.field(ghostTextState);
      if (state.suggestion) {
        view.dispatch({ effects: setGhostSuggestion.of(null) });
        return true;
      }
      return false;
    },
  },
]);

export function ghostTextExtension(config: { getPath: () => string, getLanguage: () => string | null }) {
  return [
    ghostTextState,
    ghostTextView,
    ghostTextTriggers(config),
    Prec.highest(ghostTextKeymap),
  ];
}
