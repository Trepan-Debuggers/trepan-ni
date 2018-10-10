// Copyright 2018 Rocky Bernstein

'use strict';
/*========================================
  Debugger 'version' command.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('version', repl, {
    connection: true,
    help: `Show V8 version.

Usage: version

`,
    aliases: [],
    run: function() {
      return intf.Runtime.evaluate({
        expression: 'process.versions.v8',
        contextId: 1,
        returnByValue: true,
      }).then(({ result }) => {
        intf.print(result.value);
      });
    }
  });
};
