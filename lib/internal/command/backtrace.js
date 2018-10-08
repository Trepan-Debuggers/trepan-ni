// Copyright 2018 Rocky Bernstein

'use strict';
/*=================================
  Debugger 'backtrace' command
  ===================================*/
exports.Init = function(intf, repl) {


  intf.defineCommand('backtrace', repl, {
    connection: true,
    help: `Print backtrace of all stack frames.

Usage: backtrace

See also:
---------
up, down, frame
`,
    aliases: ['bt'],
    run: function() {
      return intf.currentBacktrace;
    }
  });
};
