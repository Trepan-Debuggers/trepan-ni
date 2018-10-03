'use strict';
// Copyright 2018 Rocky Bernstein

// const cmds = require('./cmds');
// const columnize = require('./columnize');

const terminal = require('./terminal');

class Interface {
  constructor(opts) {
    this.aliases = {};
    this.commands = {};
    this.print = console.log;
    this.knownBreakpoints = [];
    this.bpNum = 1;
    this.opts = opts;

    if (parseInt(process.env['NODE_DISABLE_COLORS'], 10) ||
        !this.opts.termHighlight) {
      this.opts.useColors = false;
      this.opts.termHighlight = false;
    }
  }

  // Add a debugger command or alias to the
  // list of commands the REPL understands.
  // NEWER interface.
  defineCommand(cmdName, repl, cmd) {
    if (typeof cmd.run !== 'function') {
      throw new Error('bad argument, "run "field must be a function');
    }
    // const util = require('util');
    // console.log(`${util.inspect(cmd)}`);
    const fn = cmd.run;
    cmd.name = cmdName;
    repl.context[cmdName] = fn;
    this.commands[cmdName] = cmd;
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        this.aliases[alias] = cmd;
      }
    }
  }

  // Print markdown text to output stream
  markupPrint(text) {
    if (this.opts.useColors) {
      this.print(terminal.markup(text, this.displayWidth).trim());
    } else {
      this.print(text.trim());
    }
  };

  // Section headings
  section(text) {
    if (this.opts.useColors) {
      this.print(terminal.bolden(text));
    } else {
      this.print(text);
      this.print(Array(text.length+1).join("-"));
    }
  };

  // Error formatting
  error(text) {
    if (this.opts.useColors) {
      text = terminal.bolden(text)
    } else {
      text = '** ' + text
    }
    this.print(text);
  };


}

exports.intf = function(opts) {
  return new Interface(opts);
};
