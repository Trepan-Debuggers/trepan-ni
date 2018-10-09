'use strict';
const trepanNiVersion = require('../package').version;

exports.version = function() {
  console.log('trepan-ni, version ' + trepanNiVersion);
  process.exit(3);
};

const runAsStandalone = typeof __dirname !== 'undefined';

exports.usage = function() {
  const invokedAs = runAsStandalone ?
        'trepan-ni' :
        `${process.argv0} ${process.argv[1]}`;

  console.error(`
${invokedAs} [--inspect] <script.js>  # debug <script.js>
${invokedAs} <host>:<port>            # debug at <host>:<port>
${invokedAs} -p <pid>                 # debug <pid>

Option --inspect causes the debugger not to stop initially.

See also "node --help".
`);
  process.exit(1);
};

exports.parseArgv = function parseArgv([target, ...args]) {
  let host = '127.0.0.1';
  let port = 9229;
  let isRemote = false;
  let script = target;
  let scriptArgs = args;

  if (target.match(/^--version/)) {
    exports.version();
  }

  if (target.match(/^--help/)) {
    exports.usage();
  }

  const hostMatch = target.match(/^([^:]+):(\d+)$/);
  const portMatch = target.match(/^--port=(\d+)$/);
  const immediateStop = target !== '--inspect';

  if (hostMatch) {
    // Connecting to remote debugger
    // `node-inspect localhost:9229`
    host = hostMatch[1];
    port = parseInt(hostMatch[2], 10);
    isRemote = true;
    script = null;
  } else if (portMatch) {
    // start debugee on custom port
    // `node inspect --port=9230 script.js`
    port = parseInt(portMatch[1], 10);
    script = args[0];
    scriptArgs = args.slice(1);
  } else if (args.length === 1 && /^\d+$/.test(args[0]) && target === '-p') {
    // Start debugger against a given pid
    const pid = parseInt(args[0], 10);
    try {
      process._debugProcess(pid);
    } catch (e) {
      if (e.code === 'ESRCH') {
        /* eslint-disable no-console */
        console.error(`Target process: ${pid} doesn't exist.`);
        /* eslint-enable no-console */
        process.exit(1);
      }
      throw e;
    }
    script = null;
    isRemote = true;
  } else if (immediateStop) {
    scriptArgs = scriptArgs.pop();
  }

  return {
    host, port, isRemote, script, scriptArgs, immediateStop
  };
};
