'use babel';

import {CompositeDisposable, Disposable, Point, Range} from 'atom';

import Tidal_History from './history';
import Pattern_History from './history';
import {Tree} from './tree';

var containers = [];

export const IDPREPEND = 'sharp';

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
        'hoverbox': null,
        'marker': null
      }
    }

    //set up radio button click function
    //NOT applicable with d3
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

        //move range up to account for blank lines
        while(editor.getTextInBufferRange(range).trim() === ""){
          range.start.row -= 1
          range.end.row -= 1
        }

        //move cursor
        let cursor = editor.getLastCursor();
        cursor.moveToTop();
        cursor.moveDown(range.start.row);

        let prev_text_range = editor.getCurrentParagraphBufferRange();

        //get the text that relates to the box and replace it
        editor.setTextInBufferRange(prev_text_range, radioButtonStr);

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
    atom.commands.add('atom-workspace', 'undolivecoding:graph', () => {
      this.createGraph (0)
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
    //var cursorStr = editor.getLastCursor().getCurrentBufferLine().trim();
    var cursorStr = editor.getTextInBufferRange(editor.getCurrentParagraphBufferRange())
    var cursorLine = editor.getLastCursor().getBufferRow();
    if(cursorStr.trim() === ""){
      console.log("Not a tidal line:\n" + cursorStr);
    }
    else{
      console.log("Parsing line:\n" + cursorStr);
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

      containers[patternNum]["container"] = this.createBox(cursorLine, patternNum, true);
      containers[patternNum]["hoverbox"] = this.createBox(cursorLine, patternNum, false);
    }

    //refresh container d3 graph
    this.refreshGraph (containers[patternNum]["container"], patternNum);

    //refresh backend to frontend
    // let patterns = this.history.getPatternHistories();
    // let currentPattern;
    // for (let i = 0; i < patterns.length; i++) { //should be 16 patterns
    //   currentPattern = patterns[i].getPatternHistory();
    //   if(currentPattern.length > 0){
    //     containers[i]["container"].innerHTML = ``;
    //
    //     //dynamically change height
    //     //containers[i]["container"].style.height = ((30*currentPattern.length) + "px");
    //   }
    //   for(let j = 0; j < currentPattern.length; j++){ //currentPattern is a PatternHistory holding Nodes
    //     if(currentPattern[j].getIsSelected()){
    //       containers[i]["container"].innerHTML += `
    //       <input type="radio" name=${i} value=${j} id=${j} checked>
    //       <label for=${j}>${currentPattern[j].getLine()}</label>
    //       <br>
    //       `;
    //     }
    //     else{
    //       containers[i]["container"].innerHTML += `
    //       <input type="radio" name=${i} value=${j} id=${j}>
    //       <label for=${j}>${currentPattern[j].getLine()}</label>
    //       <br>
    //       `;
    //     }
    //     console.log("Added radio button: " + currentPattern[j].getLine());
    //   }
    // }
  },

  createBox (lineNum, patternNum, isGraph) {
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
    if(isGraph){
      container.classList.add("version-container");
    }
    else{
      container.classList.add("hoverbox");
    }

    container.ondblclick = () => {
      marker.destroy();   // Just for now!
      containers[patternNum]["used"] = false;
    };

    editor.decorateMarker(marker, {type: 'block', item: container});
    containers[patternNum]["marker"] = marker;

    container.innerHTML = ``; //start with no radio buttons

    if(isGraph) {
      this.refreshGraph(container, patternNum);
    }

    return container;
  },

  //test function
  createGraph (lineNum) {
    console.log("Create box called");
    let editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    let {row} = editor.getCursorBufferPosition();

    let range = new Range([lineNum+1, 0], [lineNum+1, 0]);
    let marker = editor.markBufferRange(range, {invalidate: 'never'});

    // containers[patternNum]["lineNum"] = lineNum;

    let container = document.createElement("div");
    container.classList.add("version-container");

    container.ondblclick = () => {
      marker.destroy();   // Just for now!
      containers[patternNum]["used"] = false;
    };

    editor.decorateMarker(marker, {type: 'block', item: container});
    // containers[patternNum]["marker"] = marker;

    // This is another way to format our data. It's more like what our data looks like right now.
    // It can be used with d3.stratify(), but you also have to specify functions "id" and "parentID".
    let res =[
      "A B",
      // "B C",
      // "C D",
      // "B E",
      // "E F",
      // "F G",
      // "F H",
      // "G I",
      // "G J",
      // "G K",
      // "D L",
      // // "D L1",
      // // "D L2",
      // // "D L3",
      // // "D L4",
      // // "D L5",
      // "L M",
      // "M N",
      // "N O",
      // "O P",
      // "P Q",
      // "P R",
      // // "P Q",
      // "R S",
      // "S T",
    ];
    res = res.map((x, idx) => {
      let [parent, name] = x.split(" ");
      return {name: name, parentID: parent, idx: idx+1};
    });
    res.push({name: "A", idx: 0});
    let linkData = res;

    let chart2 =
      Tree(linkData,
      {
        id: d => d.name,
        parentId: d => d.parentID,
        label: d => d.name,
        r: 4,
        sort: (a,b) => a.idx - b.idx,
        // scaleXPos: true,
      });
    console.log(chart2);

    //remove all other children
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    container.appendChild(chart2);

    return container;
  },

  refreshGraph (container, patternNum) {
    let res = this.history.getPatternHistories()[patternNum].getGraphArray();
    console.log(res);
    res = res.map((x, idx) => {
      let [parent, name] = x.split(" ");
      let fill = this.history.getPatternHistories()[patternNum].getPatternHistory()[name].getIsSelected();
      console.log("Color of idx " + (idx+1) + " and name " + name + ": " + fill);
      return {name: name, parentID: parent, idx: idx+1, isSelected: fill};
    });
    let fill = this.history.getPatternHistories()[patternNum].getPatternHistory()[0].getIsSelected();
    console.log("Color of idx " + "0" + ": " + fill);
    res.push({name: "0", idx: 0, isSelected: fill});

    let chart =
      Tree(res,
      {
        id: d => d.name,
        parentId: d => d.parentID,
        //label: d => d.name,
        //fill: d => this.history.getPatternHistories()[patternNum].getPatternHistory()[d.name].getIsSelected() ? "red" : "gray",
        r: 6,
        sort: (a,b) => a.idx - b.idx,
        //scaleXPos: true,
      });
    chart.pattern_history = this.history.getPatternHistories()[patternNum];
    chart.pattern_container = containers[patternNum];
    console.log(chart);
    //remove all other children
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    container.appendChild(chart);

    // //clear the selected node color
    // let patternLen = this.history.getPatternHistories()[patternNum].getPatternHistory().length;
    // for(let i = 0; i < patternLen; i++){
    //   let idstr = IDPREPEND + i;
    //   console.log(document.getElementById(idstr));
    //   document.getElementById(idstr).style.fill = "gray";
    // }
    // //d3.select("circle").style("fill","gray");
    // //select the node in the graph
    // let latestNodeIndex = patternLen - 1;
    // let idstr = IDPREPEND + latestNodeIndex;
    // document.getElementById(idstr).style.fill = "red";
  }

};
