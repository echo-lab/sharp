'use babel';

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

    this.editor = atom.workspace.getActiveTextEditor();

    this.editor.onDidChangeCursorPosition (() => {
      this.changeText(message);
    }),

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

  changeText(message) {
    var editor = atom.workspace.getActiveTextEditor();
    var cursorStr = editor.getLastCursor().getCurrentBufferLine().trim();
    if(cursorStr.startsWith("--") || cursorStr === ""){
      console.log("Not a tidal line:\n" + cursorStr);
    }
    else{
      message.innerHTML = `
      <h2>Undo Livecoding Demo</h2>
      <p>${cursorStr}</p>
      `;
    }
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
