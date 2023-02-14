'use babel';

const Insertion = Symbol("Insertion")
const Deletion = Symbol("Deletion")
const Replacement = Symbol("Replacement")
const No_Change = Symbol("No_Change")

const NUM_PATTERNS = 16;
var KEEP_TREES_UNIQUE = true;
var start_time = 0; //ms

export class Node {
  constructor(strLine, timeCreated, isTemp = false){
    this.time_created = timeCreated;  //ms
    this.line = strLine;
    this.children = [];
    this.isSelected = false;
    this.fillColor = '#999';
    this.isTemp = isTemp;
  }

  getIsSelected () {
    return this.isSelected;
  }

  select () {
    this.isSelected = true;
  }
  unselect () {
    this.isSelected = false;
  }

  getChildren () {
    return this.children;
  }

  getLine () {
    return this.line;
  }

  getIsTemp() {
    return this.isTemp;
  }

  getDeltaTimeCreated () {
    return Math.floor((this.time_created - start_time) / 1000); //seconds
  }

  getTimeCreated () {
    return this.time_created;
  }

  getFillColor () {
    return this.fillColor;
  }

  addChild (node) {
    this.children.push(node);
  }

  // A node matches another node if their text and time created are the same.
  matches (node) {
    return this.line === node.getLine() && this.time_created === node.getTimeCreated();
  }
}

export class Pattern_History {

  constructor (patternNum, patternName) {
    this.pattern_history = [];  //array of nodes
    this.patternNum = patternNum;
    this.patternName = patternName;
    this.statesMatch = true; //describes if currentText = nodeSelected
    this.tempNodeIndex = -1;  // only active if statesMatch == false
    this.runningNodeIndex -1;
  }

  setTempNodeIndex(idx) {
    this.tempNodeIndex = idx;
    console.log("Value of temp index CHANGED to: ", idx);
  }

  containsTempNode () {
    return this.tempNodeIndex !== -1;
  }

  histContains (line) {
    for(let i = 0; i < this.pattern_history.length; i++){
      if(this.pattern_history[i].getLine() === line && !this.pattern_history[i].getIsTemp())
        return true;
    }
    return false;
  }

  getGraphArray () {
    let graphArray = [];
    for(let i = 0; i < this.pattern_history.length; i++) {
      console.log(this.pattern_history[i]);
      let children = this.pattern_history[i].getChildren();
      for(let c = 0; c < children.length; c++) {
        graphArray.push(i + " " + this.indexOf(children[c].getLine()));
      }
    }
    return graphArray;
  }

  //WARNING: does not find all instances if KEEP_TREES_UNIQUE is false
  indexOf (line) {
    for(let i = 0; i < this.pattern_history.length; i++){
      if(this.pattern_history[i].getLine() === line)
        return i;
    }
    return -1;
  }

  getSelectedNode () {
    let found_index = -1;
    for(let i = 0; i < this.pattern_history.length; i++) {
      if(this.pattern_history[i].getIsSelected() && found_index === -1){
        found_index = i;
      }
      else if(this.pattern_history[i].getIsSelected()){
        //guard against multiple selected nodes
        console.log("Multiple Nodes selected!");
      }
    }
    if(found_index === -1){
      return null;
    }
    return this.pattern_history[found_index];
  }

  getSelectedNodeIndex () {
    let found_index = -1;
    for(let i = 0; i < this.pattern_history.length; i++) {
      if(this.pattern_history[i].getIsSelected() && found_index === -1){
        found_index = i;
      }
      else if(this.pattern_history[i].getIsSelected()){
        //guard against multiple selected nodes
        console.log("Multiple Nodes selected!");
        return -1;
      }
    }
    return found_index;
  }

  setSelectedNode (node) {
    for(let i = 0; i < this.pattern_history.length; i++) {
      if(this.pattern_history[i].getIsSelected()){
        this.pattern_history[i].unselect();
      }
      if(this.pattern_history[i].matches(node)){
        console.log("Found a node match!!!!!!!!!");
        this.pattern_history[i].select();
      }
    }
  }

  add (line) {
    console.log("adding line: " + line);

    // first we must remove the temporary marker
    console.log("Before: Temp Node Index: ", this.tempNodeIndex);
    if (this.tempNodeIndex !== -1) {
      this.removeTemp();
      console.log("Removing TEMP");
    }
    console.log("pattern once temp node is removed: ", this.pattern_history);
    console.log("Temp Node Index: ", this.tempNodeIndex);

    //get selected node
    let selected_node = this.getSelectedNode();
    //create a node and set as child of selected node
    let new_node = new Node(line, Date.now());
    if(selected_node != null){
      selected_node.addChild(new_node);
    }
    //add to array
    this.pattern_history.push(new_node);

    //set selected Node to the one just added
    this.setSelectedNode(new_node);
    new_node.select();
    //console.log(this.getSelectedNode());
  }

