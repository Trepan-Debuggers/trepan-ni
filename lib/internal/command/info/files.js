// Copyright 2015, 2018 Rocky Bernstein

'use strict';

/*==============================================================
  Debugger info 'files' command

  Gives list of files loaded.  An asterisk indicates if the file is the
  current one we are stopped at.

  arguments[0] tells if it should display internal node scripts or not.
  This is available only for internal debugger's functions.
  =============================================================*/

exports.Init = function(name, subcmd) {

  return {
    help: `List files loaded with their line counts.

Usage: **info 'files' [{true | false|}*

If the last parameter is "true", the internal scripts are included
in the list.

An asterisk indicates if the file is the current one we are stopped at.`,
    connection: true,
    run: function(intf, showInternal) {
      intf.listScripts(showInternal);
    }
  };
};
