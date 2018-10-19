// Copyright 2015, 2018 Rocky Bernstein

'use strict';
const util = require('util');

/*==============================================================
  Debugger 'info line' command

  Gives list of files loaded.  An asterisk indicates if the file is the
  current one we are stopped at.

  arguments[0] tells if it should display internal node scripts or not.
  This is available only for internal debugger's functions.
  =============================================================*/

exports.Init = function(name, subcmd) {
  return {
    help: `Show information about the current line.

Usage: **info 'line'**
`,
    connection: true,
    run: function(intf) {
      const location = intf.selectedFrame.location;
      intf.print(util.format(
        'Line %d column %s of file "%s"',
        location.lineNumber + 1, location.columnNumber,
        intf.knownScripts[location.scriptId].url || 'unknown',
        // intf.event
      ));
    }
  };
};
