'use strict';
/*========================================
  Debugger 'next' (step over) command.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('next', repl, {
    connection: true,
    help: `Step program, proceeding through subroutine calls.

Usage: next

Unlike "step", if the current source line calls a subroutine,
this command does not enter the subroutine, but instead steps over
the call, in effect treating it as a single source line.

This is sometimes called 'step over'.

See also:
---------
step, finish, cont, pause, run
`,
    aliases: ['n'],
    run: function() {
      intf.handleResumed();
      return intf.Debugger.stepOver();
    }
  });
};
