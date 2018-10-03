// Copyright 2018 Rocky Bernstein

'use strict';
/*=================================
  Debugger 'breakpoints' command
  ===================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('breakpoints', repl, {
    connection: false,
    help: `List all known breakpoints

Usage: breakpoints

See also:
---------
break, clear, delete
`,
    aliases: [],
    run: intf.listBreakpoints,
  });
};
