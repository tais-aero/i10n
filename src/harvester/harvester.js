'use strict';

var isString = require('lodash/lang/isString');
var cloneDeep = require('lodash/lang/cloneDeep');
var merge = require('lodash/object/merge');
var get = require('lodash/object/get');
var set = require('lodash/object/set');
var drop = require('lodash/array/drop');
var each = require('lodash/collection/each');
var reduce = require('lodash/collection/reduce');
var includes = require('lodash/collection/includes');
var filter = require('lodash/collection/filter');
var sortBy = require('lodash/collection/sortBy');
var repeat = require('lodash/string/repeat');

var Handlebars = require('handlebars');
var parse5 = require('parse5');
var acorn = require('acorn');
var luaparse = require('luaparse');
var escodegen = require('escodegen');
var astTraverse = require('ast-traverse');

var glob = require('glob');
var fs = require('fs-extra');
var path = require('path');

var child_process = require('child_process');
var execSync = child_process.execSync;
var stream = require('stream');

var readlineSync = require('readline-sync');
var chalk = require('chalk');

// -----------------------------------------------------------------------------

var utils = require('src/core/utils');
var poUtils = require('src/core/po/utils');
var POT = require('src/core/po/pot');

// -----------------------------------------------------------------------------

// links:
// https://astexplorer.net/

// TEMP:
// var testUtils = require('test/utils');

// -----------------------------------------------------------------------------

var DEFAULT_ENCODING = 'utf-8';

var RU_TEXT_REGEXP = /[№а-я]/i;

var HANDLEBARS_REGEXP = /{{!--[\s\S]+?--}}|{{[\s\S]+?}}/g;
var HANDLEBARS_MASK_CHAR = '\u2060'; // WORD JOINER
var HANDLEBARS_UNMASK_REGEXP = /[^\u2060]+/g;

var DEFAULT_MESSAGE_CONTEXT = 'L10N_CONTEXT';

/**
 * Default config
 * TODO: docs
 */
// TODO: unify hbs & js parse options
// TODO: hbs & js aliases
var DEFAULT_CONFIG = {
  POT_FILE_NAME: 'messages.pot',
  PO_FILE_EXT: 'po',

  // see textStyle function
  colors: {
    light: 'gray',
    info: 'blue',
    warning: 'red',
    candidateToWrap: 'magenta.bgWhiteBright.bold',
    wrapped: 'gray'
  },

  js: {
    nodeTypes: [ 'CallExpression' ],
    nodeCalleeObjectNames: [ 'translator', 'tr' ],
    nodeCalleePropertyNames: [ 'message', 'msg' ],
    messageKey: {
      index: 0,
      types: [ 'Literal', 'BinaryExpression' ]
    },
    messageContext: {
      index: 1,
      types: [ 'Literal', 'BinaryExpression' ]
    },
    wrap: {
      nodeTypes: [ 'Literal' ],
      wrapTargetRegExp: RU_TEXT_REGEXP,
      concatOperator: ' + ',
      excludes: {
        properties: [ 'key', 'property', 'test' ],
        nodeTypes: [ 'LogicalExpression' ],
        operators: [ '==', '===', '!=', '!==' ],
        callees: [ 'require' ]
      }
    }
  },

  lua: {
    nodeTypes: [ 'CallExpression' ],
    nodeCalleeObjectNames: [ 'translator', 'tr' ],
    nodeCalleePropertyNames: [ 'message', 'msg' ],
    messageKey: {
      index: 0,
      types: [ 'StringLiteral', 'BinaryExpression' ]
    },
    messageContext: {
      index: 1,
      types: [ 'StringLiteral', 'BinaryExpression' ]
    },
    wrap: {
      nodeTypes: [ 'StringLiteral' ],
      wrapTargetRegExp: RU_TEXT_REGEXP,
      concatOperator: ' .. ',
      excludes: {
        properties: [ 'key', 'index', 'condition' ],
        nodeTypes: [ 'LogicalExpression' ],
        operators: [ '==', '~=' ],
        callees: [ 'require', 'dofile', 'pcall' ]
      }
    }
  },

  handlebars: {
    nodeTypes: [ 'MustacheStatement', 'SubExpression' ],
    nodePaths: [ 'MSG' ],
    messageKey: {
      index: 0,
      types: [ 'StringLiteral' ]
    },
    messageContext: {
      index: 1,
      types: [ 'StringLiteral' ]
    },
    wrap: {
      nodeTypes: [ 'StringLiteral' ],
      wrapTargetRegExp: RU_TEXT_REGEXP,
      excludes: {
        properties: [ 'path' ],
        nodeTypes: [ ]
      }
    }
  }
};

var textStyle = function(style) {
  return get(chalk, style);
};

/**
 * AbortedByUserError class
 */
var AbortedByUserError = function() {
  Error.call(this) ;

  this.name = 'AbortedByUserError';
  this.message = 'Aborted by user';

  // No stack
  // if (Error.captureStackTrace) {
  //   Error.captureStackTrace(this, AbortedByUserError);
  // } else {
  //   this.stack = (new Error()).stack;
  // }
};

AbortedByUserError.prototype = Object.create(Error.prototype);

/**
 * Harvester class
 */
var Harvester = function() {
  this.setConfig();
};

