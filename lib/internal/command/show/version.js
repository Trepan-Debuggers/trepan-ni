// Copyright 2015, 2018 Rocky Bernstein

'use strict';

/*============================================================
  Debugger 'show version' command.
  ====================================================*/

const trepanNiVersion = require('../../../../package').version;

exports.Init = function(name, subcmd) {
  return {
    help: `**show 'version'**

Show the V8 release number.
Examples:
---------
    show 'version'`,
    run: function(intf) {
      return intf.runtime.evaluate({
        expression: 'process.versions.v8',
        contextId: 1,
        returnByValue: true,
      }).then(({ result }) => {
        intf.print(`trepan-ni version: ${trepanNiVersion}`);
        intf.print(`Nodejs version: ${result.value}`);
      });
    }
  };
};
