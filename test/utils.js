'use strict';

var util = require('util');

// -----------------------------------------------------------------------------

var Handlebars = require('handlebars');

// -----------------------------------------------------------------------------

var normalizeJson = function(json) {
  return JSON.parse(JSON.stringify(json));
};

var printObject = function(object) {
  return util.inspect(object, false, null, true);
};

var stringifyObject = function(object) {
  return JSON.stringify(object, null, 2);
};

var evalHandlebars = function(template, context) {
  var compiled = Handlebars.compile(template);
  return compiled(context);
};

// -----------------------------------------------------------------------------

module.exports = {
  normalizeJson: normalizeJson,
  printObject: printObject,
  stringifyObject: stringifyObject,
  evalHandlebars: evalHandlebars
};
