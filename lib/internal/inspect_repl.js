/*
 * Copyright Node.js contributors. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
'use strict';
const FS = require('fs');
const Path = require('path');
const Repl = require('repl');
const util = require('util');
const vm = require('vm');
const columnize = require('./columnize');
const debuglog = util.debuglog('inspect');

const HELP = `
run, restart, r       Run the application or reconnect
kill                  Kill a running application or disconnect
.exit, ^D             Quit debugger

up(count)             Move to a more-recent frame
down(count)           Move to a less-recent frame
frame(number)         Move to the specified frame

cont, c               Resume execution
next, n               Continue to next line in current file
step, s               Step into, potentially entering a function
out, o                Step out, leaving the current function
backtrace, bt         Print the current backtrace
list([start[, delta]) Print the source around the *start*, with *delta*
                      surrounding it. If *start* is not given, use the
                      line where execution is currently paused.
                      If delta is given, list that many surrouding lines.

setBreakpoint, b, sb  Set a breakpoint
clearBreakpoint, cb   Clear a breakpoint
breakpoints           List all known breakpoints
breakOnException      Pause execution whenever an exception is thrown
breakOnUncaught       Pause execution whenever an exception isn't caught
breakOnNone           Don't pause on exceptions (this is the default)

watch(expr)           Start watching the given expression
unwatch(expr)         Stop watching an expression
watchers              Print all watched expressions and their current values

eval(expr), exec      Evaluate the expression and print the value
shell, repl           Enter a debug repl that works like exec

scripts               List application scripts that are currently loaded
scripts(true)         List all scripts (including node-internals)

profile               Start CPU profiling session.
profileEnd            Stop current CPU profiling session.
profiles              Array of completed CPU profiling sessions.
profiles[n].save(filepath = 'node.cpuprofile')
                      Save CPU profiling session to disk as JSON.

takeHeapSnapshot(filepath = 'node.heapsnapshot')
                      Take a heap snapshot and save to disk as JSON.
`.trim();

const FUNCTION_NAME_PATTERN = /^(?:function\*? )?([^(\s]+)\(/;
function extractFunctionName(description) {
  const fnNameMatch = description.match(FUNCTION_NAME_PATTERN);
  return fnNameMatch ? `: ${fnNameMatch[1]}` : '';
}

const NATIVES = process.binding('natives');
function isNativeUrl(url) {
  return url.replace('.js', '') in NATIVES || url === 'bootstrap_node.js';
}

function getRelativePath(filename) {
  const dir = Path.join(Path.resolve(), 'x').slice(0, -1);

  // Change path to relative, if possible
  if (filename.indexOf(dir) === 0) {
    return filename.slice(dir.length);
  }
  return filename;
}

function toCallback(promise, callback) {
  function forward(...args) {
    process.nextTick(() => callback(...args));
  }
  promise.then(forward.bind(null, null), forward);
}

// Adds spaces and prefix to number
// maxN is a maximum number we should have space for
function leftPad(n, prefix, maxN) {
  const s = n.toString();
  const nchars = Math.max(2, String(maxN).length) + 1;
  const nspaces = nchars - s.length - 1;

  return prefix + ' '.repeat(nspaces) + s;
}

function markSourceColumn(sourceText, position, useColors) {
  if (!sourceText) return '';

  const head = sourceText.slice(0, position);
  let tail = sourceText.slice(position);

  // Colourize char if stdout supports colours
  if (useColors) {
    tail = tail.replace(/(.+?)([^\w]|$)/, '\u001b[32m$1\u001b[39m$2');
  }

  // Return source line with coloured char at `position`
  return [head, tail].join('');
}

function extractErrorMessage(stack) {
  if (!stack) return '<unknown>';
  const m = stack.match(/^\w+: ([^\n]+)/);
  return m ? m[1] : stack;
}

function convertResultToError(result) {
  const { className, description } = result;
  const err = new Error(extractErrorMessage(description));
  err.stack = description;
  Object.defineProperty(err, 'name', { value: className });
  return err;
}

function trimWhitespace(cmd) {
  var trimmer = /^\s*(.+)\s*$/m,
    matches = trimmer.exec(cmd);

  if (matches && matches.length === 2) {
    return matches[1];
  }
  return '';
}
class RemoteObject {
  constructor(attributes) {
    Object.assign(this, attributes);
    if (this.type === 'number') {
      this.value =
        this.unserializableValue ? +this.unserializableValue : +this.value;
    }
  }

  [util.inspect.custom](depth, opts) {
    function formatProperty(prop) {
      switch (prop.type) {
        case 'string':
        case 'undefined':
          return util.inspect(prop.value, opts);

        case 'number':
        case 'boolean':
          return opts.stylize(prop.value, prop.type);

        case 'object':
        case 'symbol':
          if (prop.subtype === 'date') {
            return util.inspect(new Date(prop.value), opts);
          }
          if (prop.subtype === 'array') {
            return opts.stylize(prop.value, 'special');
          }
          return opts.stylize(prop.value, prop.subtype || 'special');

        default:
          return prop.value;
      }
    }
    switch (this.type) {
      case 'boolean':
      case 'number':
      case 'string':
      case 'undefined':
        return util.inspect(this.value, opts);

      case 'symbol':
        return opts.stylize(this.description, 'special');

      case 'function': {
        const fnName = extractFunctionName(this.description);
        const formatted = `[${this.className}${fnName}]`;
        return opts.stylize(formatted, 'special');
      }

      case 'object':
        switch (this.subtype) {
          case 'date':
            return util.inspect(new Date(this.description), opts);

          case 'null':
            return util.inspect(null, opts);

          case 'regexp':
            return opts.stylize(this.description, 'regexp');

          default:
            break;
        }
        if (this.preview) {
          const props = this.preview.properties
            .map((prop, idx) => {
              const value = formatProperty(prop);
              if (prop.name === `${idx}`) return value;
              return `${prop.name}: ${value}`;
            });
          if (this.preview.overflow) {
            props.push('...');
          }
          const singleLine = props.join(', ');
          const propString =
            singleLine.length > 60 ? props.join(',\n  ') : singleLine;

          return this.subtype === 'array' ?
            `[ ${propString} ]` : `{ ${propString} }`;
        }
        return this.description;

      default:
        return this.description;
    }
  }

  static fromEvalResult({ result, wasThrown }) {
    if (wasThrown) return convertResultToError(result);
    return new RemoteObject(result);
  }
}

class ScopeSnapshot {
  constructor(scope, properties) {
    Object.assign(this, scope);
    this.properties = new Map(properties.map((prop) => {
      const value = new RemoteObject(prop.value);
      return [prop.name, value];
    }));
    this.completionGroup = properties.map((prop) => prop.name);
  }

  [util.inspect.custom](depth, opts) {
    const type = `${this.type[0].toUpperCase()}${this.type.slice(1)}`;
    const name = this.name ? `<${this.name}>` : '';
    const prefix = `${type}${name} `;
    return util.inspect(this.properties, opts)
      .replace(/^Map /, prefix);
  }
}

function createRepl(inspector) {
  const { Debugger, HeapProfiler, Profiler, Runtime } = inspector;

  let repl; // eslint-disable-line prefer-const

  // Things we want to keep around
  const history = { control: [], debug: [] };
  const watchedExpressions = [];
  const knownBreakpoints = [];
  let pauseOnExceptionState = 'none';
  let lastCommand;
  let bpNum = 1;
  // let tokens;
  // let cmdArgs;
  let cmdName;
  let cmd;

  // Things we need to reset when the app restarts
  let knownScripts;
  let currentBacktrace;
  let selectedFrame;
  let selectedFrameIndex = 0;
  let exitDebugRepl;
  const aliases = {};
  const commands = {};
  const displayWidth = 80; // May want to allow adjusting

  function requireConnection() {
    if (!selectedFrame) {
      return false;
    }
    return true;
  }

  // Add a debugger command or alias to the
  // list of commands the REPL understands.
  // NEWER interface.
  function defineCommand(cmdName, cmd) {
    if (typeof cmd.run !== 'function') {
      throw new Error('bad argument, "run "field must be a function');
    }
    var fn = cmd.run;
    cmd.name = cmdName;
    repl.context[cmdName] = fn;
    commands[cmdName] = cmd;
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        aliases[alias] = cmd;
      }
    } else {
      cmd.aliases = [];
    }
  }


  function resetOnStart() {
    knownScripts = {};
    currentBacktrace = null;
    selectedFrame = null;

    if (exitDebugRepl) exitDebugRepl();
    exitDebugRepl = null;
  }
  resetOnStart();

  const INSPECT_OPTIONS = { colors: inspector.stdout.isTTY };
  function inspect(value) {
    return util.inspect(value, INSPECT_OPTIONS);
  }

  function print(value, oneline = false) {
    const text = typeof value === 'string' ? value : inspect(value);
    return inspector.print(text, oneline);
  }

  function getCurrentLocation() {
    if (!selectedFrame) {
      throw new Error('Requires execution to be paused');
    }
    return selectedFrame.location;
  }

  function isCurrentScript(script) {
    return selectedFrame && getCurrentLocation().scriptId === script.scriptId;
  }

  function formatScripts(displayNatives = false) {
    function isVisible(script) {
      if (displayNatives) return true;
      return !script.isNative || isCurrentScript(script);
    }

    return Object.keys(knownScripts)
      .map((scriptId) => knownScripts[scriptId])
      .filter(isVisible)
      .map((script) => {
        const isCurrent = isCurrentScript(script);
        const { isNative, url } = script;
        const name = `${getRelativePath(url)}${isNative ? ' <native>' : ''}`;
        return `${isCurrent ? '*' : ' '} ${script.scriptId}: ${name}`;
      })
      .join('\n');
  }
  function listScripts(displayNatives = false) {
    print(formatScripts(displayNatives));
  }
  listScripts[util.inspect.custom] = function listWithoutInternal() {
    return formatScripts();
  };

  const profiles = [];
  class Profile {
    constructor(data) {
      this.data = data;
    }

    static createAndRegister({ profile }) {
      const p = new Profile(profile);
      profiles.push(p);
      return p;
    }

    [util.inspect.custom](depth, { stylize }) {
      const { startTime, endTime } = this.data;
      return stylize(`[Profile ${endTime - startTime}μs]`, 'special');
    }

    save(filename = 'node.cpuprofile') {
      const absoluteFile = Path.resolve(filename);
      const json = JSON.stringify(this.data);
      FS.writeFileSync(absoluteFile, json);
      print('Saved profile to ' + absoluteFile);
    }
  }

  class SourceSnippet {
    constructor(location, delta, scriptSource) {
      Object.assign(this, location);
      this.scriptSource = scriptSource;
      this.delta = delta;
    }

    [util.inspect.custom](depth, options) {
      const { scriptId, lineNumber, columnNumber, delta, scriptSource } = this;
      const start = Math.max(1, lineNumber - delta + 1);
      const end = lineNumber + delta + 1;

      const lines = scriptSource.split('\n');
      return lines.slice(start - 1, end).map((lineText, offset) => {
        const i = start + offset;
        const isCurrent = i === (lineNumber + 1);

        const markedLine = isCurrent
          ? markSourceColumn(lineText, columnNumber, options.colors)
          : lineText;

        let isBreakpoint = false;
        knownBreakpoints.forEach(({ location }) => {
          if (!location) return;
          if (scriptId === location.scriptId &&
              i === (location.lineNumber + 1)) {
            isBreakpoint = true;
          }
        });

        let prefixChar = ' ';
        if (isCurrent) {
          prefixChar = '>';
        } else if (isBreakpoint) {
          prefixChar = '*';
        }
        return `${leftPad(i, prefixChar, end)} ${markedLine}`;
      }).join('\n');
    }
  }

  function getSourceSnippet(location, delta = 5) {
    const { scriptId } = location;
    return Debugger.getScriptSource({ scriptId })
      .then(({ scriptSource }) =>
        new SourceSnippet(location, delta, scriptSource));
  }

  class CallFrame {
    constructor(callFrame) {
      Object.assign(this, callFrame);
    }

    loadScopes() {
      return Promise.all(
        this.scopeChain
          .filter((scope) => scope.type !== 'global')
          .map((scope) => {
            const { objectId } = scope.object;
            return Runtime.getProperties({
              objectId,
              generatePreview: true,
            }).then(({ result }) => new ScopeSnapshot(scope, result));
          })
      );
    }

    // Source-code listing starting at *startLine* with *delta* surrounding
    // lines.
    list(startLine = 0, delta = 5) {
      const location = Object.assign({}, this.location);
      if (startLine) {
        location.lineNumber = startLine - 1;
        location.columnNumber = 0;
      }
      return getSourceSnippet(location, delta);
    }
  }

  class Backtrace extends Array {
    [util.inspect.custom]() {
      return this.map((callFrame, idx) => {
        const {
          location: { scriptId, lineNumber, columnNumber },
          functionName
        } = callFrame;
        const name = functionName || '(anonymous)';

        const script = knownScripts[scriptId];
        const relativeUrl =
          (script && getRelativePath(script.url)) || '<unknown>';
        const frameLocation =
          `${relativeUrl}:${lineNumber + 1}:${columnNumber}`;

        const prefix = (idx == selectedFrameIndex) ?
   '->' : '##';
        return `${prefix} ${idx} ${name} ${frameLocation}`;
      }).join('\n');
    }

    static from(callFrames) {
      return super.from(Array.from(callFrames).map((callFrame) => {
        if (callFrame instanceof CallFrame) {
          return callFrame;
        }
        return new CallFrame(callFrame);
      }));
    }
  }

  // function prepareControlCode(input) {
  //   if (input === '\n') return lastCommand;
  //   // exec process.title => exec("process.title");
  //   const match = input.match(/^\s*exec\s+([^\n]*)/);
  //   if (match) {
  //     lastCommand = `exec(${JSON.stringify(match[1])})`;
  //   } else {
  //     lastCommand = input;
  //   }
  //   return lastCommand;
  // }

  function evalInCurrentContext(code) {
    // Repl asked for scope variables
    if (code === '.scope') {
      if (!selectedFrame) {
        return Promise.reject(new Error('Requires execution to be paused'));
      }
      return selectedFrame.loadScopes().then((scopes) => {
        return scopes.map((scope) => scope.completionGroup);
      });
    }

    if (selectedFrame) {
      return Debugger.evaluateOnCallFrame({
        callFrameId: selectedFrame.callFrameId,
        expression: code,
        objectGroup: 'node-inspect',
        generatePreview: true,
      }).then(RemoteObject.fromEvalResult);
    }
    return Runtime.evaluate({
      expression: code,
      objectGroup: 'node-inspect',
      generatePreview: true,
    }).then(RemoteObject.fromEvalResult);
  }

  // Used for debugger's commands evaluation and execution
  function controlEval(input, context, filename, callback) {
    debuglog('eval:', input);
    function returnToCallback(error, result) {
      debuglog('end-eval:', input, error);
      callback(error, result);
    }

    try {
      // FIXME: Put this in prepareControlCode(input)
      // tokens = input.split(/[ \t\n]+/);
      // cmdArgs = tokens.slice(1);
      cmdName = trimWhitespace(input).split(/[ (]/)[0];
      if (cmdName in aliases) {
        cmd = aliases[cmdName];
        input = input.replace(cmdName, cmd.name);
      } else if (cmdName in commands) {
        cmd = commands[cmdName];
      }

      if (cmd && cmd.connection && !requireConnection()) {
        print(`This command, "${cmdName}", requires a running program.`);
        returnToCallback(null);
        return;
      }

      const match = input.match(/^\s*exec\s+([^\n]*)/);
      if (match) {
        input = `exec(${JSON.stringify(match[1])})`;
        console.log(`WOOT ${input}`);
      } else {
        // A hack so that command: a b  -> a(b)
        const parts = input.split(/[ \t]+/);
        if (parts.length == 2) {
          const part1 = trimWhitespace(parts[0]);
          const part2 = trimWhitespace(parts[1]);
          if (!part2[0] != '(' &&
              part2[part2.length - 1] != ')') {
            input = part1 + '(' + part2 + ')';
          }
        } else if (input === '\n') {
          input = lastCommand;
        } else if (input.length > 0 && !input.match(/\(.*\)/)) {
          input += '()';
        }
      }

      const result = vm.runInContext(input, context, filename);
      lastCommand = input;
      if (result && typeof result.then === 'function') {
        toCallback(result, returnToCallback);
        return;
      }
      returnToCallback(null, result);
    } catch (e) {
      returnToCallback(e);
    }

    // try {
    //   const code = prepareControlCode(input);
    //   const result = vm.runInContext(code, context, filename);
    //   if (result && typeof result.then === 'function') {
    //     toCallback(result, returnToCallback);
    //     return;
    //   }
    //   returnToCallback(null, result);
    // } catch (e) {
    //   returnToCallback(e);
    // }
  }

  // Used for debugger's remote evaluation: shell and eval() debugger commands
  function debugEval(input, context, filename, callback) {
    debuglog('eval:', input);
    function returnToCallback(error, result) {
      debuglog('end-eval:', input, error);
      callback(error, result);
    }

    try {
      const result = evalInCurrentContext(input);

      if (result && typeof result.then === 'function') {
        toCallback(result, returnToCallback);
        return;
      }
      returnToCallback(null, result);
    } catch (e) {
      returnToCallback(e);
    }
  }

  function formatWatchers(verbose = false) {
    if (!watchedExpressions.length) {
      return Promise.resolve('');
    }

    const inspectValue = (expr) =>
      evalInCurrentContext(expr)
        // .then(formatValue)
        .catch((error) => `<${error.message}>`);
    const lastIndex = watchedExpressions.length - 1;

    return Promise.all(watchedExpressions.map(inspectValue))
      .then((values) => {
        const lines = watchedExpressions
          .map((expr, idx) => {
            const prefix = `${leftPad(idx, ' ', lastIndex)}: ${expr} =`;
            const value = inspect(values[idx], { colors: true });
            if (value.indexOf('\n') === -1) {
              return `${prefix} ${value}`;
            }
            return `${prefix}\n    ${value.split('\n').join('\n    ')}`;
          });
        return lines.join('\n');
      })
      .then((valueList) => {
        return verbose ? `Watchers:\n${valueList}\n` : valueList;
      });
  }

  function watchers(verbose = false) {
    return formatWatchers(verbose).then(print);
  }

  // List "delta" lines of source code,
  function help(what, suboption = null) {
    if (!what) {
      print(commands['help'].help);
      return;
    } else if (what == '*') {
      // FIXME should be section
      print('List of debugger commands');
      const cmdList = Object.keys(commands).sort();
      const opts = {displayWidth: displayWidth,
        ljust: true};
      print(columnize.columnize(cmdList, opts), true);
      return;
    } else if (what == 'old') {
      print(HELP);
      return;
    // } else if (what == 'syntax') {
    //   var filename = path.join(__dirname, "help", "syntax.md");
    //   fs.readFile(filename, 'utf8', function (err,data) {
    //   if (err) {
    //      intf.error(err);
    //      return;
    //    }
    //    print(data);
    //   });
    //   return;
    } else if (what in aliases) {
      what = aliases[what].name;
    }
    if (what in commands) {
      var cmd = commands[what];
      var helpObj = cmd.help;
      if (typeof helpObj === 'function') {
        helpObj(suboption);
      } else {
        print(helpObj);
      }
      if (cmd.aliases.length > 0) {
        // FIXME: should be section
        print('\nAliases:');
        print(cmd.aliases.join(', '));
      }
    } else {
      if (typeof what === 'function') {
        // let token = this.cmdArgs[0];
        print(`"${what}" evaluates to a function; perhaps you meant: \
help('${what}')?`);
        return;
      } else {
        print(`"${what}" is not a debugger command or is not documented yet.
Try also help('old').`);
        return;
      }
    }
  }

  // List "delta" lines of source code,
  function list(startLine = 0, delta = 5) {
    return selectedFrame.list(startLine, delta)
      .then(null, (error) => {
        print('You can\'t list source code right now');
        throw error;
      });
  }

  function frame(tryFrameIndex) {
    if (tryFrameIndex < 0) {
      print('Frame would go above newest frame');
      return;
    }
    if (tryFrameIndex >= currentBacktrace.length) {
      print('Frame would go beyond oldest frame');
      return;
    }
    selectedFrameIndex = tryFrameIndex;
    selectedFrame = currentBacktrace[selectedFrameIndex];
    const loc = selectedFrame.location;
    const lineNum = loc.lineNumber + 1;
    const script = knownScripts[loc.scriptId];
    print(`frame change in ${script.url}:${lineNum}`);

    return list();
  }

  function up(count = 1) {
    return frame(selectedFrameIndex + count);
  }

  function down(count = 1) {
    return frame(selectedFrameIndex - count);
  }

  function handleBreakpointResolved({ breakpointId, location }) {
    const script = knownScripts[location.scriptId];
    const scriptUrl = script && script.url;
    if (scriptUrl) {
      Object.assign(location, { scriptUrl });
    }
    const isExisting = knownBreakpoints.some((bp) => {
      if (bp.bpNum === bpNum) {
        Object.assign(bp, { location });
        return true;
      }
      return false;
    });
    if (!isExisting) {
      knownBreakpoints.push({ breakpointId, location, bpNum: bpNum });
    }
  }

  function listBreakpoints() {
    if (!knownBreakpoints.length) {
      print('No breakpoints yet');
      return;
    }

    function formatLocation(location) {
      if (!location) return '<unknown location>';
      const script = knownScripts[location.scriptId];
      const scriptUrl = script ? script.url : location.scriptUrl;
      return `${getRelativePath(scriptUrl)}:${location.lineNumber + 1}`;
    }
    const breaklist = knownBreakpoints
      .map((bp, idx) => `#${bp.bpNum} ${formatLocation(bp.location)}`)
      .join('\n');
    print(breaklist);
  }


  function setBreakpoint(script, line, condition, silent) {

    function registerBreakpoint({ breakpointId, actualLocation }) {
      handleBreakpointResolved({ breakpointId, location: actualLocation });
      if (actualLocation && actualLocation.scriptId) {
        if (!silent) {
          print(`Breakpoint ${bpNum} set in file ${actualLocation.scriptUrl}, \
line ${actualLocation.lineNumber + 1}.`);
          bpNum++;
          return getSourceSnippet(actualLocation, 5);
        }
        bpNum++;
      } else {
        print(`Warning: script '${script}' was not loaded yet.`);
      }
      return undefined;
    }


    // setBreakpoint(): set breakpoint at current location
    if (script === undefined) {
      return Debugger
        .setBreakpoint({ location: getCurrentLocation(), condition })
        .then(registerBreakpoint);
    }

    // setBreakpoint(line): set breakpoint in current script at specific line
    if (line === undefined && typeof script === 'number') {
      const location = {
        scriptId: getCurrentLocation().scriptId,
        lineNumber: script - 1,
      };
      return Debugger.setBreakpoint({ location, condition })
        .then(registerBreakpoint);
    }

    if (typeof script !== 'string') {
      throw new TypeError(`setBreakpoint() expects a string, got ${script}`);
    }

    // setBreakpoint('fn()'): Break when a function is called
    if (script.endsWith('()')) {
      const debugExpr = `debug(${script.slice(0, -2)})`;
      const debugCall = selectedFrame
        ? Debugger.evaluateOnCallFrame({
          callFrameId: selectedFrame.callFrameId,
          expression: debugExpr,
          includeCommandLineAPI: true,
        })
        : Runtime.evaluate({
          expression: debugExpr,
          includeCommandLineAPI: true,
        });
      return debugCall.then(({ result, wasThrown }) => {
        if (wasThrown) return convertResultToError(result);
        return undefined; // This breakpoint can't be removed the same way
      });
    }

    // setBreakpoint('scriptname')
    let scriptId = null;
    let ambiguous = false;
    if (knownScripts[script]) {
      scriptId = script;
    } else {
      for (const id of Object.keys(knownScripts)) {
        const scriptUrl = knownScripts[id].url;
        if (scriptUrl && scriptUrl.indexOf(script) !== -1) {
          if (scriptId !== null) {
            ambiguous = true;
          }
          scriptId = id;
        }
      }
    }

    if (ambiguous) {
      print('Script name is ambiguous');
      return undefined;
    }
    if (line <= 0) {
      print('Line should be a positive value');
      return undefined;
    }

    if (scriptId !== null) {
      const location = { scriptId, lineNumber: line - 1 };
      return Debugger.setBreakpoint({ location, condition })
        .then(registerBreakpoint);
    }

    // const escapedPath = script.replace(/([/\\.?*()^${}|[\]])/g, '\\$1');
    const escapedPath = script.replace(
      new RegExp('([/\\.?*()^${}|[]])', 'g'), '\\$1');
    const urlRegex = `^(.*[\\/\\\\])?${escapedPath}$`;

    return Debugger
      .setBreakpointByUrl({ urlRegex, lineNumber: line - 1, condition })
      .then((bp) => {
        // TODO: handle bp.locations in case the regex matches existing files
        if (!bp.location) { // Fake it for now.
          Object.assign(bp, {
            actualLocation: {
              scriptUrl: `.*/${script}$`,
              lineNumber: line - 1,
            },
          });
        }
        return registerBreakpoint(bp);
      });
  }

  // Delete a breakpoint
  function deleteBreakpoint(findId) {
    const breakpoint = knownBreakpoints.find(({ bpNum }) => {
      return (
        findId === bpNum
      );
    });
    if (!breakpoint) {
      print(`Could not find breakpoint ${findId}`);
      return Promise.resolve();
    }
    return Debugger.removeBreakpoint({ breakpointId: breakpoint.breakpointId })
      .then(() => {
        const idx = knownBreakpoints.indexOf(breakpoint);
        knownBreakpoints.splice(idx, 1);
        print(`Breakpoint ${findId} deleted`);
      });
  }

  function clearBreakpoint(url, line) {
    const breakpoint = knownBreakpoints.find(({ location }) => {
      if (!location) return false;
      const script = knownScripts[location.scriptId];
      if (!script) return false;
      return (
        script.url.indexOf(url) !== -1 && (location.lineNumber + 1) === line
      );
    });
    if (!breakpoint) {
      print(`Could not find breakpoint at ${url}:${line}`);
      return Promise.resolve();
    }
    return Debugger.removeBreakpoint({ breakpointId: breakpoint.breakpointId })
      .then(() => {
        const idx = knownBreakpoints.indexOf(breakpoint);
        print(`Breakpoint ${knownBreakpoints[idx].bpNum} deleted`);
        knownBreakpoints.splice(idx, 1);
      });
  }

  function restoreBreakpoints() {
    const lastBreakpoints = knownBreakpoints.slice();
    knownBreakpoints.length = 0;
    bpNum = 1;
    const newBreakpoints = lastBreakpoints
      .filter(({ location }) => !!location.scriptUrl)
      .map(({ location }) =>
           setBreakpoint(location.scriptUrl, location.lineNumber + 1));
    if (!newBreakpoints.length) return Promise.resolve();
    return Promise.all(newBreakpoints).then((results) => {
      print(`${results.length} breakpoints restored.`);
    });
  }

  function setPauseOnExceptions(state) {
    return Debugger.setPauseOnExceptions({ state })
      .then(() => {
        pauseOnExceptionState = state;
      });
  }

  Debugger.on('paused', ({ callFrames, reason /* , hitBreakpoints */ }) => {
    // Save execution context's data
    currentBacktrace = Backtrace.from(callFrames);
    selectedFrame = currentBacktrace[0];
    const { scriptId, lineNumber } = selectedFrame.location;

    const breakType = reason === 'other' ? 'break' : reason;
    const script = knownScripts[scriptId];
    const scriptUrl = script ? getRelativePath(script.url) : '[unknown]';

    const header = `${breakType} in ${scriptUrl}:${lineNumber + 1}`;

    inspector.suspendReplWhile(() =>
      Promise.all([formatWatchers(true), selectedFrame.list(0, 2)])
        .then(([watcherList, context]) => {
          if (watcherList) {
            return `${watcherList}\n${inspect(context)}`;
          }
          return inspect(context);
        }).then((breakContext) => {
          print(`${header}\n${breakContext}`);
        }));
  });

  function handleResumed() {
    currentBacktrace = null;
    selectedFrame = null;
  }

  Debugger.on('resumed', handleResumed);

  Debugger.on('breakpointResolved', handleBreakpointResolved);

  Debugger.on('scriptParsed', (script) => {
    const { scriptId, url } = script;
    if (url) {
      knownScripts[scriptId] = Object.assign({
        isNative: isNativeUrl(url),
      }, script);
    }
  });

  Profiler.on('consoleProfileFinished', ({ profile }) => {
    Profile.createAndRegister({ profile });
    print([
      'Captured new CPU profile.',
      `Access it with profiles[${profiles.length - 1}]`
    ].join('\n'));
  });

  function initializeContext(context) {
    inspector.domainNames.forEach((domain) => {
      Object.defineProperty(context, domain, {
        value: inspector[domain],
        enumerable: true,
        configurable: true,
        writeable: false,
      });
    });

    // Note: debugger commands can't conflict with JavaScript
    // reserved words. In particular, this prohibits the use of
    // 'eval', and 'continue'.
    // However these can be aliases for other commands.

    /*=================================
      Debugger 'backtrace' command
      ===================================*/
    defineCommand('backtrace', {
      connection: true,
      help: `Print backtrace of all stack frames.

