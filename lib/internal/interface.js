'use strict';
// Copyright 2018 Rocky Bernstein

// const cmds = require('./cmds');
const Columnize = require('./columnize');

const Terminal = require('./terminal');

class Interface {
  constructor(opts) {
    this.aliases = {};
    this.autoEval = true;
    this.commands = {};
    this.print = console.log;
    this.knownBreakpoints = [];
    this.bpNum = 1;
    this.opts = opts;
    this.selectedFrame = null;
    this.selectedFrameIndex = 0;
    this.currentBacktrace = 0;
    this.knownScripts = {};
    this.opts.displayWidth = Columnize.computedDisplayWidth();

    if (parseInt(process.env['NODE_DISABLE_COLORS'], 10) ||
        !this.opts.termHighlight) {
      this.opts.useColors = false;
      this.opts.termHighlight = false;
    }
  }

  isValidFrameIndex(frameNum) {
    if (frameNum < 0) {
      this.error(`Frame number ${frameNum} needs to be greater than 0`);
      return false;
    } else if (frameNum >= this.currentBacktrace.length) {
      this.error(`Frame number ${frameNum} too large;` +
                 `largest frame number is ${this.currentBacktrace.length}`);
      return false;
    }
    return true;
  }


  frame(tryFrameIndex = 0) {
    if (this.isValidFrameIndex(tryFrameIndex)) {
      this.selectedFrameIndex = tryFrameIndex;
      this.selectedFrame = this.currentBacktrace[this.selectedFrameIndex];
      const loc = this.selectedFrame.location;
      const lineNum = loc.lineNumber + 1;
      const script = this.knownScripts[loc.scriptId];
      this.print(`frame change in ${script.url}:${lineNum}`);
      return this.selectedFrame.list();
    }
  }

  frameLocation(frame) {
    let loc = frame.functionLocation;
    if (frame.functionName !== '') {
      this.print(`Function name: ${frame.functionName}`);
      this.print('Function definition: ' +
                 `${this.knownScripts[loc.scriptId].url}, ` +
                 `line ${loc.lineNumber + 1}, column ${loc.columnNumber}`);
    }
    loc = frame.location;
    this.print(`Frame location: ${this.knownScripts[loc.scriptId].url}, ` +
               `line ${loc.lineNumber + 1}, column ${loc.columnNumber}`);
    this.print(`Frame type: ${frame.this.type} ${frame.this.className}`);
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
      return this.print(Terminal.markup(text, this.opts.displayWidth).trim());
    } else {
      return this.print(text.trim());
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
