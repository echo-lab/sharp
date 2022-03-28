'use babel';

import Tidal_History from './history';
import Pattern_History from './history';

var lineText;
var lineNum;
let usedPatterns = [];
let boxContainers = [];

export default class UndolivecodingView {

  constructor(serializedState) {
    // Create root
    this.element = document.createElement('div');
    this.element.classList.add('undolivecoding');

    // Create message element
    const message = document.createElement('div');
    message.textContent = 'The ActiveEditorInfo package is Alive! It\'s ALIVE!';
    message.classList.add('message');
    this.element.appendChild(message);

    this.subscriptions = atom.workspace.getCenter().observeActivePaneItem(item => {
    if (!atom.workspace.isTextEditor(item)) {
      message.innerText = 'Open a file to see important information about it.';
      return;
    }

    // Register command that toggles this view
    atom.commands.add('atom-workspace', 'undolivecoding:enter', () => {
      this.changeText(message)
    });
    // atom.commands.add('atom-workspace', {
    //   //'undolivecoding:createBox': () => this.createBox(),
    //   'undolivecoding:enter': () => this.changeText(message)
    // });

    this.history = new Tidal_History();

    // this.editor.onDidChangeCursorPosition (() => {
    //   this.changeText(message);
    // }),

    /*
    message.innerHTML = `
      <h2>${item.getFileName() || 'untitled'}</h2>
      <ul>
        <li><b>Soft Wrap:</b> ${item.softWrapped}</li>
        <li><b>Tab Length:</b> ${item.getTabLength()}</li>
        <li><b>Encoding:</b> ${item.getEncoding()}</li>
        <li><b>Line Count:</b> ${item.getLineCount()}</li>
      </ul>
    `;*/
    message.innerHTML = `
    <h2>Undo Livecoding Demo</h2>
    `;
  });
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      // This is used to look up the deserializer function. It can be any string, but it needs to be
      // unique across all packages!
      deserializer: 'undolivecoding/UndolivecodingView'
    };
  }

  changeText (message) {
    console.log("Change text called");
    var editor = atom.workspace.getActiveTextEditor();
    var cursorStr = editor.getLastCursor().getCurrentBufferLine().trim();
    var cursorLine = editor.getLastCursor().getBufferRow();
    if(cursorStr.startsWith("--") || cursorStr === ""){
      console.log("Not a tidal line:\n" + cursorStr);
    }
    else if(!lineText || cursorLine != lineNum){
      message.innerHTML = `
      <h2>Undo Livecoding Demo</h2>
      <p>${cursorStr}</p>
      `;
      lineText = cursorStr;
      lineNum = cursorLine;
    }
    else{
      if(cursorStr.startsWith(lineText)){
        //green added on
        var excess = cursorStr.substring(cursorStr.indexOf(lineText) + lineText.length);
        message.innerHTML = `
        <h2>Undo Livecoding Demo</h2>
        <p>${lineText}<span style="background-color: #00FF00">${excess}</span></p>
        `;
      }
      else if (lineText.startsWith(cursorStr)){
        //red taken away
        var excess = lineText.substring(lineText.indexOf(cursorStr) + cursorStr.length);
        message.innerHTML = `
        <h2>Undo Livecoding Demo</h2>
        <p>${cursorStr}<span style="background-color: #FF0000">${excess}</span></p>
        `;
      }
      else {
        //its more complicated
        message.innerHTML = `
        <h2>Undo Livecoding Demo</h2>
        <p><span style="background-color: #FFFF00">${cursorStr}</span></p>
        `;
      }

      let patternNum = this.history.addToHistory(cursorStr);
      this.history.printHistory();

      if(!usedPatterns.includes(patternNum)){
        boxContainers[patternNum] = this.createBox(patternNum);
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
        for(let j = 0; j < currentPattern.length; j++){
          boxContainers[i].innerHTML += `
          <input type="radio" name=${i} value=${currentPattern[j].getLine()} id=${currentPattern[j].getLine()}>
          <label for=${currentPattern[j].getLine()}>${currentPattern[j].getLine()}</label>
          `;
          console.log("Added radio button: " + currentPattern[j].getLine());
        }
      }

    }
  }

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

    container.innerHTML = `
    <input type="radio" name="favorite_pet" value="Cats" id="cats" checked>
    <label for="cats">Cats</label>
    `;

    return container;
  }

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

  getTitle() {
    // Used by Atom for tab text
    return 'Undo Live Coding';
  }

  getURI() {
    // Used by Atom to identify the view when toggling.
    return 'atom://undolivecoding';
  }

  getDefaultLocation() {
    // This location will be used if the user hasn't overridden it by dragging the item elsewhere.
    // Valid values are "left", "right", "bottom", and "center" (the default).
    return 'right';
  }

  getAllowedLocations() {
    // The locations into which the item can be moved.
    return ['left', 'right', 'bottom'];
  }

}
