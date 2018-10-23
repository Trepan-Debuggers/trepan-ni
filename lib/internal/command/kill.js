// Copyright 2018 Rocky Bernstein

'use strict';
/*========================================
  Debugger 'kill' command.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('kill', repl, {
    paused: false,
    help: `Kill the debugger.

Usage: **kill**

See also:
---------
.exit
`,
    aliases: [],
    run: function() {
      intf.print('Terminating program..');
      return intf.inspector.killChild();
    }
  });
};
