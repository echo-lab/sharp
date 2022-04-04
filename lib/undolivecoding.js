'use babel';

import {CompositeDisposable, Disposable, Point, Range} from 'atom';

import Tidal_History from './history';
import Pattern_History from './history';

var lineText;
var lineNum;
let usedPatterns = [];
let boxContainers = [];

var containers = [];


export default {

  subscriptions: null,

  activate(state) {
    var editor;
    editor = atom.workspace.getActiveTextEditor();

    this.history = new Tidal_History();

    // init container array
    for(let i = 0; i < this.history.getNumPatterns(); i++){
      containers[i] = {
        'patternNum': -1,
        'patternName': "",
        'lineNum': -1,
        'used': false,
        'container': null,
        'marker': null
      }
    }

    //set up radio button click function
    document.onclick = (e) => {
      var realTarget = e ? e.target : window.event.srcElement;
      if (realTarget.nodeName.toLowerCase() === 'input' && realTarget.type === 'radio' ) {
        let patternNum = realTarget.name;
        let nodeNum = realTarget.id;
        let node = this.history.getPatternHistories()[patternNum].getPatternHistory()[nodeNum];

        this.history.getPatternHistories()[patternNum].setSelectedNode(node);
        //node.select();

        //update lineNum for box, if needed
        containers[patternNum]["lineNum"] = containers[patternNum]["marker"].getStartBufferPosition().row;

        let radioButtonStr = node.getLine();
        console.log(radioButtonStr);

        //find the range of the box thingy
        let lineNum = containers[patternNum]["lineNum"];
        let range = new Range([lineNum - 1, 0], [lineNum - 1, 100000]);

        //get the text that relates to the box and replace it
        editor.setTextInBufferRange(range, radioButtonStr);

        console.log(this.history.getPatternHistories()[patternNum]);

        console.log(containers[patternNum]["container"]);
      }
    }

    this.subscriptions = new CompositeDisposable(
      // Register command that toggles this view
      atom.commands.add('atom-workspace', {
        'undolivecoding:toggle': () => this.toggle()
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
    console.log("Starting up SHARP!");
    atom.notifications.addSuccess('Starting up SHARP!');
    // Register command that toggles this view
    atom.commands.add('atom-workspace', 'undolivecoding:enter', () => {
      this.changeText()
    });
    atom.commands.add('atom-workspace', 'undolivecoding:unique', () => {
      this.toggleTreesUnique()
    });
  },

  toggleTreesUnique () {
    if(this.history.getTreesUnique()){
      this.history.setTreesUnique(false);
      console.log("Trees can have multiple nodes with the same line in them.");
      atom.notifications.addInfo("Trees can have multiple nodes with the same line in them.");
    } else {
      this.history.setTreesUnique(true);
      console.log("Trees CANNOT have multiple nodes with the same line in them.");
      atom.notifications.addInfo("Trees CANNOT have multiple nodes with the same line in them.");
    }
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

    if(patternNum === -1){
      atom.notifications.addInfo("Not adding to history: not a pattern");
      return;
    }
    else if (patternNum >= this.history.getNumPatterns() && containers[patternNum] === undefined){
      containers[patternNum] = {
        'patternNum': patternNum,
        'patternName': this.history.getPatternHistories()[patternNum].getPatternName(),
        'lineNum': -1,
        'used': false,
        'container': null
      }
    }
    else{
      console.log(patternNum);
      console.log(containers[patternNum]);
    }

    if(containers[patternNum]["used"] === false){
      containers[patternNum]["used"] = true;
      containers[patternNum]["patternNum"] = patternNum;

      containers[patternNum]["container"] = this.createBox(cursorLine, patternNum);
      //usedPatterns.push(patternNum);
    }

    //refresh backend to frontend
    let patterns = this.history.getPatternHistories();
    let currentPattern;
    for (let i = 0; i < patterns.length; i++) { //should be 16 patterns
      currentPattern = patterns[i].getPatternHistory();
      if(currentPattern.length > 0){
        containers[i]["container"].innerHTML = ``;

        //dynamically change height
        containers[i]["container"].style.height = ((30*currentPattern.length) + "px");
      }
      for(let j = 0; j < currentPattern.length; j++){ //currentPattern is a PatternHistory holding Nodes
        if(currentPattern[j].getIsSelected()){
          containers[i]["container"].innerHTML += `
          <input type="radio" name=${i} value=${j} id=${j} checked>
          <label for=${j}>${currentPattern[j].getLine()}</label>
          <br>
          `;
        }
        else{
          containers[i]["container"].innerHTML += `
          <input type="radio" name=${i} value=${j} id=${j}>
          <label for=${j}>${currentPattern[j].getLine()}</label>
          <br>
          `;
        }
        console.log("Added radio button: " + currentPattern[j].getLine());
      }
    }
  },

  createBox (lineNum, patternNum) {
    console.log("Create box called");
    let editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    let {row} = editor.getCursorBufferPosition();
    // I don't totally understand why these values work for the range...
    let range = new Range([lineNum+1, 0], [lineNum+1, 0]);
    let marker = editor.markBufferRange(range, {invalidate: 'never'});

    containers[patternNum]["lineNum"] = lineNum;

    console.log(marker.getBufferRange());
    console.log(marker.getScreenRange());

    let container = document.createElement("div");
    container.classList.add("version-container");

    container.ondblclick = () => {
      marker.destroy();   // Just for now!
      containers[patternNum]["used"] = false;
    };

    editor.decorateMarker(marker, {type: 'block', item: container});
    containers[patternNum]["marker"] = marker;

    container.innerHTML = ``; //start with no radio buttons

    return container;
  },

  deserializeActiveEditorInfoView(serialized) {
    return new UndolivecodingView();
  }

};
