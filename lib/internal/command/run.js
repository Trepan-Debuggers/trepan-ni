// Copyright 2018 Rocky Bernstein

'use strict';
/*========================================
  Debugger 'run' command.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('run', repl, {
    connection: false,
    help: `Run, restart or reconnect the application.

Usage: run

Existing breakpoints are saved and restored.

See also:
--------
cont, kill, quit
`,
    aliases: ['r', 'restart'],
    run: function() {
      return intf.inspector.run();
    }
  });
};
