// Copyright 2015, 2018 Rocky Bernstein

'use strict';
/*============================================================
  Debugger 'set width' command.
  ====================================================*/

exports.Init = function(name, subcmd) {
  return {
    help: `**set 'width'**' *integer*

Set the number of characters the debugger thinks are in a line.

Examples:
---------
    set 'width' 100
See also:
---------
show 'width'`,
    run: function(intf, value) {
      if (value !== null) {
        intf.opts.displayWidth = value;
        intf.commands['show'].run('width');
      } else {
        intf.error('highlight needs an integer parameter');
      }
    }
  };
};
