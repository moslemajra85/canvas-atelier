import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching, foldGutter, indentOnInput } from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers
} from "@codemirror/view";
import { syntaxHighlighting } from "@codemirror/language";

/** Adapter that hides CodeMirror-specific APIs from the application. */
export class CodeEditor {
  constructor({ parent, source, onChange, onCursorChange, onRun }) {
    const runKey = {
      key: "Mod-Enter",
      run: () => {
        onRun();
        return true;
      }
    };

    this.view = new EditorView({
      parent,
      state: EditorState.create({
        doc: source,
        extensions: [
          lineNumbers(),
          foldGutter({ openText: "⌄", closedText: "›" }),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          drawSelection(),
          dropCursor(),
          indentOnInput(),
          bracketMatching(),
          highlightActiveLine(),
          syntaxHighlighting(oneDarkHighlightStyle),
          javascript(),
          EditorState.tabSize.of(2),
          keymap.of([runKey, indentWithTab, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChange(update.state.doc.toString());
            if (update.docChanged || update.selectionSet) {
              const position = update.state.doc.lineAt(update.state.selection.main.head);
              onCursorChange({
                line: position.number,
                column: update.state.selection.main.head - position.from + 1
              });
            }
          })
        ]
      })
    });
  }

  getValue() {
    return this.view.state.doc.toString();
  }

  setValue(source) {
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: source }
    });
  }

  focus() {
    this.view.focus();
  }

  destroy() {
    this.view.destroy();
  }
}
