// Copyright 2018 Rocky Bernstein

'use strict';

/* FIXME: DRY find a common location for this */
const Path = require('path');
function getRelativePath(filename) {
  const dir = Path.join(Path.resolve(), 'x').slice(0, -1);

  // Change path to relative, if possible
  if (filename.indexOf(dir) === 0) {
    return filename.slice(dir.length);
  }
  return filename;
}


/*=================================
  Debugger 'info breakpoints' command
  ===================================*/

exports.Init = function(name, subcmd) {

  return {
    connection: false,
    help: `List all known breakpoints

Usage: info breakpoints

See also:
---------
break, clear, delete
`,
    aliases: ['break', 'breakpoint'],
    run: function(intf) {
      if (!intf.knownBreakpoints.length) {
        intf.print('No breakpoints yet');
        return;
      }
      intf.section('Num\tAddress');

      function formatLocation(bp) {
        if (!bp.location) return '<unknown location>';
        const script = intf.knownScripts[bp.location.scriptId];
        const scriptUrl = script ? script.url : bp.location.scriptUrl;
        let str = `${getRelativePath(scriptUrl)}:${bp.location.lineNumber + 1}`;
        if (typeof bp.condition !== 'undefined' && bp.condition !== null) {
          str += `\n\tstop only if ${bp.condition}`;
        }
        return str;
      }
      const breaklist = intf.knownBreakpoints
            .map((bp, idx) => `#${bp.bpNum}\t${formatLocation(bp)}`)
            .join('\n');
      intf.print(breaklist);
    }
  };
};
