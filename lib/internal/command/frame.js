// Copyright 2018 Rocky Bernstein

'use strict';
/*=================================
  Debugger 'frame' command
  ===================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('frame', repl, {
    connection: true,
    help: `Select and print a stack frame.

Usage: frame [*frame-number*]

With no argument, print the selected stack frame.
An argument specifies the frame to select.

See also:
---------
down, up
`,
    aliases: [],
    run: function(count = 0) {
      return intf.frame(intf, count);
    }
  });
};
