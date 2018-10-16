'use strict';
const Columnize = require('../columnize');
const Cmds = require('../cmds');

const subcmds = Cmds.defineSubcommands('show');

// FIXME why does 'show' get added?
delete subcmds['show'];

/*============================================================
  Debugger 'show' command.
  ==============================================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('show', repl, {
    connection: false,
    help: `Shows various debugger settings.

Usage: **show** *param*

**show**

Show the value of  *param*.

In the first form *param* must a string.

In the second form all of the showable parameters are listed.

Examples:
---------
    show            // lists show parameters
    show "autoeval" // show autoeval setting
    show "width"    // show terminal width

See also:
---------
set`,
    run: function(what, value, arg1) {
      const subcmd = subcmds[what];
      if (subcmd) {
        return subcmd.run(intf, value, arg1);
      } else if (!what) {
        const cmdList = Object.keys(subcmds).sort();
        const opts = {displayWidth: intf.opts.displayWidth,
          ljust: true};
        intf.section('List of "show" subcommands');
        intf.print(Columnize.columnize(cmdList, opts));
      } else {
        intf.error(`Undefined "show" subcommand ${what}`);
      }
    }
  });
};
