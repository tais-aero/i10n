'use strict';

var isString = require('lodash/lang/isString');
var toArray = require('lodash/lang/toArray');
var template = require('lodash/string/template');

// -----------------------------------------------------------------------------

var POT = require('src/core/po/pot');

// -----------------------------------------------------------------------------

/**
 * TODO: docs
 */
var TEMPLATE_OPTIONS = {
  interpolate: /{([\s\S]+?)}/g
};

/**
 * Build message key.
 * Builded message key is:
 * `key + CONTEXT_GLUE + context` - if context is present
 * `key` - if context is not present.
 * See `POT.CONTEXT_GLUE`.
 *
 * @param {String} config key.
 * @param {String} [context] context.
 * @returns {String} Builded message key.
 *
 * @example
 *
 * utils.buildMessageKey('hello');
 * // => 'hello'
 *
 * utils.buildMessageKey('hello', 'acclamation');
 * // => 'hello\u0004acclamation'
 *
 */
var buildMessageKey = function(key, context) {
  return context ? key + POT.CONTEXT_GLUE + context : key;
};

/**
 * TODO: docs, test
 */
var unbuildMessageKey = function(messageKey) {
  var args = messageKey.split(POT.CONTEXT_GLUE);
  return {
    key: args[0],
    context: args[1] || null
  };
};

/**
 * TODO: docs, test
 */
var buildMessageArguments = function(/*key, context, data*/) {
  var key = arguments[0];
  var context = arguments[1];
  var data = null;

  key = isString(key) ? key : null;
  context = isString(context) ? context : null;

  var dataIndex = context ? 2 : 1;

  if (arguments.length > dataIndex) {
    if (arguments.length === dataIndex + 1) {
      data = arguments[dataIndex];
    } else {
      data = toArray(arguments).slice(dataIndex);
    }
  }

  return {
    key: key,
    context: context,
    data: data
  };
};

/**
 * Compile and format template.
 *
 * Wrap of: `lodash/string/template`.
 *
 * @param {String} string template.
 * @param {String} options Options object.
 * @param {Object} data Data properties.
 * @returns {String} Formatted template.
 */
// TODO: replace arguments: string, data, options
var formatTemplate = function(string, options, data) {
  var compiled = template(string, options || TEMPLATE_OPTIONS);
  return compiled(data);
};

/**
 * TODO: docs, test
 */
var textLines = function(text) {
  return text.split(/\r?\n/);
};

/**
 * TODO: docs, test
 */
var textLineCount = function(text) {
  return textLines(text).length;
};

/**
 * TODO: docs, test
 */
var toStringIndex = function(text, line, column) {
  var lines = textLines(text);
  var index = 0;

  line--;

  for (var i = 0; i < line; i++) {
    index += lines[i].length;
  }

  return index + column + line;
};

/**
 * TODO: docs, test
 */
var escapeRegExp = function(text) {
  // return text.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// -----------------------------------------------------------------------------

module.exports = {
  buildMessageKey: buildMessageKey,
  unbuildMessageKey: unbuildMessageKey,
  buildMessageArguments: buildMessageArguments,
  formatTemplate: formatTemplate,
  textLines: textLines,
  textLineCount: textLineCount,
  toStringIndex: toStringIndex,
  escapeRegExp: escapeRegExp
};
