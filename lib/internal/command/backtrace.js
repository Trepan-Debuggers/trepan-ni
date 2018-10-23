// Copyright 2018 Rocky Bernstein

'use strict';
/*=================================
  Debugger 'backtrace' command
  ===================================*/
exports.Init = function(intf, repl) {


  intf.defineCommand('backtrace', repl, {
    paused: true,
    help: `Print backtrace of all stack frames.

Usage: backtrace

See also:
---------
up, down, frame
`,
    aliases: ['bt', 'where'],
    run: function() {
      return intf.currentBacktrace;
    }
  });
};