Harvester.prototype = {
  /**
   * Set config.
   * Merge setted config with default config.
   * See `DEFAULT_CONFIG`.
   *
   * @param {Object} config config.
   * @returns {Object} New config.
   */
  setConfig: function(config) {
    this._config = merge({}, DEFAULT_CONFIG, config);
    return this._config;
  },

  /**
   * Get Harvester config.
   *
   * @returns {Object} Current Harvester config.
   */
  getConfig: function() {
    return this._config;
  },

  /**
   * Collect keyItems from files
   *
   * @param {Object} [options={}] The options object.
   * @param {Object} [options.keyItems={}]
   *  TODO
   * @param {String} [options.cwd]
   *  TODO
   * @param {String} [options.pattern]
   *  TODO
   * @param {Array} [options.excludes]
   *  TODO
   * @param {Function} [options.getFileType]
   *  TODO
   * @param {Function} [options.transformFile]
   *  TODO
   * @param {Function} [options.transformKey]
   *  TODO
   */
  collectKeyItemsFromFiles: function(options) {
    options = options || {};
    var keyItems = options.keyItems || {};

    var me = this;
    var files = glob.sync(options.pattern, {
      cwd: options.cwd,
      ignore: options.excludes,
      nodir: true
    });

    var byFileTypes = {
      'js': me.collectKeyItemsFromJs,
      'lua': me.collectKeyItemsFromLua,
      'handlebars': me.collectKeyItemsFromHandlebarsTemplate
    };

    var executeCollectKeyItems = function(func, file, content) {
      func.call(me, {
        keyItems: keyItems,
        input: content,
        file: file,
        transformKey: options.transformKey
      });
    };

    files.forEach(function(file) {
      var type = path.extname(file).toLowerCase().replace('.', '');

      if (options.getFileType) {
        type = options.getFileType(file, type);
      }

      var byFileType = byFileTypes[type];

      if (!byFileType) {
        return;
      }

      var content;

      try {
        content = me._readFileRelative(options.cwd, file);
      } catch (e) {
        // TODO: best way for logging
        console.log('Error:', e);
        return;
      }

      if (options.transformFile) {
        content = options.transformFile(content, file);
      }

      executeCollectKeyItems(byFileType, file, content);
    });

    return keyItems;
  },

   /**
    * Collect keyItems from Handlebars template
    *
    * @param {Object} [options={}] The options object.
    * @param {Object} [options.keyItems={}]
    *  TODO
    * @param {String} [options.input]
    *  TODO
    * @param {String} [options.file]
    *  TODO
    * @param {Function} [options.transformKey]
    *  TODO
    */
  collectKeyItemsFromHandlebarsTemplate: function(options) {
    var keyItems = options.keyItems || {};

    var me = this;
    var config = me._config.handlebars;
    var ast = me._parseHandlebarsTemplate(options.input);

    astTraverse(ast, {
      pre: function(node) {
        if (me._isHandlebarsMessageHelper(node)) {
          var keyItem = me._extractKeyItemFromHandlebarsNode(
            node, config, options.transformKey
          );

          me._setKeyItemLocationSrc(keyItem, options.file);
          me._pushKeyItem(keyItems, keyItem);
        }
      }
    });

    return keyItems;
  },

  /**
   * Collect keyItems from JS
   *
   * @param {Object} [options={}] The options object.
   * @param {Object} [options.keyItems={}]
   *  TODO
   * @param {String} [options.input]
   *  TODO
   * @param {String} [options.file]
   *  TODO
   * // @param {Function} [options.transformKey]
   * //  TODO
   */
  collectKeyItemsFromJs: function(options) {
    var keyItems = options.keyItems || {};

    var me = this;
    var config = me._config.js;
    var ast = me._parseJs(options.input);

    astTraverse(ast, {
      pre: function(node) {
        if (me._isJsMessage(node)) {
          var keyItem = me._extractKeyItemFromJsNode(node, config);
          me._setKeyItemLocationSrc(keyItem, options.file);
          me._pushKeyItem(keyItems, keyItem);
        }
      }
    });

    return keyItems;
  },

  /**
   * Collect keyItems from Lua
   *
   * @param {Object} [options={}] The options object.
   * @param {Object} [options.keyItems={}]
   *  TODO
   * @param {String} [options.input]
   *  TODO
   * @param {String} [options.file]
   *  TODO
   * // @param {Function} [options.transformKey]
   * //  TODO
   */
  collectKeyItemsFromLua: function(options) {
    var keyItems = options.keyItems || {};

    var me = this;
    var config = me._config.lua;
    var ast;

    try {
      ast = me._parseLua(options.input);
    } catch (e) {
      // TODO: best way for logging
      console.log('Error:', e);
      return keyItems;
    }

    astTraverse(ast, {
      pre: function(node) {
        if (me._isLuaMessage(node)) {
          var keyItem = me._extractKeyItemFromLuaNode(node, config);
          me._setKeyItemLocationSrc(keyItem, options.file);
          me._pushKeyItem(keyItems, keyItem);
        }
      }
    });

    return keyItems;
  },

  /**
   * Build PO files
   *
   * @param {Object} [options={}] The options object.
   * @param {Object} [options.keyItems={}]
   *  TODO
   * @param {Array} [options.locales]
   *  TODO
   * @param {String} [options.poFileDir]
   *  TODO
   * @param {Array} [options.poFileBaseName]
   *  TODO
   */
   // TODO: normalize PO after msgmerge
  buildPoFiles: function(options) {
    var me = this;

    var potFile = me._createPotFile(options.keyItems, options.poFileDir);

    options.locales.forEach(function(locale) {
      var poFile = path.resolve(
        options.poFileDir,
        options.poFileBaseName + locale + '.' + me._config.PO_FILE_EXT
      );

      // create empty po by locale, if not exists
      if (!fs.existsSync(poFile)) {
        var po = me._createPo(null, locale);
        fs.outputFileSync(poFile, po);
      }

      // execute msgmerge
      var command = utils.formatTemplate(
        'msgmerge -U -v -s --no-fuzzy-matching --no-wrap {poFile} {potFile}',
        null, {
          poFile: poFile,
          potFile: potFile
        }
      );

      execSync(command);
    });
  },

  /**
   * Wrap translation texts in files
   *
   * @param {Object} [options={}] The options object.
   * @param {String} [options.cwd]
   *  TODO
   * @param {String} [options.pattern]
   *  TODO
   * @param {Array} [options.excludes]
   *  TODO
   * @param {Object} [options.byTypeWrapOptions]
   *  TODO
   * @param {Function} [options.resultCallback]
   *  TODO
   * @param {Boolean} [options.verbose=false]
   *  TODO
   */
  wrapTranslationTextsInFiles: function(options) {
    var me = this;
    var colors = me._config.colors;

    var byFileTypes = {
      'js': me.wrapTranslationTextsInJsFile,
      'lua': me.wrapTranslationTextsInLuaFile,
      'handlebars': me.wrapTranslationTextsInHandlebarsFile
    };

    var result = {
      stat: {
        counts: {
          wrappedTexts: 0
        }
      },
      files: []
    };

    var doResult = function(err, abort) {
      options.resultCallback(err || null, result, abort);
    };

    var executeWrapTranslationTextsInFile = function(func, file, wrapOptions,
                                                     callback) {
      func.call(me, path.resolve(options.cwd, file), wrapOptions, function(r) {
        result.stat.counts.wrappedTexts += r.stat.counts.wrappedTexts;

        if (options.verbose) {
          result.files.push({
            name: file,
            stat: r.stat
          });
        }

        callback();
      });
    };

    var files = glob.sync(options.pattern, {
      cwd: options.cwd,
      ignore: options.excludes,
      nodir: true
    });

    var fileCount = 0;

    if (options.verbose) {
      console.log(
        textStyle(colors.info)('Files to process:'),
        textStyle(colors.info)(files.length)
      );
    }

    var globber = new glob.Glob(options.pattern, {
      cwd: options.cwd,
      ignore: options.excludes,
      nodir: true
    });

    globber
      .on('match', function(file) {
        fileCount++;

        var type = path.extname(file).toLowerCase().replace('.', '');
        var byFileType = byFileTypes[type];

        if (options.verbose) {
          console.log(textStyle(colors.info)(utils.formatTemplate(
            'Processing file: {current} of {all}', null, {
              current: fileCount,
              all: files.length
            }
          )));
          console.log(
            textStyle(colors.info)(file),
            textStyle(colors.info)('...')
          );
        }

        if (!byFileType) {
          return;
        }

        var wrapOptions = options.byTypeWrapOptions[type];

        if (options.verbose && wrapOptions.prompt) {
          console.log('\n');
          console.log(
            'Interactive wrap:\n',
            ' ' + textStyle(colors.candidateToWrap)('Message') +
                  ' - candidate to wrap\n',
            ' ' + textStyle(colors.wrapped)(utils.formatTemplate(
                "{translator}.{message}('Message')", null, {
                  translator: wrapOptions.translator,
                  message: wrapOptions.message
                }
              )) + ' - wrapped\n',
            '\n',
            ' Keys:\n',
            '   y - wrap\n',
            '   n - no wrap\n',
            '   c - wrap within context'
          );
          if (wrapOptions.controlMessages) {
            console.log(
              '    q - custom message'
            );
          }
          console.log(
            '    x - abort\n'
          );
        }

        globber.pause();

        try {
          executeWrapTranslationTextsInFile(byFileType, file, wrapOptions,
            function() {
              globber.resume();
            }
          );
        } catch (e) {
          if (e instanceof AbortedByUserError) {
            globber.abort();
            return;
          }
          // TODO: best way for logging
          console.log('Error:', e);
          globber.resume();
        }
      })
      .on('abort', function() {
        doResult(null, true);
      })
      .on('error', function() {
        doResult(true);
      })
      .on('end', function() {
        doResult();
      });

    return true;
  },

  /**
   * TODO: docs
   */
  wrapTranslationTextsInJsFile: function(filePath, options, resultCallback) {
    var input = this._readFile(filePath);
    var result = this.wrapTranslationTextsInJs(input, options);

    this._printParseFileResult(result, filePath, 'Parse JS file error...');

    if (result.stat.counts.wrappedTexts) {
      this._writeFile(filePath, result.wrapped);
    }

    resultCallback(result);
  },

  /**
   * TODO: docs
   */
  wrapTranslationTextsInLuaFile: function(filePath, options, resultCallback) {
    var input = this._readFile(filePath);
    var result = this.wrapTranslationTextsInLua(input, options);

    this._printParseFileResult(result, filePath, 'Parse Lua file error...');

    if (result.stat.counts.wrappedTexts) {
      this._writeFile(filePath, result.wrapped);
    }

    resultCallback(result);
  },

  /**
   * TODO: docs
   */
  wrapTranslationTextsInHandlebarsFile: function(filePath, options,
                                                 resultCallback) {
    var me = this;
    var input = me._readFile(filePath);

    this.wrapTranslationTextsInHandlebars(input, options, function(result) {
      if (result.stat.counts.wrappedTexts) {
        me._writeFile(filePath, result.wrapped);
      }

      resultCallback(result);
    });
  },

  /**
   * TODO: docs
   */
  // TODO: deduplicate code, see: wrapTranslationTextsInLua
  wrapTranslationTextsInJs: function(input, options, _inline) {
    var me = this;
    var wrapConfig = me._config.js.wrap;
    var offset = 0;
    var translatorIsDeclared = false;
    var isWrapped = false;
    var parseError = null;
    var ast = null;
    var _skip = false;

    try {
      ast = me._parseJs(input);
    } catch (e) {
      parseError = e;
    }

    var stat = {
      counts: {
        wrappedTexts: 0
      }
    };

    astTraverse(ast, {
      pre: function(node) {
        var skip = options.skipNode ? options.skipNode(node) : false;

        if (!skip && me._isNeedWrapJs(node)) {
          var start = node.start + offset;
          var end = node.end + offset;

          var before = input.substr(0, start);
          var after = input.substr(end);

          var literal = node.raw;
          var wrapped;

          try {
            wrapped = me._getWrapped(
              literal, before, after, wrapConfig, options,
              _inline, me.wrapTranslationTextsInJs
            );
          } catch (e) {
            if (e instanceof AbortedByUserError) {
              throw e;
            }
            console.log(e);
            wrapped = {
              text: literal,
              offset: 0,
              count: 0
            };
          }

          input = before + wrapped.text + after;

          offset += wrapped.offset;

          if (wrapped.count) {
            stat.counts.wrappedTexts += wrapped.count;
            isWrapped = true;
          }

          _skip = wrapped._skip;
        }

        if (node.type === 'CallExpression' &&
            get(node, 'callee.type') === 'Identifier' &&
            // TODO: FIXME:
            get(node, 'arguments[0].value') === options.translatorRequire) {
          translatorIsDeclared = true;
        }
      },

      skipProperty: function(property, node) {
        var skip =
          options.skipProperty ? options.skipProperty(property, node) : false;

        skip = skip || (property === 'arguments' && (
            includes(wrapConfig.excludes.callees, get(node, 'callee.name')) ||
            includes(
              wrapConfig.excludes.callees, get(node, 'callee.property.name')
            )
        ));

        skip = skip ||
          includes(wrapConfig.excludes.properties, property) ||
          includes(wrapConfig.excludes.nodeTypes, node.type) ||
          includes(wrapConfig.excludes.operators, node.operator) ||
          me._isJsMessage(node);

        return skip;
      }
    });

    if (!_inline && isWrapped && !translatorIsDeclared &&
        options.translatorRequireTemplate) {
      var translatorDeclare = utils.formatTemplate(
        options.translatorRequireTemplate, null, {
          translator: options.translator,
          translatorRequire: options.translatorRequire
        }
      );

      var useStrict = 'use strict';
      var useStrictIndex = input.indexOf(useStrict);

      if (useStrictIndex > 0) {
        var cutIndex = useStrictIndex + useStrict.length + 2;

        input =
          input.substr(0, cutIndex) +
          '\n\n' + translatorDeclare +
          input.substr(cutIndex);
      } else {
        input = translatorDeclare + '\n\n' + input;
      }
    }

    return {
      wrapped: input,
      stat: stat,
      parseError: parseError,
      _skip: _skip
    };
  },

  /**
   * TODO: docs
   */
  // TODO: deduplicate code, see: wrapTranslationTextsInJs
  wrapTranslationTextsInLua: function(input, options, _inline) {
    var me = this;
    var wrapConfig = me._config.lua.wrap;
    var offset = 0;
    var translatorIsDeclared = false;
    var isWrapped = false;
    var parseError = null;
    var ast = null;
    var _skip = false;

    try {
      ast = me._parseLua(input);
    } catch (e) {
      parseError = e;
    }

    var stat = {
      counts: {
        wrappedTexts: 0
      }
    };

    astTraverse(ast, {
      pre: function(node) {
        var skip = options.skipNode ? options.skipNode(node) : false;

        if (!skip && me._isNeedWrapLua(node)) {
          var start = node.range[0] + offset;
          var end = node.range[1] + offset;

          var before = input.substr(0, start);
          var after = input.substr(end);

          var literal = node.raw;
          var wrapped;

          try {
            wrapped = me._getWrapped(
              literal, before, after, wrapConfig, options,
              _inline, me.wrapTranslationTextsInLua
            );
          } catch (e) {
            if (e instanceof AbortedByUserError) {
              throw e;
            }
            console.log(e);
            wrapped = {
              text: literal,
              offset: 0,
              count: 0
            };
          }

          input = before + wrapped.text + after;

          offset += wrapped.offset;

          if (wrapped.count) {
            stat.counts.wrappedTexts += wrapped.count;
            isWrapped = true;
          }

          _skip = wrapped._skip;
        }

        if (node.type === 'CallExpression' &&
            get(node, 'base.type') === 'Identifier' &&
            // TODO: FIXME:
            get(node, 'arguments[0].value') === options.translatorRequire) {
          translatorIsDeclared = true;
        }
      },

      skipProperty: function(property, node) {
        var skip =
          options.skipProperty ? options.skipProperty(property, node) : false;

        skip = skip || ((
              property === 'arguments' || property === 'argument'
            ) && (
            includes(
              wrapConfig.excludes.callees, get(node, 'base.identifier.name')
            ) ||
            includes(
              wrapConfig.excludes.callees, get(node, 'base.name')
            )
        ));

        skip = skip ||
          includes(wrapConfig.excludes.properties, property) ||
          includes(wrapConfig.excludes.nodeTypes, node.type) ||
          includes(wrapConfig.excludes.operators, node.operator) ||
          me._isLuaMessage(node);

        return skip;
      }
    });

    if (!_inline && isWrapped && !translatorIsDeclared &&
        options.translatorRequireTemplate) {
      var translatorDeclare = utils.formatTemplate(
        options.translatorRequireTemplate, null, {
          translator: options.translator,
          translatorRequire: options.translatorRequire
        }
      );

      input = translatorDeclare + '\n\n' + input;
    }

    return {
      wrapped: input,
      stat: stat,
      parseError: parseError,
      _skip: _skip
    };
  },

  /**
   * TODO: docs
   */
  prepareControlMessages: function(controlMessages, options) {
    options = options || {};

    var messages = sortBy(
      reduce(
        controlMessages,
        function(result, originalValue, message) {
          var include = options.filter ?
            options.filter(message, originalValue) : true;

          if (include) {
            result.push({
              message: message,
              _originalValue: originalValue,
              counts: {
                candidate: 0,
                wrapped: 0
              }
            });
          }

          return result;
        },
        []
      ),
      function(messageInfo) {
        if (options.sorter) {
          return options.sorter(
            messageInfo.message, messageInfo._originalValue
          );
        }
        return -messageInfo.message.length;
      }
    );

    return messages;
  },

  _addCustomMessageToControlMessages: function(customMessageInfo,
                                               controlMessages) {
    controlMessages.push(customMessageInfo);
    return sortBy(
      controlMessages,
      function(messageInfo) {
        return -messageInfo.message.length;
      }
    );
  },

  _getWrapped: function(literal, before, after, wrapConfig, options,
                        _inline, _wrappFunc) {
    var me = this;
    var colors = me._config.colors;
    var wrapBefore = options.translator + '.' + options.message + '(';
    var wrapAfter = ')';

    var isWrap = options.controlMessages ? false : true;
    var text = literal;
    var count = 0;
    var _skip = false;

    var prompt, contextArg;

    // TODO: checkSpaces

    if (isWrap) {
      prompt = me._promptWrap(
        literal, '', '', [ before ], [ after ], null, options
      );

      if (prompt.wrap) {
        contextArg =
          prompt.context ? (", '" + prompt.context + "'") : '';

        text = wrapBefore + literal + contextArg + wrapAfter;
        count = 1;
      }
    } else {
      var quotes = me._getQuotes(literal);

      var inlineControlMessages = get(_inline, 'controlMessages');

      var remainsControlMessages = get(_inline, 'remainsControlMessages') ||
        filter(
          options.controlMessages,
          function(messageInfo) {
            return literal.indexOf(messageInfo.message) !== -1;
          }
        );

      var controlMessages = inlineControlMessages || remainsControlMessages;

      if (controlMessages.length > 0) {
        var messageInfo = controlMessages[0];
        var custom = false;
        var customMessageInfo = {
          message: null,
          counts: {
            candidate: 0,
            wrapped: 0
          }
        };

        while (true) {
          var message = messageInfo.message;
          var inlineExpLeft = 'x=';

          // WARN: don't use formatTemplate
          var bound = '([^' + options.boundExcludeChar + '])';
          var regexp = new RegExp(
            bound + '(' + utils.escapeRegExp(message) + ')' + bound,
            'g'
          );

          var dIndex = 1; // = [^{boundExcludeChar}] length
          var reResult = null;

          while ((reResult = regexp.exec(text))) {
            var index = reResult.index;
            var match = reResult[0];
            var pl = reResult[1];
            var p = reResult[2];
            var pr = reResult[3];

            messageInfo.counts.candidate++;

            if (customMessageInfo.message) {
              console.log(textStyle(colors.info)(
                '\nTrying with your message...'
              ));
            }

            prompt = me._promptWrap(
              p,
              text.substr(0, index + pl.length),
              text.substr(index + p.length + pl.length),
              _inline ?
                [ _inline.before, before.substr(inlineExpLeft.length) ] :
                [ before ],
              _inline ?
                [ after, _inline.after ] :
                [ after ],
              remainsControlMessages,
              options
            );

            if (prompt.skip) {
              _skip = true;
              break;
            } else {
              _skip = false;
            }

            if (prompt.custom) {
              custom = true;
              break;
            } else {
              custom = false;
            }

            if (!prompt.wrap) {
              regexp.lastIndex -= dIndex;
              continue;
            }

            var concatLeft =
              index > quotes.left.length - 1 ?
                quotes.right + wrapConfig.concatOperator : '';

            var left = concatLeft ?
              (pl + concatLeft + wrapBefore + quotes.left) :
              wrapBefore + quotes.left;

            var concatRight =
              index + p.length <
              text.length - quotes.right.length - 1 ?
                wrapConfig.concatOperator + quotes.left : '';

            var right = concatRight ?
              (quotes.right + wrapAfter + concatRight + pr) :
              quotes.right + wrapAfter;

            contextArg = prompt.context ?
              (quotes.right + ', ' + quotes.left + prompt.context) :
              '';

            var replaced = left + p + contextArg + right;

            text =
              text.substr(
                0, index - (concatLeft ? 0 : quotes.left.length - 1)
              ) +
              replaced +
              text.substr(
                (concatRight ? 0 : quotes.right.length - 1) +
                  index + match.length
              );

            regexp.lastIndex = index + replaced.length - dIndex;

            count++;
            messageInfo.counts.wrapped++;

            if (customMessageInfo.message) {
              options.controlMessages = me._addCustomMessageToControlMessages(
                cloneDeep(customMessageInfo), options.controlMessages
              );
            }
          }

          if (_skip) {
            break;
          }

          if (custom) {
            if (!reResult) {
              console.log(
                textStyle(colors.warning)(
                  '\nYour message is not matched.'
                ),
                textStyle(colors.warning)(
                  'Repeat with candidate of message...'
                )
              );

              customMessageInfo.message = null;
              messageInfo = controlMessages[0];
              custom = false;
            } else {
              customMessageInfo.message = readlineSync.question(
                textStyle(colors.info)('\nEnter your message...\n')
              );

              messageInfo = customMessageInfo;
            }
          } else {
            break;
          }
        }

        if (!_skip) {
          if (customMessageInfo.message) {
            console.log(textStyle(colors.info)(
              '\n...end of trying with your message.'
            ));
          }

          each(controlMessages, function(m, i) {
            if (i === 0) {
              return;
            }

            var inlineResult = _wrappFunc.call(
              me,
              inlineExpLeft + text,
              options,
              {
                controlMessages: [ m ],
                remainsControlMessages: drop(remainsControlMessages, i),
                before: before,
                after: after
              }
            );

            if (inlineResult._skip) {
              return false;
            }

            text = inlineResult.wrapped.substr(inlineExpLeft.length);
            count += inlineResult.stat.counts.wrappedTexts;
          });
        }
      }
    }

    return {
      text: text,
      offset: text.length - literal.length,
      count: count,
      _skip: _skip
    };
  },

  _promptWrap: function(message, left, right, befores, afters,
                        controlMessages, options) {
    if (!options.prompt) {
      return {
        wrap: true,
        context: false
      };
    }

    var colors = this._config.colors;

    var wrappedPattern = utils.formatTemplate(
      '{translator}.{message}\\([\\s\\S]+?\\)', null, {
      translator: options.translator,
      message: options.message
    });

    var wrappedReplacer = function(match) {
      return textStyle(colors.wrapped)(match);
    };

    var wrappedRegexp = new RegExp(wrappedPattern, 'g');

    var baseBefore = befores[0];
    var before = befores.slice(1).join('');

    var baseAfter = afters[afters.length - 1];
    var after = afters.slice(0, afters.length - 1).join('');

    var beforeCrIndex = baseBefore.lastIndexOf('\n');
    var beforeFragment = (
      baseBefore.substr(beforeCrIndex !== -1 ? beforeCrIndex + 1 : 0) +
      before
    ).replace(wrappedRegexp, wrappedReplacer);

    var afterCrIndex = baseAfter.indexOf('\n');
    var afterFragment = (
      after +
      baseAfter.substr(
        0, afterCrIndex !== -1 ? afterCrIndex : baseAfter.length
      )
    ).replace(wrappedRegexp, wrappedReplacer);

    // WARN: don't use formatTemplate
    var messageFragment =
      left.replace(wrappedRegexp, wrappedReplacer) +
      textStyle(colors.candidateToWrap)(message) +
      right.replace(wrappedRegexp, wrappedReplacer);

    var query =
      textStyle(colors.light)(
        '\n' +
        repeat('-', 80) + ' line ' + utils.textLineCount(baseBefore) +
        '\n\n'
      ) +
      beforeFragment + messageFragment + afterFragment +
      textStyle(colors.light)(
        controlMessages ?
          ('\n\n...\n' + message + '\n? ') : ('\n\n...? ')
      );

    var printControlMessages = function() {
      console.log('');
      controlMessages.forEach(function(messageInfo) {
        console.log(textStyle(colors.light)(messageInfo.message));
      });
      console.log('');
    };

    var next;
    var key;

    do {
      next = false;
      key = readlineSync.keyIn(query, {
        limit: controlMessages ? 'yncql>x' : 'yncx',
        caseSensitive: true
      });

      if (key === 'l') {
        printControlMessages();
        readlineSync.keyInPause('', {
          limit: ' ',
          guide: false
        });
        next = true;
      }

      if (key === 'x') {
        if (readlineSync.keyInYN('Do you want abort?')) {
          throw new AbortedByUserError();
        } else {
          next = true;
        }
      }
    } while (next);

    return {
      wrap: key === 'y' || key === 'c',
      context: key === 'c' ? DEFAULT_MESSAGE_CONTEXT : false,
      custom: key === 'q',
      skip: key === '>'
    };
  },

  _getQuotes: function(literal) {
    var r;
    var left = "'";
    var right = left;

    if (literal[0] === '"') {
      left = right = '"';
    // TODO: ?
    // } else if (literal.indexOf('[[') === 0) {
    //   left = '[[';
    //   right = ']]';
    } else if ((r = /^\[(=*)\[/.exec(literal))) {
      left = '[' + r[1] + '[';
      right = ']' + r[1] + ']';
    }

    return {
      left: left,
      right: right
    };
  },

  // @Deprecated
  __deprecated__wrapTranslationTextsInJs: function(input, options) {
    var me = this;
    var wrapConfig = me._config.js.wrap;
    var wrapBefore = options.translator + '.' + options.message + '(';
    var wrapAfter = ')';
    var concat = ' + ';
    var offset = 0;
    var offsetInc = wrapBefore.length + wrapAfter.length;
    var translatorIsDeclared = false;
    var isWrapped = false;
    var parseError = null;
    var ast = null;

    try {
      ast = me._parseJs(input);
    } catch (e) {
      parseError = e;
    }

    var stat = {
      counts: {
        wrappedTexts: 0
      }
    };

    astTraverse(ast, {
      pre: function(node) {
        var skip = options.skipNode ? options.skipNode(node) : false;

        if (!skip && me._isNeedWrapJs(node)) {
          var start = node.start + offset;
          var end = node.end + offset;

          var before = input.substr(0, start);
          var after = input.substr(end);

          var spacesBefore = '';
          var spacesAfter = '';

          var literal;

          if (options.checkSpaces) {
            literal = node.raw.replace(
              /^["'](\s+)|(\s+)["']$/g,
              function(match, leading, trailing) {
                var quote = node.raw[0];

                if (leading) {
                  spacesBefore = quote + leading + quote + concat;
                  offset += concat.length + 2;
                  return quote;
                }

                if (trailing) {
                  spacesAfter = concat + quote + trailing + quote;
                  offset += concat.length + 2;
                  return quote;
                }

                return match;
              }
            );
          } else {
            literal = node.raw;
          }

          input =
            before + spacesBefore +
            wrapBefore + literal + wrapAfter +
            spacesAfter + after;

          offset += offsetInc;

          stat.counts.wrappedTexts++;

          isWrapped = true;
        }

        if (node.type === 'CallExpression' &&
            get(node, 'callee.type') === 'Identifier' &&
            // TODO: FIXME:
            get(node, 'arguments[0].value') === options.translatorRequire) {
          translatorIsDeclared = true;
        }
      },

      skipProperty: function(property, node) {
        var skip =
          options.skipProperty ? options.skipProperty(property, node) : false;

        skip = skip || (property === 'arguments' && (
            includes(wrapConfig.excludes.callees, get(node, 'callee.name')) ||
            includes(
              wrapConfig.excludes.callees, get(node, 'callee.property.name')
            )
        ));

        skip = skip ||
          includes(wrapConfig.excludes.properties, property) ||
          includes(wrapConfig.excludes.nodeTypes, node.type) ||
          includes(wrapConfig.excludes.operators, node.operator) ||
          me._isJsMessage(node);

        return skip;
      }
    });

    if (isWrapped && !translatorIsDeclared &&
        options.translatorRequireTemplate) {
      var translatorDeclare = utils.formatTemplate(
        options.translatorRequireTemplate, null, {
          translator: options.translator,
          translatorRequire: options.translatorRequire
        }
      );

      var useStrict = 'use strict';
      var useStrictIndex = input.indexOf(useStrict);

      if (useStrictIndex > 0) {
        var cutIndex = useStrictIndex + useStrict.length + 2;

        input =
          input.substr(0, cutIndex) +
          '\n\n' + translatorDeclare +
          input.substr(cutIndex);
      } else {
        input = translatorDeclare + '\n\n' + input;
      }
    }

    return {
      wrapped: input,
      stat: stat,
      parseError: parseError
    };
  },

  // @Deprecated
  __deprecated__wrapTranslationTextsInLua: function(input, options) {
    var me = this;
    var wrapConfig = me._config.lua.wrap;
    var wrapBefore = options.translator + '.' + options.message + '(';
    var wrapAfter = ')';
    var concat = ' + ';
    var offset = 0;
    var offsetInc = wrapBefore.length + wrapAfter.length;
    var translatorIsDeclared = false;
    var isWrapped = false;
    var parseError = null;
    var ast = null;

    try {
      ast = me._parseLua(input);
    } catch (e) {
      parseError = e;
    }

    var stat = {
      counts: {
        wrappedTexts: 0
      }
    };

    astTraverse(ast, {
      pre: function(node) {
        var skip = options.skipNode ? options.skipNode(node) : false;

        if (!skip && me._isNeedWrapLua(node)) {
          var start = node.range[0] + offset;
          var end = node.range[1] + offset;

          var before = input.substr(0, start);
          var after = input.substr(end);

          var spacesBefore = '';
          var spacesAfter = '';

          var literal;

          if (options.checkSpaces) {
            literal = node.raw.replace(
              /^["'](\s+)|(\s+)["']$/g,
              function(match, leading, trailing) {
                var quote = node.raw[0];

                if (leading) {
                  spacesBefore = quote + leading + quote + concat;
                  offset += concat.length + 2;
                  return quote;
                }

                if (trailing) {
                  spacesAfter = concat + quote + trailing + quote;
                  offset += concat.length + 2;
                  return quote;
                }

                return match;
              }
            );
          } else {
            literal = node.raw;
          }

          input =
            before + spacesBefore +
            wrapBefore + literal + wrapAfter +
            spacesAfter + after;

          offset += offsetInc;

          stat.counts.wrappedTexts++;

          isWrapped = true;
        }

        if (node.type === 'CallExpression' &&
            get(node, 'base.type') === 'Identifier' &&
            // TODO: FIXME:
            get(node, 'arguments[0].value') === options.translatorRequire) {
          translatorIsDeclared = true;
        }
      },

      skipProperty: function(property, node) {
        var skip =
          options.skipProperty ? options.skipProperty(property, node) : false;

        skip = skip || ((
              property === 'arguments' || property === 'argument'
            ) && (
            includes(
              wrapConfig.excludes.callees, get(node, 'base.identifier.name')
            ) ||
            includes(
              wrapConfig.excludes.callees, get(node, 'base.name')
            )
        ));

        skip = skip ||
          includes(wrapConfig.excludes.properties, property) ||
          includes(wrapConfig.excludes.nodeTypes, node.type) ||
          includes(wrapConfig.excludes.operators, node.operator) ||
          me._isLuaMessage(node);

        return skip;
      }
    });

    if (isWrapped && !translatorIsDeclared &&
        options.translatorRequireTemplate) {
      var translatorDeclare = utils.formatTemplate(
        options.translatorRequireTemplate, null, {
          translator: options.translator,
          translatorRequire: options.translatorRequire
        }
      );

      var useStrict = 'use strict';
      var useStrictIndex = input.indexOf(useStrict);

      if (useStrictIndex > 0) {
        var cutIndex = useStrictIndex + useStrict.length + 2;

        input =
          input.substr(0, cutIndex) +
          '\n\n' + translatorDeclare +
          input.substr(cutIndex);
      } else {
        input = translatorDeclare + '\n\n' + input;
      }
    }

    return {
      wrapped: input,
      stat: stat,
      parseError: parseError
    };
  },

  /**
   * TODO: docs
   */
  wrapTranslationTextsInHandlebars: function(input, options, resultCallback) {
    var me = this;
    var wrapConfig = me._config.handlebars.wrap;
    var htmlInfo;

    var stat = {
      counts: {
        wrappedTexts: 0
      }
    };

    var offsetHtmlInfoHandlebars = function(index, offset) {
      for (var i = htmlInfo.handlebars.length - 1; i >= 0; i-- ) {
        var hbs = htmlInfo.handlebars[i];

        if (hbs.offset > index) {
          hbs.offset += offset;
        } else {
          break;
        }
      }
    };

    var afterHtmlWrap = function(html) {
      var wrapBefore = '(' + options.message + ' \'';
      var wrapAfter = '\')';
      var offset = 0;
      var offsetInc = wrapBefore.length;
      var start;
      var end;
      var before;
      var after;

      var templateRaw = me._unmaskHandlebarsCodeInHtml(
        html, htmlInfo.handlebars
      );

      var template = templateRaw;

      // Handlebars
      var ast = me._parseHandlebarsTemplate(template);

      astTraverse(ast, {
        pre: function(node) {
          if (!me._isNeedWrapHandlebars(node)) {
            return;
          }

          start = utils.toStringIndex(
            templateRaw, node.loc.start.line, node.loc.start.column
          ) + offset;

          end = start + node.original.length + 2;

          before = template.substr(0, start);
          after = template.substr(end);

          template = before + wrapBefore + node.original + wrapAfter + after;

          offset += offsetInc;

          stat.counts.wrappedTexts++;
        },

        skipProperty: function(property, node) {
          var skip = options.skip ? options.skip(property, node) : false;
          return skip ||
            includes(wrapConfig.excludes.properties, property) ||
            me._isHandlebarsMessageHelper(node);
        }
      });

      resultCallback({
        wrapped: template,
        stat: stat
      });
    };

    // HTML
    var htmlWrap = function(html) {
      var wrapBefore = '{{' + options.message + ' \'';
      var wrapAfter = '\'}}';
      var offset = 0;
      var offsetInc = wrapBefore.length + wrapAfter.length;

      var htmlRaw = html;

      var inputStream = me._stringToStream(html);
      var htmlParser = me._getHtmlParser();

      var wrapHtmlText = function(text, location) {
        if (!me._isNeedWrapHtml(text)) {
          return;
        }

        var spacesBefore = get(/^\s+/.exec(text), '[0].length') || 0;
        var spacesAfter = get(/\s+$/.exec(text), '[0].length') || 0;

        var literal = text.substring(spacesBefore, text.length - spacesAfter);

        var start = location.startOffset + spacesBefore + offset;
        var end = location.endOffset - spacesAfter + offset;

        var before = html.substr(0, start);
        var after = html.substr(end);

        html = before + wrapBefore + literal + wrapAfter + after;

        offset += offsetInc;

        offsetHtmlInfoHandlebars(start, offsetInc);

        stat.counts.wrappedTexts++;
      };

      var wrapHtmlTexts = function(raw, startOffset) {
        if (!raw) {
          return;
        }

        raw.replace(
          HANDLEBARS_UNMASK_REGEXP,
          function(match, offset) {
            wrapHtmlText(match, {
              startOffset: startOffset + offset,
              endOffset: startOffset + match.length + offset
            });

            return match;
          }
        );
      };

      htmlParser
        .on('startTag', function(name, attrs, selfClosing, location) {
          attrs.forEach(function(attr) {
            var l = location.attrs[attr.name];

            if (l && attr.value) {
              var info = me._getHtmlAttrInfo(htmlRaw, attr, l);
              wrapHtmlTexts(info.rawValue, info.rawValueLocation.startOffset);
            }
          });
        })
        .on('text', function(text, location) {
          var info = me._getHtmlTextInfo(htmlRaw, text, location);
          wrapHtmlTexts(info.raw, location.startOffset);
        })
        .on('finish', function() {
          afterHtmlWrap(html);
        });

      inputStream.pipe(htmlParser);
    };

    htmlInfo = me._maskHandlebarsCodeInHtml(input);

    htmlWrap(htmlInfo.masked);

    return true;
  },

  _getHtmlAttrInfo: function(html, attr, location) {
    var raw = html.substring(location.startOffset, location.endOffset);
    var r = /["']/.exec(raw);

    var info = {
      rawValue: null,
      rawValueLocation: {
        startOffset: null,
        endOffset: null
      }
    };

    if (!r) {
      return info;
    }

    var rawValueLocationStart = location.startOffset + r.index + 1;
    var rawValueLocationEnd = location.endOffset - 1;

    info.rawValue = html.substring(rawValueLocationStart, rawValueLocationEnd);
    info.rawValueLocation.startOffset = rawValueLocationStart;
    info.rawValueLocation.endOffset = rawValueLocationEnd;

    return info;
  },

  _maskHandlebarsCodeInHtml: function(input) {
    var htmlInfo = {
      handlebars: [],
      masked: input
    };

    htmlInfo.masked = input.replace(
      HANDLEBARS_REGEXP,
      function(match, offset) {
        htmlInfo.handlebars.push({
          offset: offset,
          code: match
        });

        return repeat(HANDLEBARS_MASK_CHAR, match.length);
      }
    );

    return htmlInfo;
  },

  _unmaskHandlebarsCodeInHtml: function(input, htmlHandlebars) {
    htmlHandlebars.forEach(function(hbs) {
      input =
        input.substring(0, hbs.offset) +
        hbs.code +
        input.substring(hbs.offset + hbs.code.length);
    });

    return input;
  },

  _getHtmlTextInfo: function(html, text, location) {
    return {
      raw: html.substring(location.startOffset, location.endOffset)
    };
  },

  _getHtmlParser: function() {
    return new parse5.SAXParser({
      locationInfo: true
    });
  },

  _isNeedWrapHtml: function(text) {
    var config = this._config;

    return config.handlebars.wrap.wrapTargetRegExp.test(text);
  },

  _isNeedWrapHandlebars: function(node) {
    var config = this._config;

    return includes(config.handlebars.wrap.nodeTypes, node.type) &&
      config.handlebars.wrap.wrapTargetRegExp.test(node.value);
  },

  _isNeedWrapJs: function(node) {
    var config = this._config;

    return !node.regex &&
      isString(node.value) &&
      includes(config.js.wrap.nodeTypes, node.type) &&
      config.js.wrap.wrapTargetRegExp.test(node.value);
  },

  _isNeedWrapLua: function(node) {
    var config = this._config;

    // TODO: regex?
    return includes(config.lua.wrap.nodeTypes, node.type) &&
      config.lua.wrap.wrapTargetRegExp.test(node.value);
  },

  _createPotFile: function(keyItems, potFileDir) {
    var po = this._createPo(keyItems);
    var potFile = path.resolve(potFileDir, this._config.POT_FILE_NAME);

    fs.outputFileSync(potFile, po);

    return potFile;
  },

  _createPo: function(keyItems, locale) {
    var poJson = this._createPoJson(keyItems, locale);
    var po = poUtils.jsonToPo(poJson);

    return po;
  },

  _createPoJson: function(keyItems, locale) {
    var poHeaders = merge({}, POT.PO_HEADERS, {
      'Language': locale || ''
    });

    var poItems = [];

    var sortedByKey = sortBy(keyItems, function(i, k) {
      return k;
    });

    sortedByKey.forEach(function(items) {
      var first = items[0];

      var references =
        sortBy(items, function(item) {
          return get(item, 'location.src');
        })
        .map(function(item) {
          return get(item, 'location.src') + ':' +
            get(item, 'location.start.line');
        });

      poItems.push({
        msgid: first.key,
        msgctxt: first.context,
        references: references
      });
    });

    return {
      headers: poHeaders,
      items: poItems
    };
  },

  _pushKeyItem: function(keyItems, keyItem) {
    var messageKey = utils.buildMessageKey(keyItem.key, keyItem.context);

    if (!messageKey) {
      return;
    }

    var items = keyItems[messageKey] || [];

    items.push(keyItem);

    keyItems[messageKey] = items;
  },

  _isHandlebarsMessageHelper: function(node) {
    var config = this._config;

    return includes(config.handlebars.nodeTypes, node.type) &&
      includes(config.handlebars.nodePaths, get(node, 'path.original'));
  },

  _isJsMessage: function(node) {
    var config = this._config;

    return includes(config.js.nodeTypes, node.type) &&
      includes(
        config.js.nodeCalleeObjectNames, get(node, 'callee.object.name')
      ) &&
      includes(
        config.js.nodeCalleePropertyNames, get(node, 'callee.property.name')
      );
  },

  _isLuaMessage: function(node) {
    var config = this._config;

    return includes(config.lua.nodeTypes, node.type) &&
      includes(
        config.lua.nodeCalleeObjectNames, get(node, 'base.base.name')
      ) &&
      includes(
        config.lua.nodeCalleePropertyNames, get(node, 'base.identifier.name')
      );
  },

  _extractKeyItemFromHandlebarsNode: function(node, config, transformKey) {
    var keyNode = node.params[config.messageKey.index];
    var contextNode = node.params[config.messageContext.index];

    keyNode =
      includes(config.messageKey.types, get(keyNode, 'type')) ?
        keyNode : null;

    contextNode =
      includes(config.messageContext.types, get(contextNode, 'type')) ?
        contextNode : null;

    var keyItem = {
      key: (keyNode && keyNode.original) || null
    };

    if (keyItem.key && transformKey) {
      keyItem.key = transformKey(keyItem.key);
    }

    keyItem.context =
      (keyItem.key && contextNode && contextNode.original) || null;

    keyItem.location =
      (keyItem.key && keyNode && keyNode.loc) || null;

    return keyItem;
  },

  _extractKeyItemFromJsNode: function(node, config) {
    var keyNode = node.arguments[config.messageKey.index];
    var contextNode = node.arguments[config.messageContext.index];

    keyNode =
      includes(config.messageKey.types, get(keyNode, 'type')) ?
        keyNode : null;

    contextNode =
      includes(config.messageContext.types, get(contextNode, 'type')) ?
        contextNode : null;

    var keyItem = {
      key: this._evalJsAst(keyNode),
      context: null,
      location: null
    };

    if (keyItem.key && contextNode) {
      keyItem.context = this._evalJsAst(contextNode);
    }

    keyItem.location =
      (keyItem.key && keyNode && keyNode.loc) || null;

    return keyItem;
  },

  _extractKeyItemFromLuaNode: function(node, config) {
    var keyNode = node.arguments[config.messageKey.index];
    var contextNode = node.arguments[config.messageContext.index];

    keyNode =
      includes(config.messageKey.types, get(keyNode, 'type')) ?
        keyNode : null;

    contextNode =
      includes(config.messageContext.types, get(contextNode, 'type')) ?
        contextNode : null;

    var keyItem = {
      key: this._evalLuaAst(keyNode),
      context: null,
      location: null
    };

    if (keyItem.key && contextNode) {
      keyItem.context = this._evalLuaAst(contextNode);
    }

    keyItem.location =
      (keyItem.key && keyNode && keyNode.loc) || null;

    return keyItem;
  },

  _setKeyItemLocationSrc: function(keyItem, file) {
    if (keyItem.key) {
        set(keyItem, 'location.src', file);
    }
  },

  _parseHandlebarsTemplate: function(input) {
    return Handlebars.parse(input);
  },

  _parseHandlebarsTemplateAsHtml: function(input) {
    return parse5.parse(input, {
      locationInfo: true
    });
  },

  _parseJs: function(input) {
    return acorn.parse(input, {
      locations: true
    });
  },

  _parseLua: function(input) {
    return luaparse.parse(input, {
      locations: true,
      ranges: true
    });
  },

  _printParseFileResult: function(result, filePath, errorMessage) {
    if (result.parseError) {
      console.log(errorMessage || 'Parse file error...');
      console.log('Path:', filePath);
      console.log('Error:', result.parseError);
    }
  },

  _generateJs: function(ast) {
    return ast ? escodegen.generate(ast) : null;
  },

  // only necessary! only strings!
  _generateLuaAsJs: function(ast) {
    if (!ast) {
      return;
    }

    astTraverse(ast, {
      pre: function(node) {
        if (node.type === 'StringLiteral') {
          node.type = 'Literal';
        }

        if (node.type === 'BinaryExpression') {
          node.operator = '+';
        }
      }
    });

    // TODO: _generateJs supports [[...]] strings!
    //        -> check for node and JS versions
    var code = this._generateJs(ast);

    return code;
  },

  _luaStringsToJsStrings: function(luaStrings) {
    // TODO:
    return luaStrings;
  },

  _writeFile: function(filePath, data) {
    fs.outputFileSync(filePath, data);
  },

  _readFile: function(filePath) {
    return fs.readFileSync(filePath, DEFAULT_ENCODING);
  },

  _readFileRelative: function(cwd, filePath) {
    return this._readFile(path.resolve(cwd, filePath));
  },

  _stringToStream: function(input) {
    var stringStream = new stream.Readable();

    stringStream.push(input);
    stringStream.push(null);

    return stringStream;
  },

  _evalJsAst: function(ast) {
    var code = this._generateJs(ast);
    return this._evalJs(code);
  },

  _evalLuaAst: function(ast) {
    var code = this._generateLuaAsJs(ast);
    return this._evalJs(code);
  },

  /* jshint ignore:start */
  _evalJs: function(code) {
    try {
      return code ? eval(code) : null;
    } catch (e) {
      return null;
    }
  }
  /* jshint ignore:end */
};

// -----------------------------------------------------------------------------

module.exports = new Harvester();
