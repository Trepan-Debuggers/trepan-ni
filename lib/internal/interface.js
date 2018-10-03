'use strict';
// Copyright 2018 Rocky Bernstein

// const cmds = require('./cmds');
// const columnize = require('./columnize');

class Interface {
  constructor() {
    this.aliases = {};
    this.commands = {};
    this.print = console.log;
    this.knownBreakpoints = [];
    this.bpNum = 1;

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

  error(mess) {
    this.print(`**${mess}**`);
  }


}

exports.intf = function() {
  return new Interface();
};
