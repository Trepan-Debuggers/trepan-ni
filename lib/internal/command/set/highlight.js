// Copyright 2015, 2018 Rocky Bernstein

'use strict';
/*============================================================
  Debugger 'set highlight' command.
  ====================================================*/

exports.Init = function(name, subcmd) {
  return {
    help: `**set 'highlight'**', *boolean*

Set whether we use terminal highlighting.

Examples:
---------
    set 'highlight', false   // turn off terminal highlight

See also:
---------
show 'highlight'`,
    run: function(intf, value) {
      if (value !== null) {
        intf.opts.useColors = value;
        intf.commands['show'].run('highlight');
      } else {
        intf.error('highlight needs a boolean parameter');
      }
    }
  };
};
