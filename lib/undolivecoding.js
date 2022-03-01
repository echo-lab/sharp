'use babel';

import UndolivecodingView from './undolivecoding-view';
import {CompositeDisposable, Disposable, Point, Range} from 'atom';

export default {

  subscriptions: null,

  activate(state) {
    var editor;
    editor = atom.workspace.getActiveTextEditor();

    this.subscriptions = new CompositeDisposable(
      // Add an opener for our view.
      atom.workspace.addOpener(uri => {
        if (uri === 'atom://undolivecoding') {
          return new UndolivecodingView();
        }
      }),

      // Register command that toggles this view
      atom.commands.add('atom-workspace', {
        'undolivecoding:toggle': () => this.toggle(),
        'undolivecoding:createbox': () => this.createBox()
      }),

      atom.workspace.onDidChangeActivePaneItem (() => {
        //console.log("changed active pane.")
      }),

      editor.onDidChangeCursorPosition (() => {
        editor = atom.workspace.getActiveTextEditor();
        //console.log("Reloading...");
        console.log(editor.getTextInBufferRange(editor.getCurrentParagraphBufferRange()));
        //UndolivecodingView.changeText(editor.getTextInBufferRange(editor.getCurrentParagraphBufferRange()));
      }),

      // Destroy any ActiveEditorInfoViews when the package is deactivated.
      new Disposable(() => {
        atom.workspace.getPaneItems().forEach(item => {
          if (item instanceof UndolivecodingView) {
            item.destroy();
          }
        });
      })
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  refreshWindow() {
    console.log("Reloading Window...")
  },

  toggle() {
    atom.workspace.toggle('atom://undolivecoding');
  },

/*
  createBox() {
    let editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    let {row} = editor.getCursorBufferPosition();
    // I don't totally understand why these values work for the range...
    let range = new Range(new Point(row+1, 0), new Point(row+1, 0));
    let marker = editor.markBufferRange(range, {invalidate: 'never'});

    let container = document.createElement("div");
    container.classList.add("version-container");
    container.innerText = "<Placeholder - click to close>";
    container.onclick = () => {marker.destroy();};  // Just for now!
    editor.decorateMarker(marker, {type: 'block', item: container});
  },
*/

  deserializeActiveEditorInfoView(serialized) {
    return new UndolivecodingView();
  }

};