  addTemp (line) {
    console.log("adding line: " + line);
    //get selected node
    let selected_node = this.getSelectedNode();
    //create a node and set as child of selected node
    let new_node = new Node(line, Date.now(), true);
    if(selected_node != null){
      selected_node.addChild(new_node);
    }
    //add to array
    this.pattern_history.push(new_node);
    this.setTempNodeIndex(this.pattern_history.length - 1);

    //set selected Node to the one just added
    //this.setSelectedNode(new_node);
    //new_node.select();
    //console.log(this.getSelectedNode());
  }

  removeTemp () {
    let node = this.getSelectedNode();
    this.removeTempChild(node);
    this.pattern_history.splice(this.tempNodeIndex, 1);

    this.setTempNodeIndex(-1);
  }

  removeTempChild(selectedNode) {
    for(let i = 0; i < selectedNode.children.length; i++) {
      if(selectedNode.children[i].getIsTemp()) {
        selectedNode.children.splice(i, 1);
        return;
      }
    }
  }

  getPatternHistory () {
    return this.pattern_history;
  }

  getPatternName () {
    return this.patternName;
  }

  static findDiffType(str1, str2){
    let diff= "";
    for(let i = 0; i < str2.length; i++){
      //val = str2.charAt(i)
      if (str2.charAt(i) != str1.charAt(i)){
        let str1j = str1.length - 1;
        let str2j = str2.length - 1;
        while (str1j > i && str2j > i){
          if(str1.charAt(str1j) != str2.charAt(str2j)){
            return Replacement;
          }
          str1j--;
          str2j--;
        }
        if(str1j == i && str2j == i){
          return Replacement;
        }
        else if(str1j <= i){
          return Insertion;
        }
        else if(str2j == i && str1.charAt(i) != ""){
          return Deletion;
        }
        else if(str2j == i){
        	return Insertion;
        }
        else{
        	return "unknown"
        }
      }
    }
    if(str1.length > str2.length){
        return Deletion;
    }
		return No_Change;
  }

  setStatesMatch (match) {
    this.statesMatch = match;
  }

}

export default class Tidal_History
{

  constructor () {
    this.pattern_histories = [];
    this.custom_pattern_count = 0;
    start_time = Date.now();
    for (let i = 0; i < NUM_PATTERNS; i++) {
      this.pattern_histories[i] = new Pattern_History(i, "" + i);
    }
    //custom patterns start after numbered ones end
  }

  getNumPatterns () {
    return NUM_PATTERNS;
  }

  getTreesUnique () {
    return KEEP_TREES_UNIQUE;
  }

  setTreesUnique (bool) {
    KEEP_TREES_UNIQUE = bool;
  }

  getTime () {
    return Date.now() - start_time;
  }

  getPatternHistories () {
    return this.pattern_histories;
  }

  getNodeById (id, idprepend) {
    if(!id.startsWith(idprepend)) {return undefined;}

    let rest_str = id.substring(idprepend.length)
    console.log(rest_str);

    const indexesArr = rest_str.split('_');
    if(indexesArr.length !== 2) {return undefined;}

    return this.pattern_histories[indexesArr[0]].getPatternHistory()[indexesArr[1]];
  }

  reportChange (pattern_num) {
    let arr = this.pattern_histories[pattern_num].getPatternHistory();
    if(arr.length >= 2){
      console.log(Pattern_History.findDiffType(arr[arr.length - 2], arr[arr.length - 1]));
    }
  }

  indexOfCustomPattern (name) {
    for (let i = 0; i < this.pattern_histories.length; i++) {
      if(this.pattern_histories[i].getPatternName() === name){
        return i;
      }
    }
    return -1;
  }

