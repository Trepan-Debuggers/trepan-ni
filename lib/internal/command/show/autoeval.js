// Copyright 2015, 2018 Rocky Bernstein

'use strict';

/*============================================================
  Debugger 'show highlight' command.
  ====================================================*/

exports.Init = function(name, subcmd) {
  return {
    help: `Show whether unknown debugger commands should be automatically
eval'd

Usage: **show 'autoeval'**

Examples:
---------
    show 'autoeval'

See also:
---------
set 'autoeval'`,

    run: function(intf) {
      intf.print(`autoeval: ${intf.autoEval}`);
    }
  };
};
