// Copyright 2015, 2018 Rocky Bernstein

'use strict';

/*==============================================================
  Debugger info 'frame'  command
  =============================================================*/

exports.Init = function(name, subcmd) {
  return {
    help: `Print information about a call frame.

**info('frame'** *[,frame-num]* **)**

See also:
---------
info 'return', info 'args', info 'locals'`,
    connection: true,
    run: function(intf, frameNum = null) {
      // console.log(`XXX ${frameNum}`);
      if (frameNum == null) {
        frameNum = intf.selectedFrameIndex;
      } else if (frameNum < 0) {
        intf.error(`Frame number ${frameNum} needs to be greater than 0`);
        return;
      } else if (frameNum >= intf.currentBacktrace.length) {
        intf.error(`Frame number ${frameNum} too large;` +
                   `largest frame number is ${intf.currentBacktrace.length}`);
        return;
      }
      const frame = intf.currentBacktrace[frameNum];

      intf.section(`Frame ${frameNum}`);
      // FIXME: print location of function and of first line of code
      // console.log(`XXX ${require("util").inspect(frame)}`);
      if (frame.functionName !== '') {
        intf.print(`function name: ${frame.functionName}`);
      }
      intf.print(`frame type: ${frame.this.type} ${frame.this.className}`);
      // FIXME: print local names, and parameter names
    }
  };
};
