'use strict';
// Copyright 2015, 2018 Rocky Bernstein

const fs = require('fs');
const path = require('path');

// Note commands are alphabetic order.
exports.defineCommands =
  function defineCommands(intf, repl) {
    var cmddir = path.join(path.dirname(fs.realpathSync(__filename)),
      'command');
    var files = fs.readdirSync(cmddir);
    files.forEach(function(file) {
      if (file.substring(file.length - 3) === '.js') {
        // intf.print(file); // XXX
        var mod = require('./command/' + file);
        mod.Init(intf, repl);
      }
    });
  };

exports.defineSubcommands =
  function(name, intf) {
    var subcmdDir = path.join(path.dirname(fs.realpathSync(__filename)),
      'command', name);
    const cmds = {};
    var files = fs.readdirSync(subcmdDir);
    // console.log(files);
    files.forEach(function(file) {
      // console.log(file);
      if (file.substring(file.length - 3) === '.js') {
        const subname = file.substring(0, file.length - 3);
        const submod = require(`./command/${name}/${file}`);
        cmds[name] = submod.run;
        cmds[subname] = submod.Init(name, intf);
      }
    });
    return cmds;
  };
