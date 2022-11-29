'use babel';

var start_time = 0; //ms

export default class Timeline_Entry {
  constructor (editor_text, timeCreatedMs) {
    this.editor_text = editor_text;
    this.time_created_ms = timeCreatedMs;
    this.time_created = this.construct_time_created(this.time_created_ms);
  }

  // doesn't work for minutes or hours yet
  construct_time_created(time_created_ms) {
    let seconds = time_created_ms / 1000.0;
    let seconds_rounded = Math.round(seconds);

    if(seconds_rounded < 10){
      return "00:00:0" + seconds_rounded;
    }
    else {
      return "00:00:" + seconds_rounded;
    }
  }
}

export default class Global_Timeline {
  constructor () {
    this.entries = []; // array of type Timeline_Entry
    this.marker = undefined;
    this.comtainer = undefined;
    this.decoration = undefined;
    start_time = Date.now();
  }

  getEntries () {
    return this.entries;
  }

  getEntry(index) {
    return this.entries[index];
  }

  getTime () {
    return Date.now() - start_time;
  }

  getGraphArray () {
    let graphArray = [];
    for(let i = 0; i < this.entries.length - 1; i++) {
      graphArray.push(i + " " + (i+1));
    }
    return graphArray;
  }

  addEntry(editor_text) {
    let new_entry = new Timeline_Entry(editor_text, this.getTime());
    this.entries.push(new_entry);
  }
}
