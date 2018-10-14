// Copyright 2015, 2018 Rocky Bernstein

'use strict';

/*============================================================
  Debugger 'show version' command.
  ====================================================*/

exports.Init = function(name, subcmd) {
  return {
    help: "**show('version')**\n\
\n\
Show the V8 release number.\n\
Examples:\n\
---------\n\
    show('version')",
    run: function(intf) {
      return intf.runtime.evaluate({
        expression: 'process.versions.v8',
        contextId: 1,
        returnByValue: true,
      }).then(({ result }) => {
        intf.print(result.value);
      });
    }
  };
};
