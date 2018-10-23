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
    paused: true,
    run: function(intf, frameNum = null) {
      if (frameNum == null) {
        frameNum = intf.selectedFrameIndex;
      }
      if (intf.isValidFrameIndex(frameNum)) {
        const frame = intf.currentBacktrace[frameNum];
        intf.section(`Frame ${frameNum}`);
        intf.frameLocation(frame);
      }
    }
  };
};