Usage: backtrace

See also:
---------
up, down, frame
`,
      aliases: ['bt'],
      run: function() {
        return currentBacktrace;
      }
    });

    /*=================================
      Debugger 'setBreakpoint' command
      ===================================*/
    defineCommand('setBreakpoint', {
      connection: false,
      help: `List all known breakpoints

Usage: breakpoints

See also:
---------
breakpoints, clear, delete
`,
      aliases: ['sb', 'breakpoint', 'break'],
      run: setBreakpoint,
    });

    /*=================================
      Debugger 'breakpoints' command
      ===================================*/
    defineCommand('breakpoints', {
      connection: true,
      help: `List all known breakpoints

Usage: breakpoints

See also:
---------
break, clear, delete
`,
      aliases: [],
      run: listBreakpoints,
    });

    /*=================================
      Debugger 'cont' command
      ===================================*/
    defineCommand('cont', {
      connection: false,
      help: `Continue program being debugged, after signal or breakpoint.

Usage: cont

See also:
---------
next, step, break
`,
      aliases: ['c', 'continue'],
      run: function() {
        handleResumed();
        return Debugger.resume();
      }
    });

    /*=================================
      Debugger 'clearBreakpoint' command
      ===================================*/
    defineCommand('clearBreakpoint', {

      help: `Remove a breakpoint by location.

