# sharp package

## Directions for Use

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
1. After making changes, you can open the command palette with Ctrl/Cmd+Shift+P
   and use the "Window: Reload" command to reload the page and refresh the
   package (the keyboard shortcut for this is ctrl + opt + cmd + 'l').

![A screenshot of your package](https://f.cloud.github.com/assets/69169/2290250/c35d867a-a017-11e3-86be-cd7c5bf3ff9b.gif)

## Current Bugs
* Messing with line highlighting produces bugs
* On some systems the key commands don't work in tandem with Tidal
