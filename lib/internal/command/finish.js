// Copyright 2018 Rocky Bernstein

'use strict';
/*========================================
  Debugger 'finish' (step out) command.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('next', repl, {
    paused: true,
    help: `Execute until selected stack frame returns.
Usage: finish

Upon return, the value returned is printed and put in the value history.

Sometimes called 'step over'

See also:
--------
step, next, cont, run
`,
    aliases: ['fin'],
    run: function() {
      intf.handleResumed();
      return intf.Debugger.stepOut();
    }
  });
};