Usage: delete(1)

See also:
--------
delete, break
`,
      aliases: ['cb'],
      run: clearBreakpoint
    });

    /*=================================
      Debugger 'delete' command
      ===================================*/
    defineCommand('delete', {

      help: `Remove a breakpoint by number.

Usage: delete(1)

See also:
--------
break, clearBreakpoint
`,
      aliases: ['deleteBreakpoint'],
      run: deleteBreakpoint
    });

    /*=================================
      Debugger 'down'
      ===================================*/
    defineCommand('down', {
      connection: true,
      help: `Select and print stack frame called by this one.

Usage: down([count])

An argument says how many frames down to go.

See also:
---------
up, frame
`,
      aliases: [],
      // run: intf.down
      run: down,
    });


    /*=================================
      Debugger 'exec' command
      ===================================*/
    defineCommand('exec', {
      connection: true,
      help: `Evaluate the expression and print the value

Usage: eval
`,
      aliases: ['e', 'eval'],
      run: function(expr) {
        return evalInCurrentContext(expr);
      }
    });

    /*=================================
      Debugger 'finish' (step out) command
      ===================================*/
    defineCommand('finish', {
      connection: true,
      help: `Execute until selected stack frame returns.
Usage: finish

Upon return, the value returned is printed and put in the value history.

