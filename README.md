# trepan-ni

A gdb-like debugger in the trepan debugger family.

This guts of this code is based on (and largely made up of) the nodejs
"node inspect" debugger. However the command-line interface is being
completely reworked.

For an Emacs interface into this debugger see [realgud-trepan-ni](https://github.com/realgud/realgud-trepan-ni) which
is part of the [realgud](https://github.com/realgud/realgud) debugger interface suite.

## Setup:
```bash
$ npm install
```

## Run

```
Usage: trepan-ni script.js
       trepan-ni <host>:<port>
       trepan-ni -p <process-id>
```

#### References

* [Debugger Documentation](https://nodejs.org/api/debugger.html)
* [EPS: `node inspect` CLI debugger](https://github.com/nodejs/node-eps/pull/42)
* [Debugger Protocol Viewer](https://chromedevtools.github.io/debugger-protocol-viewer/)
* [Command Line API](https://developers.google.com/web/tools/chrome-devtools/debug/command-line/command-line-reference?hl=en)
