'use strict';

var Handlebars = require('handlebars');

var toArray = require('lodash/lang/toArray');

// -----------------------------------------------------------------------------

var translator = require('src/translator');

// -----------------------------------------------------------------------------

/**
 * TODO:
 *
 * `MSG key[, context][, data]`
 *
 */
module.exports = function(/*key, context, data*/) {
  var args = toArray(arguments).slice(0, arguments.length - 1);
  var message = translator.message.apply(translator, args);

  return new Handlebars.SafeString(message);
};
