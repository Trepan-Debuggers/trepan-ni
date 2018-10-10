// Copyright 2018 Rocky Bernstein

'use strict';
/*========================================
  Debugger 'autoeval' command.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('autoeval', repl, {
    connection: false,
    help: `Set whether unknown debugger commands should be automatically
eval'd

Usage: autoeval[{true | false | js}]

When set to "js" evaluation expression must be valid javascript as
evaluation is done in the debugger's context. This provides a way
to debug the debugger.

See also
--------
help syntax
`,
    aliases: [],
    run: function(doAutoEval = true) {
      intf.autoEval = doAutoEval;
      intf.print(`Autoeval is set ${intf.autoEval}.`);
      return;
    }
  });
};
