"use babel";

const fs = require("fs");

const HOME_DIR = require("os").homedir();
const SHARP_DIR = `${HOME_DIR}/.sharp`;
const LOGS_DIR = `${SHARP_DIR}/logs`;
const SESSIONS_DIR = `${LOGS_DIR}/sessions`;

export class Logger {
  constructor() {
    let ts = timestamp();
    this.file = `${SESSIONS_DIR}/${ts}`;
    this.combinedFile = `${LOGS_DIR}/combined`;
    fs.mkdir(SESSIONS_DIR, { recursive: true }, (err) => {
      if (err) console.warn(err);
      this.startSession(ts);
    });
  }

  startSession(session) {
    let line = JSON.stringify({ session }) + "\n";
    fs.appendFile(this.combinedFile, line, (err) => {
      if (err) console.log("error logging: ", err);
    });
  }

  logCodeRun({ patternNum, nodeIdx, code = "" }) {
    let action = "RUN";
    let ts = timestamp();
    let data = JSON.stringify({ action, patternNum, nodeIdx, code, ts });
    data += "\n";
    fs.appendFile(this.file, data, (err) => {
      if (err) console.log("error logging: ", err);
    });
    fs.appendFile(this.combinedFile, data, (err) => {
      if (err) console.log("error logging: ", err);
    });
  }

  log(params) {
    let data = JSON.stringify({ ...params, ts: timestamp() }) + "\n";
    fs.appendFile(this.file, data, (err) => {
      if (err) console.log("error logging: ", err);
    });
    fs.appendFile(this.combinedFile, data, (err) => {
      if (err) console.log("error logging: ", err);
    });
  }
}

function timestamp() {
  return +Date.now();
}
