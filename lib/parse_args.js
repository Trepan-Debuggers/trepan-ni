'use strict';
const trepanNiVersion = require('../package').version;

exports.version = function() {
  console.log('trepan-ni, version ' + trepanNiVersion);
  process.exit(3);
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

  const hostMatch = target.match(/^([^:]+):(\d+)$/);
  const portMatch = target.match(/^--port=(\d+)$/);

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
  }

  return {
    host, port, isRemote, script, scriptArgs,
  };
};
