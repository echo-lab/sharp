# undolivecoding package

## Directions for Development

1. Clone the repo
1. In the project folder, run `apm link -d`. This adds a symlink to this package
  in the `~/.atom/dev/packages` directory.
1. In the command line, run `atom -d` to use the packages in the dev directory.
   You should see 'undolivecoding' in the Packages menu now.
1. After making changes, you can open the command palette with Ctrl/Cmd+Shift+P
   and use the "Window: Reload" command to reload the page and refresh the
   package.

To Future Drew: did you put 'use babel'; on line 1?

![A screenshot of your package](https://f.cloud.github.com/assets/69169/2290250/c35d867a-a017-11e3-86be-cd7c5bf3ff9b.gif)

## TODOs
* Change line of text
* Represent graph in terms of index

## Future work
* Make a way for you to add multiple patterns to history at once
* line diffs
* look into key binding resolving

## Current Bugs
* Messing with line highlighting produces bugs
