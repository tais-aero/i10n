'use strict';

var tr = require('L10n').translator;

var dep_1 = require('xxx/yyy');

var str_0 = 'text 1' + 'text # 2\n' +
  "TEXT 3" + "TEXT # 4\n";

var str_1 = tr.msg('текст 1') + tr.msg('text № 2\n') +
  tr.msg("ТЕКСТ 3") + tr.msg("TEXT № 4\n") +
  "TEXT 3" + "TEXT # 4\n";

//------------------------------------------------------------------------------

var str_4 = obj.foo(
  tr.msg('текст 1') + tr.msg('текст № 2\n') +
  tr.msg("ТЕКСТ 3") + tr.msg("ТЕКСТ № 4\n") +
  "TEXT 3" + "TEXT # 4\n"
);

var str_5 = obj.foo(tr.msg('текст 1'));

var str_6 = tr.msg('текст текст текст');

// В RegExp не оборачиваем...
var regexp = /[A-Za-z0-9А-Яа-я]/;

//------------------------------------------------------------------------------
// В комментариях не оборачиваем...

// var str_6 = 'текст 1';

/*
var str_6 = "текст 1";
*/

/*
 * var str_6 = 'текст 1';
 */
