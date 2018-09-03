'use strict';

var isString = require('lodash/lang/isString');
var merge = require('lodash/object/merge');
var get = require('lodash/object/get');
var set = require('lodash/object/set');
var includes = require('lodash/collection/includes');
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

var JS_WRAP_EXCLUDE_PROPERTIES = [ 'key' ];

// TODO:
var LUA_WRAP_EXCLUDE_PROPERTIES = [];

var HANDLEBARS_REGEXP = /{{!--[\s\S]+?--}}|{{[\s\S]+?}}/g;
var HANDLEBARS_MASK_CHAR = '\u2060'; // WORD JOINER
var HANDLEBARS_UNMASK_REGEXP = /[^\u2060]+/g;
var HANDLEBARS_WRAP_EXCLUDE_PROPERTIES = [ 'path' ];

/**
 * Default config
 * TODO: docs
 */
// TODO: unify hbs & js parse options
// TODO: hbs & js aliases
var DEFAULT_CONFIG = {
  POT_FILE_NAME: 'messages.pot',
  PO_FILE_EXT: 'po',

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
      wrapTargetRegExp: RU_TEXT_REGEXP
    }
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
      wrapTargetRegExp: RU_TEXT_REGEXP
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
      wrapTargetRegExp: RU_TEXT_REGEXP
    }
  }
};

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

      var content = me._readFileRelative(options.cwd, file);

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
    var ast = me._parseLua(options.input);

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

    var doResult = function(err) {
      options.resultCallback(err || null, result);
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

    var globber = new glob.Glob(options.pattern, {
      cwd: options.cwd,
      ignore: options.excludes,
      nodir: true
    });

    globber
      .on('match', function(file) {
        var type = path.extname(file).toLowerCase().replace('.', '');
        var byFileType = byFileTypes[type];

        if (!byFileType) {
          return;
        }

        var wrapOptions = options.byTypeWrapOptions[type];

        globber.pause();

        executeWrapTranslationTextsInFile(byFileType, file, wrapOptions,
          function() {
            globber.resume();
          }
        );
      })
      .on('abort', function() {
        doResult();
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

    if (result.parseError) {
      console.error('Parse JS file error...');
      console.error('Path:', filePath);
      console.error('Error:', result.parseError);
    }

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
  wrapTranslationTextsInJs: function(input, options) {
    var me = this;
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
        if (me._isNeedWrapJs(node)) {
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
            // get(node, 'callee.name') === 'require' &&
            get(node, 'arguments[0].value') === options.translatorRequire) {
          translatorIsDeclared = true;
        }
      },

      skipProperty: function(property, node) {
        return includes(JS_WRAP_EXCLUDE_PROPERTIES, property) ||
          get(node, 'arguments[0].value') === options.translatorRequire ||
          me._isJsMessage(node);
      }
    });

    if (isWrapped && !translatorIsDeclared) {
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
  // TODO: deduplicate code, see: wrapTranslationTextsInJs
  wrapTranslationTextsInLua: function(input, options) {
    var me = this;
    var wrapBefore = options.translator + '.' + options.message + '(';
    var wrapAfter = ')';
    var concat = ' + ';
    var offset = 0;
    var offsetInc = wrapBefore.length + wrapAfter.length;
    var translatorIsDeclared = false;
    var isWrapped = false;
    var ast = me._parseLua(input);

    var stat = {
      counts: {
        wrappedTexts: 0
      }
    };

    astTraverse(ast, {
      pre: function(node) {
        if (me._isNeedWrapLua(node)) {
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
            get(node, 'base.name') === 'require' &&
            get(node, 'arguments[0].value') === options.translatorRequire) {
          translatorIsDeclared = true;
        }
      },

      skipProperty: function(property, node) {
        return includes(LUA_WRAP_EXCLUDE_PROPERTIES, property) ||
          me._isLuaMessage(node);
      }
    });

    if (isWrapped && !translatorIsDeclared) {
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
      stat: stat
    };
  },

  /**
   * TODO: docs
   */
  wrapTranslationTextsInHandlebars: function(input, options, resultCallback) {
    var me = this;
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
          return includes(HANDLEBARS_WRAP_EXCLUDE_PROPERTIES, property) ||
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
