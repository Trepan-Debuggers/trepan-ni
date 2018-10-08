'use strict';
// Copyright 2018 Rocky Bernstein

// const cmds = require('./cmds');
// const columnize = require('./columnize');

const Terminal = require('./terminal');

class Interface {
  constructor(opts) {
    this.aliases = {};
    this.commands = {};
    this.print = console.log;
    this.knownBreakpoints = [];
    this.bpNum = 1;
    this.opts = opts;
    this.selectedFrame = null;
    this.selectedFrameIndex = 0;
    this.currentBacktrace = 0;
    this.knownScripts = {};

    if (parseInt(process.env['NODE_DISABLE_COLORS'], 10) ||
        !this.opts.termHighlight) {
      this.opts.useColors = false;
      this.opts.termHighlight = false;
    }
  }

  frame(self, tryFrameIndex = 0) {
    if (tryFrameIndex < 0) {
      self.error('Frame would go above newest frame');
      return;
    }
    if (tryFrameIndex >= self.currentBacktrace.length) {
      self.error('Frame would go beyond oldest frame');
      return;
    }
    self.selectedFrameIndex = tryFrameIndex;
    self.selectedFrame = self.currentBacktrace[self.selectedFrameIndex];
    const loc = self.selectedFrame.location;
    const lineNum = loc.lineNumber + 1;
    const script = self.knownScripts[loc.scriptId];
    self.print(`frame change in ${script.url}:${lineNum}`);
    return self.selectedFrame.list();
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
      this.print(Terminal.markup(text, this.displayWidth).trim());
    } else {
      this.print(text.trim());
    }
  }

  // Section headings
  section(text) {
    if (this.opts.useColors) {
      this.print(Terminal.bolden(text));
    } else {
      this.print(text);
      this.print(Array(text.length + 1).join('-'));
    }
  }

  // Error formatting
  error(text) {
    if (this.opts.useColors) {
      text = Terminal.bolden(text);
    } else {
      text = '** ' + text;
    }
    this.print(text);
  }


}

exports.intf = function(opts) {
  return new Interface(opts);
};
