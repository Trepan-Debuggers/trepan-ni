// Copyright 2018 Rocky Bernstein

'use strict';
/*========================================
  Debugger 'setBreakPoint' command.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('setBreakpoint', repl, {
    paused: false,
    help: `set a breakpoint

Usage: **setBreakpoint** [*script*, [*line*, [*condition*, [*silent*]]])
**setBreakpoint** *function*()

You can set a breakpoint by either line number of function name.

When setting by a line number, the script name can be omitted and then
it is taken to be the current file loaded.

When setting by a function name, you must enclose the function quotes.

In order to give a condition on which to stop at, you must use the
Javascript function notation and enclose the condition in quotes.

Examples:
--------
      break 10            # line 10 of this file
      break "gcd.js" 10   # file gcd line 10
      break "gcd()"       # the function gcd
      break('gcd.js', 10, "a > b")
                           # break on line 10 only if a > b

See also:
---------

breakpoints, clear, delete
`,
    aliases: ['sb', 'breakpoint', 'break', 'b'],
    run: intf.setBreakpoint,
  });
};
