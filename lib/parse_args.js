'use strict';
const trepanNiVersion = require('../package').version;

exports.version = function() {
  console.log('trepan-ni, version ' + trepanNiVersion);
  process.exit(3);
};

const runAsStandalone = typeof __dirname !== 'undefined';

exports.usage = function(verbose) {
  const invokedAs = runAsStandalone ?
    'trepan-ni' :
    `${process.argv0} ${process.argv[1]}`;

  console.error(`
${invokedAs} [--inspect] <script.js>  # debugs <script.js>
${invokedAs} -p <pid>                 # debugs connecting to <pid>
${invokedAs} <host>:<port>            # debugs connecting to <host>:<port>
`);
  if (verbose) {
    console.error(`In the first form, you give a nodejs program to bug.

Option "--inspect" causes the debugger not to stop initially,
otherwise there is a breakpoint set before the program proper is run.

In contrast to the first form, in the second form it is also presumed
that some nodejs program is already running in debug mode on the same
machine, and the process id, or "pid" for that program is _pid_.

In the the third form, like the second form, it is presumed that some
program is running in debug mode which is available by connecting via
a socket to _host_ at port _port_. This allows you to debug remotely
to a machine or device outside of the one you are debugging from,
although _host_ does not have to be a different machine.

See also the help given by "node --help", as many of those options are
relevant and accepted.  Also note in particular the environment
variables that can be used to influence execution.`);
  }
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
  } else if (target.match(/^--help/)) {
    exports.usage(true);
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
    scriptArgs.unshift(target);
    scriptArgs.shift();
  } else {
    script = scriptArgs.shift();
  }

  return {
    host, port, isRemote, script, scriptArgs, immediateStop
  };
};
