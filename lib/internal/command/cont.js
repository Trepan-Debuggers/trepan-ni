// Copyright 2018 Rocky Bernstein

'use strict';
/*========================================
  Debugger 'cont' command.

  Continues execution of the program.
  Note that the name has to be 'cont', not 'continue'
  since 'continue' is a Javascript reserved word.
  However we add an alias 'continue', which works around
  this.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('cont', repl, {
    help: `Continue program being debugged, after signal or breakpoint.

Usage: **cont**

See also:
---------
next, step, break
`,
    aliases: ['c', 'continue'],
    paused: false,
    run: function() {
      intf.handleResumed();
      return intf.Debugger.resume();
    }
  });
};
