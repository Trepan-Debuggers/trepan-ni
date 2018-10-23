// Copyright 2018 Rocky Bernstein

'use strict';
/*========================================
  Debugger 'pause' command.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('pause', repl, {
    help: `Pause a running program.

Usage: **pause**

See also:
---------
cont, next, step, break
`,
    connection: false,
    run: function() {
      if (intf.selectedFrame) {
        intf.print('Program is already paused.');
      } else {
        return intf.Debugger.pause();
      }
    }
  });
};
