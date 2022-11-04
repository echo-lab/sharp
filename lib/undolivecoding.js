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
        'patternName': '',
        'lineNum': -1,
        'used': false,
        'container': null,
        'marker': null
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
    console.log('Starting up SHARP!');
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

    // subscribe to event when content changes to detect change in SOC
    var editor = atom.workspace.getActiveTextEditor();
    editor.onDidChange(() => {
      console.log('typed an input')
    })
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

  addWorldState () {
    console.log('addWorldState() called');
    var editor = atom.workspace.getActiveTextEditor();
    //var cursorStr = editor.getLastCursor().getCurrentBufferLine().trim();
    var cursorStr = editor.getTextInBufferRange(editor.getCurrentParagraphBufferRange())
    var cursorLine = editor.getLastCursor().getBufferRow();
    if(cursorStr.trim() === ''){
      console.log('Not a tidal line:\n' + cursorStr);
    }
    else{
      console.log('Parsing line:\n' + cursorStr);
    }

    let patternNum = this.history.addToHistory(cursorStr);
    this.history.printHistory();

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
    }

    //refresh container d3 graph
    this.refreshGraph (containers[patternNum]['container'], patternNum);

  },

  // creates a box
  createBox (lineNum, patternNum, isGraph) {
    console.log('Create box called');
    let editor = atom.workspace.getActiveTextEditor();
    if (!editor) return;

    let paragraphRange = editor.getCurrentParagraphBufferRange();
    let firstLine = paragraphRange.start.row;

    // I don't totally understand why these values work for the range...
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
    let res = this.history.getPatternHistories()[patternNum].getGraphArray();
    console.log(res);
    res = res.map((x, idx) => {
      let [parent, name] = x.split(' ');
      let fill = this.history.getPatternHistories()[patternNum].getPatternHistory()[name].getIsSelected();
      console.log('Color of idx ' + (idx+1) + ' and name ' + name + ': ' + fill);
      return {name: name, parentID: parent, idx: idx+1, isSelected: fill, patternNum: patternNum};
    });
    let fill = this.history.getPatternHistories()[patternNum].getPatternHistory()[0].getIsSelected();
    console.log('Color of idx ' + '0' + ': ' + fill);
    res.push({name: '0', idx: 0, isSelected: fill, patternNum: patternNum});

    let chart =
      Tree(res,
      {
        id: d => d.name,
        parentId: d => d.parentID,
        //label: d => d.name,
        //fill: d => this.history.getPatternHistories()[patternNum].getPatternHistory()[d.name].getIsSelected() ? 'red' : 'gray',
        r: 8,
        sort: (a,b) => a.idx - b.idx,
        scaleXPos: true,
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
  }

};
