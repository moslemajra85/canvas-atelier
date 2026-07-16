import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching, foldGutter, indentOnInput, syntaxTree } from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import {
  drawSelection,
  Decoration,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers
} from "@codemirror/view";
import { syntaxHighlighting } from "@codemirror/language";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";

export const runtimeCompletions = [
  { label: "canvas", type: "variable", detail: "Artwork OffscreenCanvas" },
  { label: "ctx", type: "variable", detail: "CanvasRenderingContext2D" },
  { label: "width", type: "variable", detail: "Current CSS-pixel width" },
  { label: "height", type: "variable", detail: "Current CSS-pixel height" },
  { label: "seed", type: "variable", detail: "Persisted project seed" },
  { label: "random", type: "function", detail: "Deterministic random number" },
  { label: "createRandom", type: "function", detail: "Create a seeded generator" },
  { label: "onResize", type: "function", detail: "Register responsive redraw" },
  { label: "fitCanvas", type: "function", detail: "Resize canvas backing store" },
  { label: "createButton", type: "function", detail: "Add an artwork control" },
  { label: "loadImageAsset", type: "function", detail: "Load a portable image" },
  { label: "requestAnimationFrame", type: "function", detail: "Schedule animation" }
];

function runtimeCompletionSource(context) {
  const word = context.matchBefore(/[\w$]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return { from: word.from, options: runtimeCompletions };
}

const setDiagnosticsEffect = StateEffect.define();
const diagnosticField = StateField.define({
  create: () => Decoration.none,
  update(decorations, transaction) {
    if (transaction.docChanged) decorations = Decoration.none;
    for (const effect of transaction.effects) {
      if (effect.is(setDiagnosticsEffect)) decorations = effect.value;
    }
    return decorations.map(transaction.changes);
  },
  provide: field => EditorView.decorations.from(field)
});

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
          autocompletion({ override: [runtimeCompletionSource] }),
          diagnosticField,
          EditorState.tabSize.of(2),
          keymap.of([runKey, indentWithTab, ...completionKeymap, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
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

  appendSnippet(source) {
    const separator = this.view.state.doc.length ? "\n\n" : "";
    const insertion = `${separator}${source.trim()}\n`;
    const from = this.view.state.doc.length;
    this.view.dispatch({
      changes: { from, insert: insertion },
      selection: { anchor: from + insertion.length },
      effects: EditorView.scrollIntoView(from + insertion.length, { y: "center" })
    });
    this.focus();
  }

  getSyntaxDiagnostics() {
    const diagnostics = [];
    const seenLines = new Set();
    const { doc } = this.view.state;
    const cursor = syntaxTree(this.view.state).cursor();

    do {
      if (!cursor.type.isError) continue;
      const line = doc.lineAt(Math.min(cursor.from, doc.length));
      if (seenLines.has(line.number)) continue;
      seenLines.add(line.number);
      diagnostics.push({
        line: line.number,
        column: cursor.from - line.from + 1,
        message: "JavaScript syntax appears incomplete or invalid"
      });
    } while (cursor.next());

    return diagnostics;
  }

  getDiagnostics() {
    return [...this.getSyntaxDiagnostics(), ...semanticDiagnostics(this.getValue())];
  }

  setDiagnostics(diagnostics) {
    const { doc } = this.view.state;
    const decorations = diagnostics.flatMap(diagnostic => {
      if (!Number.isInteger(diagnostic.line) || diagnostic.line < 1 || diagnostic.line > doc.lines) return [];
      const line = doc.line(diagnostic.line);
      return [Decoration.line({
        attributes: {
          class: "cm-diagnostic-line",
          title: diagnostic.message
        }
      }).range(line.from)];
    });

    this.view.dispatch({ effects: setDiagnosticsEffect.of(Decoration.set(decorations, true)) });
  }

  focusDiagnostic({ line, column = 1 }) {
    if (!Number.isInteger(line) || line < 1 || line > this.view.state.doc.lines) return;
    const documentLine = this.view.state.doc.line(line);
    const position = Math.min(documentLine.to, documentLine.from + Math.max(0, column - 1));
    this.view.dispatch({
      selection: { anchor: position },
      effects: EditorView.scrollIntoView(position, { y: "center" })
    });
    this.focus();
  }

  focus() {
    this.view.focus();
  }

  destroy() {
    this.view.destroy();
  }
}

export function semanticDiagnostics(source) {
  const rules = [
    { pattern: /\bMath\.random\s*\(/, message: "Use random() or createRandom(seed) to keep artwork reproducible." },
    { pattern: /\bwhile\s*\(\s*true\s*\)/, message: "An unconditional loop will be stopped by the execution watchdog." },
    { pattern: /\bdocument\.(querySelector|getElementById|body)\b/, message: "Artwork runs in a Worker; use canvas, ctx, or createButton() instead of DOM access." },
    { pattern: /\b(localStorage|sessionStorage)\b/, message: "Browser storage is unavailable inside artwork Workers; project persistence is managed by the studio." }
  ];
  return source.split("\n").flatMap((line, index) => rules.flatMap(rule => {
    const match = line.match(rule.pattern);
    return match ? [{ line: index + 1, column: match.index + 1, severity: "warning", message: rule.message }] : [];
  }));
}
