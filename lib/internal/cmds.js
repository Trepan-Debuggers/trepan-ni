'use strict';
// Copyright 2015 Rocky Bernstein
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// trepanjs debugger commands.

const fs = require('fs');
const path = require('path');
const util = require('util');

// Note commands are alphabetic order.
function defineCommands(intf) {

  var cmddir = path.join(path.dirname(fs.realpathSync(__filename)),
 'command');
  var files = fs.readdirSync(cmddir);
  files.forEach(function(file) {
    if (file.substring(file.length - 3) === '.js') {
      // intf.print(file); // XXX
      var mod = require('./command/' + file);
      mod.Init(intf);
    }
  });
}

exports.defineCommands = defineCommands;

function defineSubcommands(name, intf) {
  var subcmdDir = path.join(path.dirname(fs.realpathSync(__filename)),
                            'command', name);
  var cmds = {};
  var files = fs.readdirSync(subcmdDir);
  // console.log(files);
  files.forEach(function(file) {
    // console.log(file);
    if (file.substring(file.length - 3) === '.js') {
      var subname = file.substring(0, file.length - 3);
      var submod = require(util.format('./command/%s/%s', name, file));
      // cmds[name] = submod.run;
      cmds[subname] = submod.Init(name, intf);
    }
  });
  return cmds;
}

exports.defineSubcommands = defineSubcommands;
