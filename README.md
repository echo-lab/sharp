# tidal-sharp package

## Before You Use
* Make sure you already have the TidalCycles package installed. 3.16.48 is known to work. Currently SHARP does not work with other live-coding languages.

## Directions for Installation

Download the package on Pulsar. Alternatively...

1. Clone the repo
1. (Most likey): need to run `npm install` in the project folder.
1. In the project folder, run `apm link -d`. This adds a symlink to this package
  in the `~/.atom/dev/packages` directory.
  For Pulsar, this is `ppm link -d`. If Pulsar's `ppm` command isn't working, you can
  manulaly create a symlink. On a mac, this is: `ln -s <cloned_repo_path> ~/Users/<user>/.pulsar/dev/packages/sharp`.
  NOTE: You can also just clone the repo to this directory and skip the sym-link altogether, if you want.
1. In the command line, run `atom -d` to use the packages in the dev directory.
   You should see 'sharp' in the Packages menu now.
   Alternatively, in the Atom/Pulsar menu, click `view > developer > open in dev mode`

## Running SHARP
1. Run SHARP by either using the Packages menu and choosing `SHARP > Activate SHARP` or by using the keyboard shortcut: __ctrl+alt+x__
2. Run one block of code with the TidalCycles keyboard shortcut __ctrl+enter__ (or __cmd+enter__). Note that SHARP will not run alongside TidalCycles if you choose the TidalCycles Eval commands from the Packages drop-down. You *must* use the keyboard shortcuts if you want both to run together.
* Alternatively, run all blocks of code with the TidalCycles keyboard shortcut __ctrl+alt+shift+enter__ (or __cmd+alt+shift+enter__).
3. You can choose whether or not to allow duplicate code entries in the state-history tree SHARP creates for you by going to the Packages drop-down menu and choosing `SHARP > Allow/Disallow unique nodes in graphs` or by using the keyboard shortcut __ctrl+alt+u__.
4. After making changes, you can open the command palette with Ctrl/Cmd+Shift+P
   and use the "Window: Reload" command to reload the page and refresh the
   package (the keyboard shortcut for this is __ctrl + opt + cmd + l__).

## Interacting with SHARP
* Running a Tidal pattern will create a version history for that pattern. If it is the first time running that pattern, a graph with one history node will appear. Otherwise, a node will be added to the graph as a child of the currently selected node.
  * The node that is currently running in Tidal is indicated by a pulsing effect.
  * Click on a node to select it and replace the current pattern code with the history state that the node you just selected is holding. The selected node is indicated by a yellow circular outline.
* Tag a node you want to 'bookmark' by right-clicking (or ctrl+clicking) the node and then selecting `Tag node` on the resulting drop-down menu.
  * Alternatively, cmd+click or alt+click the node to cycle through the color options for tagging.

## Current Bugs
* Messing with line highlighting produces bugs
