'use strict';
const Columnize = require('../columnize');
const Cmds = require('../cmds');

const subcmds = Cmds.defineSubcommands('set');

// FIXME why does 'set' get added?
delete subcmds['set'];

/*============================================================
  Debugger 'set' command.
  ==============================================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('set', repl, {
    paused: false,
    help: `Sets various debugger state.

Usage: **set** *param*, *value*

**set**

Set *param* to *value*.

In the first form *param* must a string, and *value* must be of the appropriate
type for the parameter, e.g. a number, boolean, or array.

In the second form, we give a list of parameters that can be supplied.

Examples:
---------
    set                  // lists set parameters
    set "autoeval" false // set autoeval off
    set "width" 100      // set terminal width 100

See also:
---------
show`,
    run: function(what, value, arg1) {
      const subcmd = subcmds[what];
      if (subcmd) {
        subcmd.run(intf, value, arg1);
      } else if (!what) {
        const cmdList = Object.keys(subcmds).sort();
        const opts = {displayWidth: intf.opts.displayWidth,
          ljust: true};
        intf.section('List of "set" subcommands');
        intf.print(Columnize.columnize(cmdList, opts));
      } else {
        intf.error(`Undefined "set" subcommand ${what}`);
      }
    }
  });
};
