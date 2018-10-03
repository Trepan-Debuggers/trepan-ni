// Copyright 2018 Rocky Bernstein

'use strict';
/*=================================
  Debugger 'clearBreakpoint' command
  ===================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('clearBreakpoint', repl, {
    connection: false,
    help: `Remove a breakpoint by location.

Usage: clear *url* *line*

See also:
--------
delete, break
`,
    aliases: ['cb', 'clear'],
    run: intf.clearBreakpoint
  });
};
