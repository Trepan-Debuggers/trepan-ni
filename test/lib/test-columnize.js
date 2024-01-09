'use strict';
const tap = require('tap');
const columnize = require('../../lib/internal/columnize');
const col = columnize.columnize;

var opts = {displayWidth: 20, colsep: '  '};

tap.equal(col([], opts), '<empty>\n', 'columnize no entries');
tap.equal(col(['oneitem'], opts), 'oneitem\n', 'columnize one entry');
tap.equal(col(['one', 'two', 'three'], opts),
  ('one  two  three\n'), 'columnize one line');
/*
opts = {displayWidth: 4, colsep: '  '};
tap.equal(col(['1', '2', '3', '4'], opts),
          ['1  3\n2  4\n'], 'columnize two lines');
*/