Sometimes called 'step over'

See also:
--------
step, next, cont, run
`,
      aliases: ['fin'],
      // run: function() { intf.finish() }
      run: function() {
        handleResumed();
        return Debugger.stepOut();
      }
    });

    /*=================================
      Debugger 'frame'
      ===================================*/
    defineCommand('frame', {
      connection: true,
      help: `Select and print a stack frame.

Usage: frame([frame-number])

With no argument, print the selected stack frame.
An argument specifies the frame to select.

See also:
---------
down, up
`,
      aliases: [],
      // run: intf.up
      run: frame,
    });

    /*=================================
      Debugger 'heapSnapshot'
      ===================================*/
    defineCommand('heapSnapshot', {
      connection: true,
      help: `Take a heap snapshot and save to disk as JSON.

Usage: heapSnapshot(filepath = 'node.heapsnapshot')
`,
      aliases: [],
      run: function(filename = 'node.heapsnapshot') {
        return new Promise((resolve, reject) => {
          const absoluteFile = Path.resolve(filename);
          const writer = FS.createWriteStream(absoluteFile);
          let sizeWritten = 0;
          function onProgress({ done, total, finished }) {
            if (finished) {
              print('Heap snaphost prepared.');
            } else {
              print(`Heap snapshot: ${done}/${total}`, true);
            }
          }
          function onChunk({ chunk }) {
            sizeWritten += chunk.length;
            writer.write(chunk);
            print(`Writing snapshot: ${sizeWritten}`, true);
          }
          function onResolve() {
            writer.end(() => {
              teardown();
              print(`Wrote snapshot: ${absoluteFile}`);
              resolve();
            });
          }
          function onReject(error) {
            teardown();
            reject(error);
          }
          function teardown() {
            HeapProfiler.removeListener(
              'reportHeapSnapshotProgress', onProgress);
            HeapProfiler.removeListener('addHeapSnapshotChunk', onChunk);
          }

          HeapProfiler.on('reportHeapSnapshotProgress', onProgress);
          HeapProfiler.on('addHeapSnapshotChunk', onChunk);

          print('Heap snapshot: 0/0', true);
          HeapProfiler.takeHeapSnapshot({ reportProgress: true })
            .then(onResolve, onReject);
        });
      }
    });

    /*=================================
      Debugger 'help' command
      ===================================*/
    defineCommand('help', {
      help: `Type help('*command-name*') to get help for
