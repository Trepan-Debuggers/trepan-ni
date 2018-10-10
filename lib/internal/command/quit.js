// Copyright 2018 Rocky Bernstein

'use strict';
/*========================================
  Debugger 'quit' command.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('quit', repl, {
    connection: false,
    help: `Quit debugger

Usage: quit

See also:
--------
kill
`,
    aliases: ['exit'],
    // run: intf.quit
    run: function() {
      repl.rli.emit('exit');
    }
  });
};
