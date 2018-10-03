// Copyright 2018 Rocky Bernstein

'use strict';
/*=================================
  Debugger 'delete' command
  ===================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('deleteBreakpoint', repl, {
    connection: false,
    help: `Remove a breakpoint by number.

Usage: delete *bp-num*

See also:
--------
break, clearBreakpoint
`,
    aliases: ['delete'],
    run: intf.deleteBreakpoint
  });
};