command *command-name*.

Type help('*') for the list of all commands.
Type help('old') for the old list of all commands.

Note above the use of parenthesis after "help" and the quotes when \n\
specifying a parameter.`,
      aliases: ['?'],
      run: help,
    });

    /*=================================
      Debugger 'kill' command
      ===================================*/
    defineCommand('kill', {
      connection: true,
      help: `Kill the debugger.

Usage: kill

See also:
---------
.exit
`,
      aliases: [],
      run: function() {
        return inspector.killChild();
      }
    });

    /*=================================
      Debugger 'list' command
      ===================================*/
    defineCommand('list', {
      connection: true,
      help: `List source-code lines centered around *from*.
Usage: list([from, [delta]])

With no arguments, lists 5 lines starting the current list location.
With a *from* argument, listing starts at that line.
With a *delta* argument, delta lines are listed before and after the
listing line.

The line listed is marked with a '>'. Any lines with breakpoints in them
are marked with '*'.
`,
      aliases: ['l'],
      run: list
    });

    /*=================================
      Debugger 'next' (step over) command
      ===================================*/
    defineCommand('next', {
      connection: true,
      help: `Step program, proceeding through subroutine calls.

Usage: next

Unlike "step", if the current source line calls a subroutine,
this command does not enter the subroutine, but instead steps over
the call, in effect treating it as a single source line.

