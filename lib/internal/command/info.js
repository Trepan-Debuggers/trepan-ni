'use strict';
const Columnize = require('../columnize');
const Cmds = require('../cmds');

const subcmds = Cmds.defineSubcommands('info');
// FIXME why does 'info' get added?
delete subcmds['info'];

/*============================================================
  Debugger 'show' command.
  ==============================================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('info', repl, {
    paused: false,
    help: `Shows various debugger settings.

Usage: **info** *param*

**info**

Show the value of  *param*.

In the first form *param* must a string.

In the second form all of the showable parameters are listed.

Examples:
---------
    info                // lists "info" parameters
    info "breakpoints" // show breakpoints

See also:
---------
show`,
    run: function(what, value, arg1) {
      const subcmd = subcmds[what];
      if (subcmd) {
        if (!subcmd.paused || intf.isPaused()) {
          return subcmd.run(intf, value, arg1);
        } else {
          intf.print(`"info ${what}" requires program to be paused.`);
        }
      } else if (!what) {
        const cmdList = Object.keys(subcmds).sort();
        const opts = {displayWidth: intf.opts.displayWidth,
          ljust: true};
        intf.section('List of "info" subcommands');
        intf.print(Columnize.columnize(cmdList, opts));
      } else {
        intf.error(`Undefined "info" subcommand ${what}`);
      }
    }
  });
};
