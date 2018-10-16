// Copyright 2015, 2018 Rocky Bernstein

'use strict';

const util = require('util');

/*============================================================
  Debugger 'show args' command.
  ====================================================*/

exports.Init = function(name, subcmd) {
  return {
    help: `**show 'args'**

Show argument list to give program being debugged when it is started or
restarted.
See also:
---------
set 'args'`,

    run: function(intf) {
      intf.print(`args: ${util.inspect(intf.inspector.options.scriptArgs)}`);
    }
  };
};