This is sometimes called 'step over'

See also:
---------
step, finish, cont, run
`,
      aliases: ['n'],
      // run: function() { intf.next() }
      run: function() {
        handleResumed();
        return Debugger.stepOver();
      }
    });

    /*=================================
      Debugger 'pause' command
      ===================================*/
    defineCommand('pause', {
      connection: true,
      help: `Pause program.
`,
      aliases: [],
      // run: function() { intf.next() }
      run: function() {
        handleResumed();
        return Debugger.stepOver();
      }
    });

    /*=================================
      Debugger 'breakOnException' command
      ===================================*/
    defineCommand('breakOnException', {
      connection: true,
      help: `Pause execution whenever an exception is thrown.
`,
      aliases: [],
      run: function() {
        return setPauseOnExceptions('all');
      }
    });

    /*=================================
      Debugger 'breakOnNone' command
      ===================================*/
    defineCommand('breakOnNone', {
      connection: true,
      help: `Pause execution whenever an exception is thrown.
`,
      aliases: [],
      run: function() {
        return setPauseOnExceptions('none');
      }
    });

    /*=================================
      Debugger 'breakOnUncaught' command
      ===================================*/
    defineCommand('breakOnUncaught', {
      connection: true,
      help: `Pause execution whenever an exception is thrown.
