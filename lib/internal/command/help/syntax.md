In contrast to *gdb*-like debuggers, debugger commands are given as
JavaScript which is evaluated.

For example, to list a source text starting at line 5, you would
normally type:
```js
list(5)
```

However to make this more like gdb, we provide a lot of syntactic sugar
to make this essentially follow POSIX shell conventions _as well as_
valid JavaScript notation.
So
```
list 5
```
is the same thing as:
```js
list(5)
```

Furthermore, we will add commas before intermediate spaces. So
the following are all the same:

```
list(5,2)
list 5, 2
list 5 2
```

But note that when using string as a parameter, you still need to
quote the string. Therefore in the "help" command use:

```
help '*'
help "*"
help "up"
```

rather than:

```
help *
help up
```

Although using strict JavaScript notation as debugger commands has
some advantages, it is also is not without some drawbacks. The most
notable hidden consequence is that some common *gdb* command names
can't be used because they are JavaScript reserved words. Most
notably: *continue*, *break*, and *eval*.

But some of you may have noticed that you *can* type "break" at a
debugger prompt and that peforms the gdb command to set a breakpoint.

So let me explain how that is done.

There is also an *alias* command. And that does string munging on the line
entered *before* evaluation. So I can catch a *leading* "break"
string, and convert that to the official debugger command name:
`setBreakpoint`. Likewise, a leading "continue" with a space or parenthesis is
converted to the underlying debugger command name `cont`.

Some other input string preprocessing that is done:

If the debugger command string is the empty string, we will use the last
debugger command entered.

If the debugger command takes no arguments, and it is a function rather than
a property, in JavaScript you'd need to supply the empty parenthesis, `()`. We
can detect that and provide the parenthesis here too.

Auto Evaluation
---------------

One of the annoying things in debugger command-line interfaces is the
extra verbiage used to evaluate an expression in the context of the
debugged program. But this is done a lot. And with JavaScript
notation, this becomes more awkward. For example `exec("a+b")` rather
than simply typing `a+b`. Yes, we allow omitting the parenthesis so
`exec "a+b"` is possible. (And note "eval" is an alias for "exec").

But still this is too much. Therefore there is a mode called
"autoeval" which can simplify this situation.

When autoeval is set (and it is set by default), if the first word in
input is not a known debugger command it will treat the line as
something to be evaluated in the debugger context.

We in effect surround the input `...` with `eval('...')`. Therefore,
any strings inside should use double quotes `"`, not single quotes
`'`.

Aside from the string quoting problem mentioned above, there is
another drawback. Suppose you simply mistype a debugger command? If
that happens and autoeval is set on, we can't inform you of the
mistyping. Suppose you type "ls" for "list". You'll get a message
like:

```
ReferenceError: ls is not defined.
    at eval (eval at <anonymous> (gcd.js:1:11), <anonymous>:1:1)
    at Object.<anonymous> (ccd.js:1:11)
    at Module._compile (module.js:649:14)
    at Object.Module._extensions..js (module.js:663:10)
    at Module.load (module.js:565:32)
...
```

If however `autoeval` is off you will get the simple message:

```
Command "ls" not a debugger command.
```

Finally there is one more autoeval kind of setting, "js". This allows
you to evaluate expresions in the context of the debugger, rather than
the debugged program. Testing often uses this. There is a little bit
of fluidity between debugging in the context of the debugger and in
the context of the debugged program, because if you know the right
function to call, you can direct the debugger to query the debugged
program.
