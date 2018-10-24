// Copyright 2015, 2018 Rocky Bernstein

'use strict';

/*==============================================================
  Debugger info 'program'  command
  =============================================================*/

exports.Init = function(name, subcmd) {
  return {
    help: `Print execution status of the debugged program.

**info 'program'**

See also:
---------
info 'frame', info 'return', info 'args', info 'locals'`,
    paused: false,
    run: function(intf) {
      if (intf.repl.state !== 'connected') {
        intf.print('Program not connected; Use `run` to start the app again.');
      } else if (intf.isPaused()) {
        intf.print(`Program is running and paused: ${intf.breakType}.`);
      } else {
        intf.print('Program is running and not paused.');
      }
    }
  };
};