`,
      aliases: [],
      run: function() {
        return setPauseOnExceptions('uncaught');
      }
    });

    /*=================================
      Debugger 'profile' command
      ===================================*/
    defineCommand('profile', {
      connection: true,
      help: `Start CPU profiling session.

Usage: profile

See also:
---------
profileEnd, profiles
`,
      aliases: [],
      run: function() {
        return Profiler.start();
      }
    });

    /*=================================
      Debugger 'profileEnd' command
      ===================================*/
    defineCommand('profileEnd', {
      connection: true,
      help: `Stop current CPU profiling session.

Usage: profileEnd

See also:
---------
profile, profiles
`,
      aliases: [],
      run: function() {
        return Profiler.stop()
          .then(Profile.createAndRegister);
      }
    });

    /*=================================
      Debugger 'profiles' command
      ===================================*/
    defineCommand('profiles', {
      connection: true,
      help: `Show array of completed CPU profiling sessions.

Usage: profiles

See also:
---------
profile, profileEnd
`,
      aliases: [],
      run: function() {
        return profiles;
      }
    });

    /*=================================
      Debugger 'quit' command
      ===================================*/
    defineCommand('quit', {
      connection: true,
      help: `Quit debugger

Usage: quit

See also:
--------
kill
`,
      aliases: ['exit'],
      // run: intf.quit
      run: function() {
        repl.rli.emit('exit');
      }
    });

    /*=================================
      Debugger 'run' command
      ===================================*/
    defineCommand('run', {
      help: `Run, restart or reconnect the application.

