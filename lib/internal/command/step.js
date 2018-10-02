// Copyright 2018 Rocky Bernstein

'use strict';
/*========================================
  Debugger 'step' (step in) command
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('step', repl, {
    connection: true,
    help: `Step program until it reaches a different source line.

Usage: step

Functions that are called in the line are entered.

This command is sommetimes called "step into".

See also:
---------
next, finish, cont, run
`,
    aliases: ['s'],
    run: function() {
      intf.handleResumed();
      return intf.Debugger.stepInto();
    },
  });
};
