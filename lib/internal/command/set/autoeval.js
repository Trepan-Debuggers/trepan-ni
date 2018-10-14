// Copyright 2015, 2018 Rocky Bernstein

'use strict';

/*============================================================
  Debugger 'set autoeval' command.
  ====================================================*/

exports.Init = function(name, subcmd) {
  return {
    help: `Set whether unknown debugger commands should be automatically
eval'd

Usage: autoeval[{true | false | js}]

When set to "js" evaluation expression must be valid javascript as
evaluation is done in the debugger's context. This provides a way
to debug the debugger.

See also
--------
help syntax`,
    run: function(intf, value) {
      if (value !== null) {
        intf.autoEval = value;
        intf.commands['show'].run('autoeval');
      } else {
        intf.error('highlight needs a parameter');
      }
    }
  };
};
