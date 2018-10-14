// Copyright 2015, 2018 Rocky Bernstein

'use strict';

/*============================================================
  Debugger 'show highlight' command.
  ====================================================*/

exports.Init = function(name, subcmd) {
  return {
    help: `**show 'highlight'**

Show whether we use terminal highlighting.

Examples:
---------
    show('highlight')

See also:
---------
set 'highlight'`,

    run: function(intf) {
      intf.print('highlight: ' + Boolean(intf.opts.useColors));
    }
  };
};
