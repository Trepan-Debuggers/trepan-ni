// Copyright 2018 Rocky Bernstein

'use strict';
/*========================================
  Debugger 'setBreakPoint' command.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('setBreakpoint', repl, {
    connection: false,
    help: `set a breakpoint

Usage: setBreakpoint([*script*, [*line*, [*condition*, [*silent*]]]])

See also:
---------

breakpoints, clear, delete
`,
    aliases: ['sb', 'breakpoint', 'break'],
    run: intf.setBreakpoint,
  });
};
