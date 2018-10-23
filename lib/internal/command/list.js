// Copyright 2018 Rocky Bernstein

'use strict';
/*=================================
  Debugger 'list' command
  ===================================*/
exports.Init = function(intf, repl) {


  intf.defineCommand('list', repl, {
    paused: true,
    help: `List source-code lines centered around *from*.

Usage: list([from[, delta]])

With no arguments, lists 5 lines starting the current list location.
With a *from* argument, listing starts at that line.
With a *delta* argument, delta lines are listed before and after the
listing line.

The line listed is marked with a '>'. Any lines with breakpoints in them
are marked with '*'.
`,
    aliases: ['l'],
    run: function(startLine = 0, delta = 5) {
      return intf.selectedFrame.list(startLine, delta)
        .then(null, (error) => {
          intf.print("You can't list source code right now");
          throw error;
        });
    }
  });
};
