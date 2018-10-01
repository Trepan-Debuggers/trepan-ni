'use strict';
/*========================================
  Debugger 'pause' command.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('pause', repl, {
    help: `Pause program.

See also:
---------
cont, next, step, break
`,
    connection: true,
    run: function() {
      return intf.Debugger.pause();
    }
  });
};
