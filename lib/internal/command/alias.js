// Copyright 2018 Rocky Bernstein

'use strict';
/*=================================
  Debugger 'alias' command
  ===================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('alias', repl, {
    help: `**alias** '*alias*'  '*command*'

Add alias *alias* for a debugger command *command*.

Examples:
--------

    alias('ls', 'list')  // 'ls' now is the same as 'list'
    alias('s',  'step))  // 's' is now an alias for 'step".
                         // The above example is done by default.`,
    run: function(alias, cmdName) {
      if (cmdName in intf.commands) {
        var cmd = intf.commands[cmdName];
        intf.aliases[alias] = cmd;
        cmd.aliases.push(alias);
      } else {
        intf.error(`Debugger command '${cmdName}' not found; \
alias ${alias} not set`);
      }
    }
  });
};