  // Params:
  //  currLine: the line or block of text to add to the history
  //  temp:     true if the node is a temporary one for visuals only
  addToHistory (currLine, temp = false) {
    //identify pattern num
    console.log("addToHistory called");

    let pattern_num;

    //remove comment lines from analysis
    let edited_line = this.removeComments(currLine);

    //grab part of string before $ and trim it
    let words;
    let pattern_str = edited_line.substring(0, edited_line.indexOf("$")).trim();
    words = pattern_str.split(" ");

    pattern_str = this.findPatternString(currLine);

    if(pattern_str.length <= 2){
      pattern_num = parseInt(pattern_str, 10);
    }
    else if(words[0] === "p"){
      //custom pattern
      pattern_num = -1;
    }
    else{
      console.log("Error pasing string: " + pattern_str);
      return -1;
    }


    //check if that is already in that pattern's history
    //if not, add that string state to history
    console.log(currLine);

    if (temp) {
      if(pattern_num === -1){
        pattern_num = this.indexOfCustomPattern(pattern_str);
      }

      this.pattern_histories[pattern_num].addTemp(currLine);
      return pattern_num;
    }

    // Custom named patterns
    if(pattern_num === -1){
      //check if pattern exists
      if((pattern_num = this.indexOfCustomPattern(pattern_str)) != -1) {
        //pattern already exists
        console.log("Found index: " + pattern_num);
      }
      else{
        //new pattern: this is 17 with NUM_PATTERNS = 16 and on the first custom pattern
        this.custom_pattern_count++;
        pattern_num = this.custom_pattern_count + NUM_PATTERNS - 1;

        this.pattern_histories[pattern_num] = new Pattern_History(pattern_num, pattern_str);
        console.log("Added pattern " + pattern_str + " at index " + pattern_num);

        // Set the running node
        this.pattern_histories[pattern_num].runningNodeIndex = 0
      }
    }

    // remove old temp history node
    console.log("Before: Temp Node Index: ", this.pattern_histories[pattern_num].tempNodeIndex);

    // New history node
    if(!this.pattern_histories[pattern_num].histContains(currLine) || !KEEP_TREES_UNIQUE){
      this.pattern_histories[pattern_num].add(currLine);

      // Set the running node
      this.pattern_histories[pattern_num].runningNodeIndex = this.pattern_histories[pattern_num].getSelectedNodeIndex()
    }
    // Already existing history node
    else if (this.pattern_histories[pattern_num].histContains(currLine) && KEEP_TREES_UNIQUE){
        let patternIndex = this.pattern_histories[pattern_num].indexOf(currLine);
        this.pattern_histories[pattern_num].setSelectedNode(this.pattern_histories[pattern_num].getPatternHistory()[patternIndex]);

        // Set the running node
        this.pattern_histories[pattern_num].runningNodeIndex = this.pattern_histories[pattern_num].getSelectedNodeIndex()
    }

    console.log("Created at time: " + this.pattern_histories[pattern_num].getSelectedNode().getDeltaTimeCreated());

    this.reportChange(pattern_num);

    return pattern_num;
  };

  removeTempHistory (currLine) {
    //identify pattern num
    console.log("removeTempHistory called");

    let pattern_num;

    //remove comment lines from analysis
    let edited_line = this.removeComments(currLine);

    //grab part of string before $ and trim it
    let words;
    let pattern_str = edited_line.substring(0, edited_line.indexOf("$")).trim();
    words = pattern_str.split(" ");

    pattern_str = this.findPatternString(currLine);

    if(pattern_str.length <= 2){
      pattern_num = parseInt(pattern_str, 10);
    }
    else if(words[0] === "p"){
      //custom pattern
      pattern_num = -1;
    }
    else{
      console.log("Error pasing string: " + pattern_str);
      return -1;
    }

    if(pattern_num === -1){
      pattern_num = this.indexOfCustomPattern(pattern_str);
    }

    if (this.pattern_histories[pattern_num].containsTempNode()) {
      this.pattern_histories[pattern_num].removeTemp();
    }
    return pattern_num;
  };

  printHistory () {
    for (let i = 0; i < this.pattern_histories.length; i++) {
      if(this.pattern_histories[i].getPatternHistory().length > 0){
        console.log("d" + i + ":");
        console.log(this.pattern_histories[i].getPatternHistory());
      }
    }
  };

  //only for haskell comments notiation (--, {- -})
  removeComments (string){
    //Takes a string of code, not an actual function.
    return string.replace(/\{\-[\s\S]*?\-\}|\-\-.*/g,'').trim();//Strip comments
  };

  findPatternString (currLine) {

    //remove comment lines from analysis
    let edited_line = this.removeComments(currLine);

    //grab part of string before $ and trim it
    let words;
    let pattern_str = edited_line.substring(0, edited_line.indexOf("$")).trim();

    //if it starts with d, remove that char and read the numbers
    if(pattern_str.startsWith('d')) {
      pattern_str = pattern_str.substring(1);
    }
    else if(edited_line.indexOf("$") === -1){
      console.log("Not a pattern with a number: " + edited_line);
      return -1;
    }
    //otherwise find first number in string (Bugged)
    else {
      words = pattern_str.split(" ");
      pattern_str = words[words.length - 1]; // get last word
    }

    return pattern_str;
  };
}


// export default class Timeline_Entry {
//   constructor (editor_text, timeCreated) {
//     this.editor_text = editor_text
//     this.time_created = timeCreated
//   }
// }
//
// export default class Global_Timeline {
//   constructor () {
//     this.entries = []; // array of type Timeline_Entry
//     this.marker = undefined;
//     this.comtainer = undefined;
//     this.decoration = undefined;
//     this.start_time = Date.now();
//   }
//
//   getEntries () {
//     return this.entries;
//   }
//
//   getEntry(index) {
//     return this.entries[index];
//   }
//
//   getTime () {
//     return Date.now() - this.start_time;
//   }
//
//   addEntry(editor_text) {
//     let new_entry = new Timeline_Entry(editor_text, this.getTime());
//     this.entries.push(new_entry);
//   }
// }
