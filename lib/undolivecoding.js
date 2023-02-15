'use babel';

import {CompositeDisposable, Disposable, Point, Range} from 'atom';

import Tidal_History from './history';
import Pattern_History from './history';
import Global_Timeline from './global_timeline';
import Timeline_Entry from './global_timeline';
import {Tree} from './tree';

var containers = [];
var numBoots = 0;
var justHovered = false;

export const IDPREPEND = 'sharp';

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
          {label: 'Red', command:'undolivecoding:tagRed'},
          {label: 'Green', command:'undolivecoding:tagGreen'},
          {label: 'Blue', command:'undolivecoding:tagBlue'},
          {label: 'Purple', command:'undolivecoding:tagPurple'},
          {label: 'Orange', command:'undolivecoding:tagOrange'}
        ],
        shouldDisplay: (event) => {
          console.log(event.target)
          console.log(event.target.nodeName)
          console.log(event.target.tagName)
          this.lastNodeRightClicked = event.target
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
        'lineDecoration': null
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
    console.log('Reloading Window...')
  },

  keyTyped () {
    console.log('typed an input');
  },

  toggle() {

    if (numBoots === 0) {
      numBoots++

      console.log('Starting up SHARP!');
      console.log(numBoots);
      atom.notifications.addSuccess('Starting up SHARP!');
      // Register command that toggles this view
      atom.commands.add('atom-workspace', 'undolivecoding:enter', () => {
        this.addWorldState()
      });
      atom.commands.add('atom-workspace', 'undolivecoding:unique', () => {
        this.toggleTreesUnique()
      });
      atom.commands.add('atom-workspace', 'undolivecoding:graph', () => {
        this.createLineAnnotation()
      });

      // color fill commands
      atom.commands.add('atom-workspace', 'undolivecoding:tagRed', () => {
        this.tagNode('#900')
      });
      atom.commands.add('atom-workspace', 'undolivecoding:tagGreen', () => {
        this.tagNode('#090')
      });
      atom.commands.add('atom-workspace', 'undolivecoding:tagBlue', () => {
        this.tagNode('#06f')
      });
      atom.commands.add('atom-workspace', 'undolivecoding:tagPurple', () => {
        this.tagNode('#85e')
      });
      atom.commands.add('atom-workspace', 'undolivecoding:tagOrange', () => {
        this.tagNode('#d80')
      });


      // boot tidalcycles - tidalcycles:boot
      const target = atom.views.getView(atom.workspace);
      const commandName = 'tidalcycles:boot';
      atom.commands.dispatch(target, commandName);


      // subscribe to event when content changes to detect change in SOC
      // this will highlight any lines that have differeing states
      var editor = atom.workspace.getActiveTextEditor();
      editor.onDidChange(() => {
        // If we hovered over something, we don't want to get rid of the temp node.
        let shouldUpdateTempNode = !justHovered;
        justHovered = false;

        let lineChanged = editor.getCursorBufferPosition().row + 1;
        console.log('typed an input on line' + lineChanged)

        let paragraphRange = editor.getCurrentParagraphBufferRange();
        if (paragraphRange === undefined) { return; }
        let topRow = paragraphRange.start.row;

        // This is just the text of the current block
        let paragraphTypedIn = editor.getTextInBufferRange(paragraphRange);
        // This is the name of the pattern
        let patternStr = this.history.findPatternString(paragraphTypedIn);

        // Returns an index, presumably something we can use to fetch the actual pattern.
        let patternIndex = this.history.indexOfCustomPattern(patternStr)
        //console.log(patternIndex);
        //console.log(patternStr);

        // Return early if this is not a pattern we're currently keeping track of!
        // Else, we'll get an error.
        if (patternIndex === -1) return;

        // check if the pattern's line has deviated from the last saved text
        let stateOfWorldNodeIndex = this.history.getPatternHistories()[patternIndex].runningNodeIndex;
        // console.log('State of world: ' + stateOfWorldNodeIndex);
        if(stateOfWorldNodeIndex === -1 || stateOfWorldNodeIndex === undefined) {return;}

        lastSavedText = this.history.getPatternHistories()[patternIndex]
          .getPatternHistory()[stateOfWorldNodeIndex].getLine();
        // console.log(lastSavedText);
        let currentText = paragraphTypedIn
        let selectedText = this.history.getPatternHistories()[patternIndex].getSelectedNode().getLine();
        // console.log(currentText);

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
            let patternNum = this.history.removeTempHistory(currentText)
            this.refreshGraph (containers[patternNum]['container'], patternNum);
          }

          console.log('States match');
          this.history.getPatternHistories()[patternIndex].setStatesMatch(true);
          containers[patternIndex]['lineDecoration'].setProperties({type: 'line-number', class: 'unedited-line'});
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

          console.log('States differ');
          this.history.getPatternHistories()[patternIndex].setStatesMatch(false);
          containers[patternIndex]['lineDecoration'].setProperties({type: 'line-number', class: 'edited-line'});
          console.log(containers[patternIndex]);
        }
      })

      // Create Global Timeline
      // not used currently in this version
      this.createGlobalTimeline();
    }
    else {
      console.log('Already booted');
    }
  },

  toggleTreesUnique () {
    if(this.history.getTreesUnique()){
      this.history.setTreesUnique(false);
      console.log('Trees can have multiple nodes with the same line in them.');
      atom.notifications.addInfo('Trees can have multiple nodes with the same line in them.');
    } else {
      this.history.setTreesUnique(true);
      console.log('Trees CANNOT have multiple nodes with the same line in them.');
      atom.notifications.addInfo('Trees CANNOT have multiple nodes with the same line in them.');
    }
  },

  // AKA run a tidal line
  addWorldState () {
    console.log('addWorldState() called');
    var editor = atom.workspace.getActiveTextEditor();

    let paragraphRange = editor.getCurrentParagraphBufferRange();
    let topRow = paragraphRange.start.row;

    var cursorStr = editor.getTextInBufferRange(paragraphRange)
    var cursorLine = editor.getLastCursor().getBufferRow();
    if(cursorStr.trim() === ''){
      console.log('Not a tidal line:\n' + cursorStr);
    }
    else{
      console.log('Parsing line:\n' + cursorStr);
    }

    let patternNum = this.history.addToHistory(cursorStr);
    this.history.printHistory();

    // add to global timeline
    if(patternNum !== -1 && this.global_timeline !== undefined && this.global_timeline !== null){
      this.global_timeline.addEntry(editor.getText())
    }

    if(patternNum === -1){
      atom.notifications.addInfo('Not adding to history: not a pattern');
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
        containers[patternNum]['lineDecoration'].setProperties({type: 'line-number', class: 'unedited-line'});
      } else {
        // Do it agaaaain lol
        // Not sure if this is necessary.
        let marker = editor.markBufferRange(new Range([topRow, 0], [topRow, 0]), {invalidate: 'never'});
        let decoration = editor.decorateMarker(marker, {type: 'line-number', class: 'unedited-line'});
        containers[patternNum]['lineMarker'] = marker;
        containers[patternNum]['lineDecoration'] = decoration;
      }
    }

    //set matching states
    this.history.getPatternHistories()[patternNum].setStatesMatch(true);

    //refresh container d3 graph
    this.refreshGraph (containers[patternNum]['container'], patternNum);
    this.refreshTimeline();

    // Run tidal's command within the code - commented out for now for testing purposes
    const target = atom.views.getView(atom.workspace);
    const commandName = 'tidalcycles:eval-multi-line';

    console.log("Dispatching command: eval-multi-line");
    atom.commands.dispatch(target, commandName);

  },

  // creates a box
  createBox (lineNum, patternNum, isGraph) {
    console.log('Create box called');
    let editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    let paragraphRange = editor.getCurrentParagraphBufferRange();
    let firstLine = paragraphRange.start.row;

    // Mark the box's line range
    let range = new Range([firstLine, 0], [firstLine, 0]);
    let marker = editor.markBufferRange(range, {invalidate: 'never'});

    containers[patternNum]['lineNum'] = lineNum;

    console.log(marker.getBufferRange());
    console.log(marker.getScreenRange());

    let container = document.createElement('div');
    if(isGraph){
      container.classList.add('version-container');
    }
    else{
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

    return container;
  },

  // create global timeline, which is just a box at the topRow
  createGlobalTimeline() {
    let editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    if(this.global_timeline === undefined || this.global_timeline === null) {return;}

    // Mark the box's line range
    let range = new Range([0, 0], [0, 0]);
    let globalTimelineMarker = editor.markBufferRange(range, {invalidate: 'never'});

    let container = document.createElement('div');
    container.classList.add('version-container');

    this.global_timeline.container = container;
    this.global_timeline.marker = globalTimelineMarker;

    this.global_timeline.decoration = editor.decorateMarker(globalTimelineMarker, {type: 'block', item: container});
  },

  //test function - NOT FOR USE
  createLineAnnotation () {
    console.log('Create box called');
    let editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    let {row} = editor.getCursorBufferPosition();

    let range = new Range([row, 0], [row, 0]);
    let marker = editor.markBufferRange(range, {invalidate: 'never'});

    // decorate the line number with a colored border class
    editor.decorateMarker(marker, {type: 'line-number', class: 'edited-line'});
  },

  // not sure how this function works atm
  refreshGraph (container, patternNum) {
    console.log("CALLING REFRESH GRAPH!!!!!!!!!!");
    let res = this.history.getPatternHistories()[patternNum].getGraphArray();
    console.log("res: ", res);
    // TODO: we no longer use the 'idx' variable we got from getGraphArray(), so we
    // should change that function to either not return the idx or to return the index we
    // calculate below.
    res = res.map((x, idx) => {
      let [parent, name] = x.split(' ');
      let fill = this.history.getPatternHistories()[patternNum].getPatternHistory()[name].getIsSelected();
      let background_color = this.history.getPatternHistories()[patternNum].getPatternHistory()[name].getFillColor();
      let tempNodeIndex = this.history.getPatternHistories()[patternNum].tempNodeIndex;
      idx = parseInt(name) - 1;  // This puts the nodes in order of discovery.
      console.log('Color of idx ' + (idx+1) + ' and name ' + name + ': ' + background_color);
      return {name: name, parentID: parent, idx: idx+1, isSelected: fill, patternNum: patternNum, bgColor: background_color, tempNodeIndex: tempNodeIndex};
    });
    let fill = this.history.getPatternHistories()[patternNum].getPatternHistory()[0].getIsSelected();
    let background_color = this.history.getPatternHistories()[patternNum].getPatternHistory()[0].getFillColor();
    let tempNodeIndex = this.history.getPatternHistories()[patternNum].tempNodeIndex;
    console.log('Color of idx ' + '0' + ': ' + background_color);
    res.push({name: '0', idx: 0, isSelected: fill, patternNum: patternNum, bgColor: background_color, tempNodeIndex: tempNodeIndex});

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
    //   document.getElementById(idstr).style.fill = 'gray';
    // }
    // //d3.select('circle').style('fill','gray');
    // //select the node in the graph
    // let latestNodeIndex = patternLen - 1;
    // let idstr = IDPREPEND + latestNodeIndex;
    // document.getElementById(idstr).style.fill = 'red';
  },

  refreshTimeline () {
    if(this.global_timeline === undefined || this.global_timeline === null) {return;}

    let res = this.global_timeline.getGraphArray();
    console.log(res);

    res = res.map((x, idx) => {
      let [parent, name] = x.split(' ');
      let time_created = this.global_timeline.getEntry(idx).time_created;
      return {name: name, parentID: parent, idx: idx+1, time_created: time_created};
    });
    let time_created = this.global_timeline.getEntry(0).time_created;
    res.push({name: '0', idx: 0, time_created: time_created});

    let chart =
      Tree(res,
      {
        id: d => d.name,
        parentId: d => d.parentID,
        label: d => d.time_created,
        //fill: d => this.history.getPatternHistories()[patternNum].getPatternHistory()[d.name].getIsSelected() ? 'red' : 'gray',
        r: 6,
        sort: (a,b) => a.idx - b.idx,
        scaleXPos: true,
      });
    chart.pattern_history = this.global_timeline.getEntries();
    chart.pattern_container = this.global_timeline.container;

    while (this.global_timeline.container.firstChild) {
        this.global_timeline.container.removeChild(this.global_timeline.container.firstChild);
    }
    this.global_timeline.container.appendChild(chart);
  },

  toggleColor(target) {
    if (!target) return;

    let node = this.history.getNodeById(target.id, IDPREPEND);
    node.fillColor = node.fillColor === "#85e" ? "#999" : "#85e";

    // Get pattern number
    let rest_str = target.id.substring(IDPREPEND.length)
    console.log(rest_str);

    const indexesArr = rest_str.split('_');
    let patternNum = indexesArr[0];

    this.refreshGraph(containers[patternNum]['container'], patternNum);
  },

  tagNode(colorStr){
    if(this.lastNodeRightClicked === undefined) {return;}
    console.log("tagging node...")

    let node = this.history.getNodeById(this.lastNodeRightClicked.id, IDPREPEND);
    node.fillColor = colorStr;

    // Get pattern number
    let rest_str = this.lastNodeRightClicked.id.substring(IDPREPEND.length)
    console.log(rest_str);

    const indexesArr = rest_str.split('_');
    let patternNum = indexesArr[0];

    this.refreshGraph (containers[patternNum]['container'], patternNum);
  }

};
