// Copyright 2018 Rocky Bernstein

'use strict';
/*=================================
  Debugger 'up' command
  ===================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('up', repl, {
    paused: true,
    help: `Select and print stack frame that called this one.

Usage: up [*count*]

An argument says how many frames up to go.

See also:
---------
down, frame
`,
    aliases: [],
    run: function(count = 1) {
      return intf.frame(intf.selectedFrameIndex + count);
    }
  });
};
