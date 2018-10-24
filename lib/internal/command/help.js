// Copyright 2018 Rocky Bernstein

'use strict';
const FS = require('fs');
const Path = require('path');
const Columnize = require('../columnize');

/*========================================
  Debugger 'help' command.
  ==========================================*/
exports.Init = function(intf, repl) {

  intf.defineCommand('help', repl, {
    paused: false,
    help: `Type help '*command-name*' to get help for
command *command-name*.

Type help '*' for the list of all commands.
Type help 'syntax' for a decription on debugger-command input syntax.

Note above the use of the quotes when specifying a parameter to help.`,
    aliases: ['?'],
    run: function(what, suboption = null) {
      if (!what) {
        intf.print(intf.commands['help'].help);
        return;
      } else if (what == '*') {
        // FIXME should be section
        intf.section('List of debugger commands');
        const cmdList = Object.keys(intf.commands).sort();
        const opts = {displayWidth: intf.opts.displayWidth, ljust: true};
        intf.print(Columnize.columnize(cmdList, opts), true);
        return;
      } else if (what == 'syntax') {
        const filename = Path.join(__dirname, 'help', 'syntax.md');
        const data = FS.readFileSync(filename, 'utf8');
        // FIXME: check for error
        intf.markupPrint(data);
        return;
      } else if (what in intf.aliases) {
        what = intf.aliases[what].name;
      }
      if (what in intf.commands) {
        var cmd = intf.commands[what];
        var helpObj = cmd.help;
        if (typeof helpObj === 'function') {
          helpObj(suboption);
        } else {
          intf.markupPrint(helpObj);
        }
        if (cmd.aliases && cmd.aliases.length > 0) {
          // FIXME: should be section
          intf.section('\nAliases:');
          intf.print(cmd.aliases.join(', '));
        }
      } else {
        if (typeof what === 'function') {
          // let token = this.cmdArgs[0];
          intf.error(`"${what}" evaluates to a function; perhaps you meant: \
help('${what}')?`);
          return;
        } else {
          intf.error(`"${what}" is not a debugger command or is not \
                   documented yet.`);
          return;
        }
      }
    }
  });
};
