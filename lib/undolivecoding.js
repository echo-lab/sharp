'use babel';

import {CompositeDisposable, Disposable, Point, Range} from 'atom';

import Tidal_History from './history';
import Pattern_History from './history';

var lineText;
var lineNum;
let usedPatterns = [];
let boxContainers = [];

export default {

  subscriptions: null,

  activate(state) {
    var editor;
    editor = atom.workspace.getActiveTextEditor();

    this.history = new Tidal_History();

    this.subscriptions = new CompositeDisposable(
      // Add an opener for our view.
      // atom.workspace.addOpener(uri => {
      //   if (uri === 'atom://undolivecoding') {
      //     return new UndolivecodingView();
      //   }
      // }),

      // Register command that toggles this view
      atom.commands.add('atom-workspace', {
        'undolivecoding:toggle': () => this.toggle()
      }),

      // atom.workspace.onDidChangeActivePaneItem (() => {
      //   //console.log("changed active pane.")
      // }),

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
    console.log("Starting up SHARP!");
    // Register command that toggles this view
    atom.commands.add('atom-workspace', 'undolivecoding:enter', () => {
      this.changeText()
    });
  },

  changeText () {
    console.log("Change text called");
    var editor = atom.workspace.getActiveTextEditor();
    var cursorStr = editor.getLastCursor().getCurrentBufferLine().trim();
    var cursorLine = editor.getLastCursor().getBufferRow();
    if(cursorStr.startsWith("--") || cursorStr === ""){
      console.log("Not a tidal line:\n" + cursorStr);
    }
    else if(!lineText || cursorLine != lineNum){
      lineText = cursorStr;
      lineNum = cursorLine;
    }

    let patternNum = this.history.addToHistory(cursorStr);
    this.history.printHistory();

    if(!usedPatterns.includes(patternNum)){
      boxContainers[patternNum] = this.createBox(cursorLine);
      usedPatterns.push(patternNum);
    }

    //refresh backend to frontend
    let patterns = this.history.getPatternHistories();
    let currentPattern;
    for (let i = 0; i < patterns.length; i++) { //should be 16 patterns
      currentPattern = patterns[i].getPatternHistory();
      if(currentPattern.length > 0){
        boxContainers[i].innerHTML = ``;
      }
      for(let j = 0; j < currentPattern.length; j++){ //currentPattern is a PatternHistory holding Nodes
        if(currentPattern[j].getIsSelected()){
          boxContainers[i].innerHTML += `
          <input type="radio" name=${i} value=${currentPattern[j].getLine()} id=${currentPattern[j].getLine()} checked>
          <label for=${currentPattern[j].getLine()}>${currentPattern[j].getLine()}</label>
          `;
        }
        else{
          boxContainers[i].innerHTML += `
          <input type="radio" name=${i} value=${currentPattern[j].getLine()} id=${currentPattern[j].getLine()}>
          <label for=${currentPattern[j].getLine()}>${currentPattern[j].getLine()}</label>
          `;
        }
        console.log("Added radio button: " + currentPattern[j].getLine());
      }
    }
  },

  createBox (lineNum) {
    console.log("Create box called");
    let editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    let {row} = editor.getCursorBufferPosition();
    // I don't totally understand why these values work for the range...
    let range = new Range([lineNum+1, 0], [lineNum+1, 0]);
    let marker = editor.markBufferRange(range, {invalidate: 'never'});

    console.log(marker.getBufferRange());
    console.log(marker.getScreenRange());

    let container = document.createElement("div");
    container.classList.add("version-container");
    //container.innerText = "<Placeholder - click to close>";
    container.ondblclick = () => {marker.destroy();};  // Just for now!
    editor.decorateMarker(marker, {type: 'block', item: container});

    container.innerHTML = ``; //start with no radio buttons

    return container;
  },

  deserializeActiveEditorInfoView(serialized) {
    return new UndolivecodingView();
  }

};
