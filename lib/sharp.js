'use babel';

import {CompositeDisposable, Disposable, Point, Range, TextEditor, DisplayMarker} from 'atom';

// file saving functionality
const fs = require('fs');

import Tidal_History from './history';
import Pattern_History from './history';
import {COLORS} from './history';
import Global_Timeline from './global_timeline';
import Timeline_Entry from './global_timeline';
import {Tree, IDPREPEND} from './tree';
import {getCurrentBlockRange} from './utils';
import {Logger} from "./logging";

var containers = [];      // the containers to hold the version trees
var numBoots = 0;         // number of times the activate command has been run
var justHovered = false;  // indicator of the last state of the mouse - hovering over a node or not.
var historySaved = true;  // indicator of whether or not the SHARP history has been saved
var logger;

export default {

  subscriptions: null,

  activate(state) {
    var editor;
    editor = atom.workspace.getActiveTextEditor();

    this.history = new Tidal_History();
    //this.global_timeline = new Global_Timeline();
    this.lastNodeRightClicked = undefined;

    atom.contextMenu.add({
      'atom-text-editor': [{
        label: 'Tag Node',
        submenu: [
          {label: COLORS['colorArr'][0], command: COLORS['commandArr'][0]},
          {label: COLORS['colorArr'][1], command: COLORS['commandArr'][1]},
          {label: COLORS['colorArr'][2], command: COLORS['commandArr'][2]},
          {label: COLORS['colorArr'][3], command: COLORS['commandArr'][3]},
          {label: COLORS['colorArr'][4], command: COLORS['commandArr'][4]}
        ],
        shouldDisplay: (event) => {
          this.lastNodeRightClicked = event.target;
          return event.target.tagName === 'circle' && event.target.id.startsWith(IDPREPEND);
        }
      }]
    })

    // init container array
    for(let i = 0; i < this.history.getNumPatterns(); i++){
      containers[i] = {
        'patternNum': -1,
        'patternName': '',
        'lineNum': -1,
        'used': false,
        'container': null,
        'marker': null,
        'lineMarker': null,
        'lineDecoration': null,
        'scrollLeft': 0,
        'scrollTop': 0,
      }
    }

    this.subscriptions = new CompositeDisposable(
      // Register command that toggles this view
      atom.commands.add('atom-workspace', {
        'sharp:toggle': () => this.toggle()
      }),

      // Destroy any DisplayMarkers (version graphs) when the package is deactivated.
      new Disposable(() => {
        atom.workspace.getPaneItems().forEach(item => {
          if (item instanceof DisplayMarker) {
            item.destroy();
          }
        });
      })
    );
  },

  deactivate() {
    this.subscriptions.dispose();
    for(let i = 0; i < this.history.getNumPatterns(); i++){
      containers[i] = null;
    }
    containers = null;
    this.history = null;
  },

  refreshWindow() {
    console.log('Reloading Window...')
  },

  toggle() {

    if (numBoots > 0) {
      atom.notifications.addInfo('SHARP already activated');
      return;
    }

    numBoots++
    console.log('Starting up SHARP!');
    atom.notifications.addSuccess('Starting up SHARP!');
 
    logger = new Logger();

    // Register command that toggles this view
    atom.commands.add('atom-workspace', 'sharp:enter', (e) => {
      this.addWorldState();
      e.abortKeyBinding();
    });
    atom.commands.add('atom-workspace', 'sharp:unique', () => {
      this.toggleTreesUnique();
    });
    atom.commands.add('atom-workspace', 'sharp:graph', () => {
      //this.createLineAnnotation();  // test function
    });
    atom.commands.add('atom-workspace', 'sharp:enterAll', (e) => {
      this.runAll();
      e.abortKeyBinding();
    });

    // saving mechanism
    atom.commands.add('atom-workspace', 'sharp:dumpHistory', () => {
      this.dumpHistory();
    });

    // quit/reloading mechanism
    atom.commands.add('atom-workspace', 'sharp:quit', () => {
      var goingToReload = this.quit();
      if (goingToReload){
        atom.reload();
      }
    });

    // color fill commands
    for(let i in COLORS['colorArr']) {
      atom.commands.add('atom-workspace', COLORS['commandArr'][i], () => {
        this.tagNode(COLORS['colorCodeArr'][i], parseInt(i));
      });
    }

    // define behavior for closing file
    atom.workspace.onWillDestroyPaneItem((event) => {
      var item = event.item;

      if (item && !historySaved && ((typeof item.isFile === 'function' && item.isFile()) ||
          (item instanceof TextEditor )) ) {

        var choice = atom.confirm({
          message: 'Your SHARP history for this Tidal file is unsaved.',
          detailedMessage: 'Do you want to save it?',
          buttons: {
            Save: () => {
              let didSave = this.dumpHistory();
              if(!didSave){
                event.prevent();
              }
            },
            Cancel: () => { event.prevent(); },
            "Don't Save": () => { console.log("Closing File..."); }
          },
        });
      }
      else {
        console.log("item.isFile() or instanceof TextEditor not working")
        console.log(item)
      }
    });



    // boot tidalcycles - tidalcycles:boot
    const target = atom.views.getView(atom.workspace);
    const commandName = 'tidalcycles:boot';
    atom.commands.dispatch(target, commandName);


    // subscribe to event when content changes to detect change in SOC
    // this will highlight any lines that have differeing states
    var editor = atom.workspace.getActiveTextEditor();
    
    // TODO: pull this out into its own thing
    editor.onDidChange(() => {
      // If we hovered over something, we don't want to get rid of the temp node.
      let shouldUpdateTempNode = !justHovered;
      justHovered = false;


      let paragraphRange = getCurrentBlockRange(editor);
      if (paragraphRange === undefined) { return; }
      let topRow = paragraphRange.start.row;

      // This is just the text of the current block
      let paragraphTypedIn = editor.getTextInBufferRange(paragraphRange);
      // This is the name of the pattern
      let patternStr = this.history.findPatternString(paragraphTypedIn);

      // Returns an index, presumably something we can use to fetch the actual pattern.
      let patternIndex = this.history.indexOfCustomPattern(patternStr)

      // Return early if this is not a pattern we're currently keeping track of!
      // Else, we'll get an error.
      if (patternIndex === -1) return;

      // check if the pattern's line has deviated from the last saved text
      let stateOfWorldNodeIndex = this.history.getPatternHistories()[patternIndex].runningNodeIndex;
      if(stateOfWorldNodeIndex === -1 || stateOfWorldNodeIndex === undefined) {return;}

      lastSavedText = this.history.getPatternHistories()[patternIndex]
        .getPatternHistory()[stateOfWorldNodeIndex].getLine();
      let currentText = paragraphTypedIn
      let selectedText = this.history.getPatternHistories()[patternIndex].getSelectedNode().getLine();

      // Remake the line-decoration if we need to. This is so we can either mark/unmark it depending on if it's stale.
      let decoration = containers[patternIndex]['lineDecoration'];
      if (!decoration || decoration.destroyed) {
        // The decoration gets destroyed easily?
        let marker = editor.markBufferRange(new Range([topRow, 0], [topRow, 0]), {invalidate: 'never'});
        let decoration = editor.decorateMarker(marker, {type: 'line-number', class: 'unedited-line'});
        containers[patternIndex]['lineMarker'] = marker;
        containers[patternIndex]['lineDecoration'] = decoration;
      }

      if (lastSavedText === currentText){ // Text matches

        if(currentText === selectedText && shouldUpdateTempNode) {
          // remove the dotted temporary node, if it exists
          // TODO: can this just be patternIndex?? Or am I confused?
          let patternNum = this.history.removeTempHistory(currentText)
          this.refreshGraph (containers[patternNum]['container'], patternNum);
        }

        this.history.getPatternHistories()[patternIndex].setStatesMatch(true);
        // containers[patternIndex]['lineDecoration'].setProperties({type: 'line-number', class: 'unedited-line'});
      }
      else {  // Text does not match

        if(this.history.getPatternHistories()[patternIndex].histContains(currentText)) {
          // we are 'hovering' over another node so don't change the temp node
          // TODO: possibly remove this, though I'm not sure :)
        }
        else if(currentText !== selectedText && shouldUpdateTempNode) {
          // Here we need to add a dotted line to a temporary node
          let patternNum = this.history.addToHistory(currentText, true)
          this.refreshGraph (containers[patternNum]['container'], patternNum);
        }

        this.history.getPatternHistories()[patternIndex].setStatesMatch(false);
        // containers[patternIndex]['lineDecoration'].setProperties({type: 'line-number', class: 'edited-line'});
      }
    })

    // Create Global Timeline not used currently in this version
    // this.createGlobalTimeline();
  },

  toggleTreesUnique () {
    if(this.history.getTreesUnique()){
      this.history.setTreesUnique(false);
      // console.log('Trees can have multiple nodes with the same line in them.');
      atom.notifications.addInfo('Trees can have multiple nodes with the same line in them.');
    } else {
      this.history.setTreesUnique(true);
      // console.log('Trees CANNOT have multiple nodes with the same line in them.');
      atom.notifications.addInfo('Trees CANNOT have multiple nodes with the same line in them.');
    }
  },

  // Run each tidal pattern in succession
  // Do this by moving the cursor down
  runAll () {
    var editor = atom.workspace.getActiveTextEditor();
    var allText = editor.getText();
    let lineCount = ((allText.match(/\n/g) || []).length) + 1;

    //move cursor
    let cursorPosition = editor.getCursorBufferPosition()
    let cursor = editor.getLastCursor();
    cursor.moveToTop();

    var lastParagraph = '';
    var paragraphRange;
    var cursorStr;

    for (var lineNum = 1; lineNum <= lineCount; lineNum++) {
      try {
        paragraphRange = getCurrentBlockRange(editor);
        cursorStr = editor.getTextInBufferRange(paragraphRange);

        if (cursorStr.trim() !== lastParagraph && cursorStr.trim() !== '') {
          // new paragraph
          lastParagraph = cursorStr.trim();
          this.addWorldState(false);
        }
      } catch (error) {

      }

      cursor.moveDown(1);
    }

    // put cursor back in original position
    // row == line number - 1
    cursor.moveToTop();
    cursor.moveDown(cursorPosition.row);

  },

  // AKA run a tidal line
  addWorldState (alerts = true) {
    var editor = atom.workspace.getActiveTextEditor();

    let blockRange = getCurrentBlockRange(editor);
    let blockText = editor.getTextInBufferRange(blockRange);
    let topRow = blockRange.start.row;

    var cursorLine = editor.getLastCursor().getBufferRow();

    let patternNum = this.history.addToHistory(blockText);
    // this.history.printHistory();

    // add to global timeline
    // if(patternNum !== -1 && this.global_timeline !== undefined && this.global_timeline !== null){
    //   this.global_timeline.addEntry(editor.getText())
    // }

    if(patternNum === -1 && alerts){
      atom.notifications.addInfo('Not adding to history: not a pattern');
      logger.logCodeRun({patternNum, nodeIdx: -1, code: blockText});
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

    if(containers[patternNum]['used'] === false){
      containers[patternNum]['used'] = true;
      containers[patternNum]['patternNum'] = patternNum;

      containers[patternNum]['container'] = this.createBox(cursorLine, patternNum, true);

      let marker = editor.markBufferRange(new Range([topRow, 0], [topRow, 0]), {invalidate: 'never'});

      // decorate the line number with a colored border class
      let decoration = editor.decorateMarker(marker, {type: 'line-number', class: 'unedited-line'});

      containers[patternNum]['lineMarker'] = marker;
      containers[patternNum]['lineDecoration'] = decoration;
    }
    if (containers[patternNum]['lineDecoration'] !== null){
      let decoration = containers[patternNum]['lineDecoration'];

      if (!decoration.destroyed) {
        // containers[patternNum]['lineDecoration'].setProperties({type: 'line-number', class: 'unedited-line'});
      } else {
        // Do it agaaaain lol
        // Not sure if this is necessary.
        let marker = editor.markBufferRange(new Range([topRow, 0], [topRow, 0]), {invalidate: 'never'});
        let decoration = editor.decorateMarker(marker, {type: 'line-number', class: 'unedited-line'});
        containers[patternNum]['lineMarker'] = marker;
        containers[patternNum]['lineDecoration'] = decoration;
      }
    }

    // set history saved status to unsaved
    historySaved = false;

    //set matching states
    this.history.getPatternHistories()[patternNum].setStatesMatch(true);

    //refresh container d3 graph
    let cp = containers[patternNum];
    this.refreshGraph (cp.container, patternNum);

    // If this is a new node, scroll to it.
    let hist = this.history.getPatternHistories()[patternNum];
    let runIdx = hist.runningNodeIndex;
    let maxIdx = hist.pattern_history.length-1;
    if (runIdx == maxIdx) {
      // New node! Scroll.
      cp.container.scroll(1e8, cp.scrollTop);
    }
    // this.refreshTimeline();

    // set running node style
    let idStr = IDPREPEND + "1" + "_" + "0";
    let runningNodeElement = document.getElementById(idStr);
    if (runningNodeElement !== null) {
      runningNodeElement.classList.add('running-node');
    }

    // Run tidal's command within the code - commented out for now for testing purposes
    const target = atom.views.getView(atom.workspace);
    const commandName = 'tidalcycles:eval-multi-line';

    atom.commands.dispatch(target, commandName);
    logger.logCodeRun({patternNum, nodeIdx: runIdx, code: blockText});
  },

  // creates a box
  createBox (lineNum, patternNum, isGraph) {
    let editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    let paragraphRange = getCurrentBlockRange(editor);
    let firstLine = paragraphRange.start.row;

    // Mark the box's line range
    let range = new Range([firstLine, 0], [firstLine, 0]);
    let marker = editor.markBufferRange(range, {invalidate: 'never'});
    // TODO: try changing to the following:
    // let marker = editor.markBufferPosition([firstLine, 0], {invalidate: 'never'});

    containers[patternNum]['lineNum'] = lineNum;


    let container = document.createElement('div');
    if(isGraph){
      container.classList.add('version-container');
    } else{
      container.classList.add('hoverbox');
    }

    container.ondblclick = () => {
      marker.destroy();   // Just for now!
      containers[patternNum]['used'] = false;
    };

    editor.decorateMarker(marker, {type: 'block', item: container});
    containers[patternNum]['marker'] = marker;

    container.innerHTML = ``; //start with no radio buttons

    if(isGraph) {
      this.refreshGraph(container, patternNum);
    }

    // Make sure the scroll doesn't go away if the box reloads :)
    let c = containers[patternNum];
    container.addEventListener("scroll", () => {
      c.scrollLeft = container.scrollLeft;
      c.scrollTop = container.scrollTop;
    });
    container.addEventListener("DOMNodeInserted", () => {
      container.scroll(c.scrollLeft, c.scrollTop);
    });

    return container;
  },

  // create global timeline, which is just a box at the topRow
  // createGlobalTimeline() {
  //   let editor = atom.workspace.getActiveTextEditor();
  //   if (!editor) return;

  //   if(this.global_timeline === undefined || this.global_timeline === null) {return;}

  //   // Mark the box's line range
  //   let range = new Range([0, 0], [0, 0]);
  //   let globalTimelineMarker = editor.markBufferRange(range, {invalidate: 'never'});

  //   let container = document.createElement('div');
  //   container.classList.add('version-container');

  //   this.global_timeline.container = container;
  //   this.global_timeline.marker = globalTimelineMarker;

  //   this.global_timeline.decoration = editor.decorateMarker(globalTimelineMarker, {type: 'block', item: container});
  // },

  //test function - NOT FOR USE
  // createLineAnnotation () {
  //   // console.log('Create box called');
  //   let editor = atom.workspace.getActiveTextEditor();
  //   if (!editor) return;

  //   let {row} = editor.getCursorBufferPosition();

  //   let range = new Range([row, 0], [row, 0]);
  //   let marker = editor.markBufferRange(range, {invalidate: 'never'});

  //   // decorate the line number with a colored border class
  //   editor.decorateMarker(marker, {type: 'line-number', class: 'edited-line'});
  // },

  // not sure how this function works atm
  refreshGraph (container, patternNum) {
    let res = this.history.getPatternHistories()[patternNum].getGraphArray();
    // TODO: we no longer use the 'idx' variable we got from getGraphArray(), so we
    // should change that function to either not return the idx or to return the index we
    // calculate below.
    res = res.map((x, idx) => {
      let [parent, name] = x.split(' ');
      let fill = this.history.getPatternHistories()[patternNum].getPatternHistory()[name].getIsSelected();
      let isRunning = this.history.getPatternHistories()[patternNum].getPatternHistory()[name].getIsRunning();
      let background_color = this.history.getPatternHistories()[patternNum].getPatternHistory()[name].getFillColor();
      let tempNodeIndex = this.history.getPatternHistories()[patternNum].tempNodeIndex;
      idx = parseInt(name) - 1;  // This puts the nodes in order of discovery.
      return {name: name, parentID: parent, idx: idx+1, isSelected: fill, isRunning: isRunning, patternNum: patternNum, bgColor: background_color, tempNodeIndex: tempNodeIndex};
    });
    let fill = this.history.getPatternHistories()[patternNum].getPatternHistory()[0].getIsSelected();
    let isRunning = this.history.getPatternHistories()[patternNum].getPatternHistory()[0].getIsRunning();
    let background_color = this.history.getPatternHistories()[patternNum].getPatternHistory()[0].getFillColor();
    let tempNodeIndex = this.history.getPatternHistories()[patternNum].tempNodeIndex;
    res.push({name: '0', idx: 0, isSelected: fill, isRunning: isRunning, patternNum: patternNum, bgColor: background_color, tempNodeIndex: tempNodeIndex});

    let chart =
      Tree(res,
      {
        id: d => d.name,
        parentId: d => d.parentID,
        //label: d => d.name,
        //fill: d => d.bgColor,
        r: 8,
        sort: (a,b) => a.idx - b.idx,
        scaleXPos: true,
        toggleColor: (target) => this.toggleColor(target),
        onHoverFn: () => {justHovered = true;},
        logger,
      });
    chart.pattern_history = this.history.getPatternHistories()[patternNum];
    chart.pattern_container = containers[patternNum];
    //remove all other children
    // NOTE: setting the scroll like this isn't sufficient to solve the hover problem :(
    let scroll = [container.scrollLeft, container.scrollTop];
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    container.appendChild(chart);
    container.scroll(...scroll);
  },

  // refreshTimeline () {
  //   if(this.global_timeline === undefined || this.global_timeline === null) {return;}

  //   let res = this.global_timeline.getGraphArray();
  //   console.log(res);

  //   res = res.map((x, idx) => {
  //     let [parent, name] = x.split(' ');
  //     let time_created = this.global_timeline.getEntry(idx).time_created;
  //     return {name: name, parentID: parent, idx: idx+1, time_created: time_created};
  //   });
  //   let time_created = this.global_timeline.getEntry(0).time_created;
  //   res.push({name: '0', idx: 0, time_created: time_created});

  //   let chart =
  //     Tree(res,
  //     {
  //       id: d => d.name,
  //       parentId: d => d.parentID,
  //       label: d => d.time_created,
  //       //fill: d => this.history.getPatternHistories()[patternNum].getPatternHistory()[d.name].getIsSelected() ? 'red' : 'gray',
  //       r: 6,
  //       sort: (a,b) => a.idx - b.idx,
  //       scaleXPos: true,
  //     });
  //   chart.pattern_history = this.global_timeline.getEntries();
  //   chart.pattern_container = this.global_timeline.container;

  //   while (this.global_timeline.container.firstChild) {
  //       this.global_timeline.container.removeChild(this.global_timeline.container.firstChild);
  //   }
  //   this.global_timeline.container.appendChild(chart);
  // },

  toggleColor(target) {
    if (!target) return;

    let node = this.history.getNodeById(target.id, IDPREPEND);
    // cycle color options
    if (node.fillColor === COLORS['colorCodeArr'][COLORS['colorCodeArr'].length - 1]) {
      node.fillColor = '#999';
      node.fillIndex = -1;
    }
    else if (node.fillIndex === -1) {
      node.fillColor = COLORS['colorCodeArr'][0];
      node.fillIndex = 0;
    }
    else if (node.fillIndex > -1 && node.fillIndex < COLORS['colorCodeArr'].length) {
      node.fillIndex = node.fillIndex + 1;
      node.fillColor = COLORS['colorCodeArr'][node.fillIndex];
    }
    else {
      console.error("invalid index: ", node.fillIndex);
    }
    //node.fillColor = node.fillColor === "#85e" ? "#999" : "#85e";

    // Get pattern number
    let rest_str = target.id.substring(IDPREPEND.length)

    const indexesArr = rest_str.split('_');
    let patternNum = indexesArr[0];

    // set history saved status to unsaved
    historySaved = false;

    this.refreshGraph(containers[patternNum]['container'], patternNum);
  },

  tagNode(colorStr, index){
    if(this.lastNodeRightClicked === undefined) {return;}

    let node = this.history.getNodeById(this.lastNodeRightClicked.id, IDPREPEND);
    node.fillColor = colorStr;
    node.fillIndex = index;

    // Get pattern number
    let rest_str = this.lastNodeRightClicked.id.substring(IDPREPEND.length)

    const indexesArr = rest_str.split('_');
    let patternNum = indexesArr[0];

    // set history saved status to unsaved
    historySaved = false;

    this.refreshGraph (containers[patternNum]['container'], patternNum);
  },

  // returns true if file is saved, false otherwise
  dumpHistory() {
    // create text that will be written to file
    let strToWrite = this.history.formattedHistory();

    // get date and time for file name
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const dateTimeString = `${year}-${month}-${day}--${hours}-${minutes}-${seconds}`;

    // get working file path
    var editor = atom.workspace.getActiveTextEditor();
    var newFileName;
    if (editor) {
      const filePath = editor.buffer.file.path;

      // MARK: very crude, make cleaner
      newFileName = filePath.substring(0, filePath.length - 6) + "-history--" + dateTimeString + ".tidal";
    } else {
      newFileName = "~/tidal_history_" + dateTimeString + ".tidal";
    }

    var choice = atom.confirm({
      message: 'Dump History to File: ' + newFileName,
      buttons: {
        Save: (value) => {
          // write to file
          var written = fs.writeFile(newFileName, strToWrite, (err) => {
            if (err) throw err;

            // set history saved status to unsaved
            historySaved = true;
          });

          return true;
        },
        Cancel: () => {
          // Handle the cancel button click
          return false;
        }
      }
    });
    return choice;
  },

  // Returns true if function is going to quit, false if otherwise
  quit () {
    if (!historySaved) {
      // ask if want to save before quitting
      var choice = atom.confirm({
        message: 'Your SHARP history for this Tidal file is unsaved.',
        detailedMessage: 'Do you want to save it?',
        buttons: {
          Save: () => {
            let didSave = this.dumpHistory();
            return didSave;
          },
          Cancel: () => { return false; },
          "Don't Save": () => { console.log("Closing File..."); return true;}
        },
      });
      return choice;
    }
    else {
      // quit immediately
      return true;
    }
  },

};
