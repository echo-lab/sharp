'use babel';

// Heavily inspired from:
// https://github.com/tidalcycles/pulsar-tidalcycles/blob/207bb39e4c7e1789582cf35550002befee10b83b/lib/editors.js#L156
export function getCurrentBlockRange(editor) {
  let cursor = editor.getLastCursor();
  let startRow = (endRow = cursor.getBufferRow());
  var lineCount = editor.getLineCount();

  // Expand the boundaries until we find a line that's all whitespace.
  while (/\S/.test(editor.lineTextForBufferRow(startRow)) && startRow >= 0) {
    startRow--;
  }
  while (/\S/.test(editor.lineTextForBufferRow(endRow)) && endRow < lineCount) {
    endRow++;
  }

  return {
    start: { row: startRow + 1, column: 0 },
    end: { row: endRow, column: 0 },
  };
}
