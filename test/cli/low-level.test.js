#!/usr/bin/env node
'use strict';
const { test } = require('tap');

const startCLI = require('./start-cli');

test('Debugger agent direct access', (t) => {
  const cli = startCLI(['examples/three-lines.js']);
  const scriptPattern = /\*\s+(\d+):\s+examples(?:\/|\\)three-lines.js/;

  function onFatal(error) {
    cli.quit();
    throw error;
  }

  return cli.waitForInitialBreak()
    .then(() => cli.waitForPrompt())
    .then(() => cli.command('set "autoeval" "js"'))
    .then(() => cli.command('info("files")'))
    .then(() => {
      const [, scriptId] = cli.output.match(scriptPattern);
      return cli.command(
        `Debugger.getScriptSource({ scriptId: '${scriptId}' })`
      );
    })
    .then(() => {
      // t.match(
      //   cli.output,
      //   /scriptSource: '\(function \(/);
      t.match(
        cli.output,
        /let x = 1;/);
    })
    .then(() => cli.quit())
    .then(null, onFatal);
});
