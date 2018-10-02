// Copyright 2018 Rocky Bernstein

'use strict';
/*========================================
  Debugger 'kill' command.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('kill', repl, {
    connection: true,
    help: `Kill the debugger.

Usage: kill

See also:
---------
.exit
`,
    aliases: [],
    run: function() {
      return intf.inspector.killChild();
    }
  });
};