Usage: run

Existing breakpoints are saved and restored.

See also:
--------
cont, kill, quit
`,
      aliases: ['r', 'restart'],
      // run: intf.step
      run: function() {
        return inspector.run();
      }
    });

    /*=================================
      Debugger 'scripts' command
      ===================================*/
    defineCommand('scripts', {
      help: `List application scripts that are currently loaded

Usage: scripts
       scripts(true)

In the second form, include node-internals
`,
      aliases: ['listScripts'],
      run: listScripts
    });

    /*=================================
      Debugger 'shell' command
      ===================================*/
    defineCommand('shell', {
      help: `Enter a debug repl that works like exec

Usage: shell
`,
      aliases: ['repl'],
      run: function() {
        // Don't display any default messages
        const listeners = repl.rli.listeners('SIGINT').slice(0);
        repl.rli.removeAllListeners('SIGINT');

        const oldContext = repl.context;
        console.log(`${Object.keys(repl.context)}`);

        exitDebugRepl = () => {
          // Restore all listeners
          process.nextTick(() => {
            listeners.forEach((listener) => {
              repl.rli.on('SIGINT', listener);
            });
          });

          // Exit debug repl
          repl.eval = controlEval;

          // Swap history
          history.debug = repl.rli.history;
          repl.rli.history = history.control;

          repl.context = oldContext;
          repl.rli.setPrompt('(trepan-ni) ');
          repl.displayPrompt();

          repl.rli.removeListener('SIGINT', exitDebugRepl);
          repl.removeListener('exit', exitDebugRepl);

          exitDebugRepl = null;
        };

        // Exit debug repl on SIGINT
        repl.rli.on('SIGINT', exitDebugRepl);

        // Exit debug repl on repl exit
        repl.on('exit', exitDebugRepl);

        // Set new
        repl.eval = debugEval;
        repl.context = {};

        // Swap history
        history.control = repl.rli.history;
        repl.rli.history = history.debug;

        repl.rli.setPrompt('> ');

        print('Press Ctrl + C to leave debug repl');
        repl.displayPrompt();
      }
    });

    /*=================================
      Debugger 'step' (step in) command
      ===================================*/
    defineCommand('step', {
      connection: true,
      help: `Step program until it reaches a different source line.

Usage: step

Functions that are called in the line are entered.

This command is sommetimes called "step into".

See also:
---------
next, finish, cont, run
`,
      aliases: ['s'],
      run: function() {
        handleResumed();
        return Debugger.stepInto();
      },
    });

    /*=================================
      Debugger 'uwatch' command
      ===================================*/
    defineCommand('unwatch', {
      connection: true,
      help: `Stop watching an expression

Usage: unwatch(expr)
`,
      aliases: [],
      run: function(expr) {
        const index = watchedExpressions.indexOf(expr);

        // Unwatch by expression
        // or
        // Unwatch by watcher number
        watchedExpressions.splice(index !== -1 ? index : +expr, 1);
      }
    });

    /*=================================
      Debugger 'up'
      ===================================*/
    defineCommand('up', {
      connection: true,
      help: `Select and print stack frame that called this one.

Usage: up [count]

An argument says how many frames up to go.

See also:
---------
down, frame
`,
      aliases: [],
      // run: intf.up
      run: up,
    });

    /*=================================
      Debugger 'version' command
      ===================================*/
    defineCommand('version', {
      connection: true,
      help: `Show V8 version.

Usage: version

`,
      aliases: [],
      run: function() {
        return Runtime.evaluate({
          expression: 'process.versions.v8',
          contextId: 1,
          returnByValue: true,
        }).then(({ result }) => {
          print(result.value);
        });
      }
    });

    /*=================================
      Debugger 'watch' command
      ===================================*/
    defineCommand('watch', {
      connection: false,
      help: `Start watching an expression.

Usage: watch(expr)
`,
      aliases: [],
      run: function(expr) {
        watchedExpressions.push(expr);
      }
    });

    /*=================================
      Debugger 'watchers' command
      ===================================*/
    defineCommand('watchers', {
      connection: false,
      help: `Print all watched expressions and their current values

Usage: watchers
`,
      aliases: [],
      run: watchers,
    });
  }

  function initAfterStart() {
    const setupTasks = [
      Runtime.enable(),
      Profiler.enable(),
      Profiler.setSamplingInterval({ interval: 100 }),
      Debugger.enable(),
      Debugger.setPauseOnExceptions({ state: 'none' }),
      Debugger.setAsyncCallStackDepth({ maxDepth: 0 }),
      Debugger.setBlackboxPatterns({ patterns: [] }),
      Debugger.setPauseOnExceptions({ state: pauseOnExceptionState }),
      restoreBreakpoints(),
      Runtime.runIfWaitingForDebugger(),
    ];
    return Promise.all(setupTasks);
  }

  return function startRepl() {
    inspector.client.on('close', () => {
      resetOnStart();
    });
    inspector.client.on('ready', () => {
      initAfterStart();
    });

    const replOptions = {
      prompt: '(trepan-ni) ',
      input: inspector.stdin,
      output: inspector.stdout,
      eval: controlEval,
      useGlobal: false,
      ignoreUndefined: true,
    };

    repl = Repl.start(replOptions); // eslint-disable-line prefer-const
    initializeContext(repl.context);
    repl.on('reset', initializeContext);

    repl.defineCommand('interrupt', () => {
      // We want this for testing purposes where sending CTRL-C can be tricky.
      repl.rli.emit('SIGINT');
    });

    // Init once for the initial connection
    initAfterStart();

    return repl;
  };
}
module.exports = createRepl;
