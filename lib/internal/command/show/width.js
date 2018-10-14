// Copyright 2015, 2018 Rocky Bernstein
'use strict';

/*============================================================
  Debugger 'show width' command.
  ====================================================*/

exports.Init = function(name, subcmd) {
  return {
    help: `**show 'width'**

Show the number of characters the debugger thinks are in a line.
Examples:
---------
    show 'width'

See also:
---------
set 'width'`,

    run: function(intf) {
      intf.print(`width: ${intf.opts.displayWidth}`);
    }
  };
};
