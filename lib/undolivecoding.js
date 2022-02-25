'use babel';

import UndolivecodingView from './undolivecoding-view';
import {CompositeDisposable, Disposable} from 'atom';

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
        'undolivecoding:toggle': () => this.toggle()
      }),

      atom.workspace.onDidChangeActivePaneItem (() => {
        //console.log("Reloading...")
      }),

      editor.onDidChangeCursorPosition (() => {
        console.log("Reloading...")
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



  deserializeActiveEditorInfoView(serialized) {
    return new UndolivecodingView();
  }

};
