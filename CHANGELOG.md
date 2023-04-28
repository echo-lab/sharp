## 0.1.0 - First Functional Release
* No view yet besides radio buttons
* Bugs listed in README.md

## 0.1.1 - Custom Patterns available
* Fixed custom pattern bugs

## 0.1.2 - Dynamically changing box heights

## 0.1.3 - Box replaces 1 line above marker
* Box consistently replaces correct line of text, even if line number is changed

## 0.2.0 - Works for Tidal commands multiple lines Reloading
* Parses through comments to determine pattern number

## 0.2.1 - Bug Fixes
* Lines between pattern and corresponding box can exist w/o breaking the plugin
* Functions like setcps() are not processed

## 0.3.0 - D3 Implemented with line previews
* Radio buttons are no more, replaced by D3 graph nodes
* Hovering over a node offers a preview of the line inside that node
* Command for sending a line history is changed to 'ctrl-shift-enter'
  * This is to not conflict with Tidal keyboard commands

## 0.3.1 - Fixed box location bug
* Box always appears at bottom of code paragraph block

## 0.3.2 - Fixed tree node ID bug
* Node IDs are now unique (see tree.js for more info)

## 0.3.3 - Moved D3 graph of nodes to above code lines
* Fixed bug where different line lengths caused box to move rapidly

## 0.3.4 - Added State Matching Indicator on Line Numbers
* Highlights line number when states don't match
* Not tested thoroughly, contains bugs

## 0.3.5 - Edited State Matching Indicator on Line Numbers
* Compares current line to last run state, not last clicked node state

## 0.3.6 - Added Node Tagging Functionality
* Right-Clicking nodes allows them to be tagged various colors
* This helps performers remember important states

## 0.4.0 - Re-visualized SHARP Node System
* Temporary dashed node displays what new version of the tree you are currently typing
* Running node uses pulse effect
* Run All patterns option available

## 0.4.1 - Modified Node-Tagging System
* Tag node context menu still exists when right-clicking a node
* Command-clicking a node cycles through the available color options

## 0.8.0 - Published Package!! with History Dump save feature
* Crude saving feature that saves your SHARP version history into a new file in the same directory as the file you are working on

## 0.14.0 - Improved saving feature by logging tagged nodes
* Comments below versions that were tagged saying which color they were tagged

## 0.15.0 - Added warnings for saving before quitting or closing file
* Added quit SHARP package command for closing gracefully
