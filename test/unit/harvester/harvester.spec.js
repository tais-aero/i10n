/* jshint -W003 */
/* jshint -W030 */

'use strict';

var chai = require('chai');
var expect = chai.expect;

var fs = require('fs-extra');
var path = require('path');
var glob = require('glob');

var flatten = require('lodash/array/flatten');
var map = require('lodash/collection/map');
var each = require('lodash/collection/each');
var includes = require('lodash/collection/includes');
var size = require('lodash/collection/size');
var defaultsDeep = require('lodash/object/defaultsDeep');
var get = require('lodash/object/get');
var trim = require('lodash/string/trim');
var endsWith = require('lodash/string/endsWith');
var cloneDeep = require('lodash/lang/cloneDeep');

var chalk = require('chalk');

var testUtils = require('test/utils');
var Handlebars = require('handlebars');

// -----------------------------------------------------------------------------

var harvester = require('src/harvester');

var EN_WORD_CHAR = 'a-zA-Z0-9';

var JS_WRAP_OPTIONS = {
  checkSpaces: true,
  translatorRequireTemplate: "var {translator} = require('{translatorRequire}').translator;",
  translatorRequire: 'L10n',
  translator: 'tr',
  message: 'msg'
};

var LUA_WRAP_OPTIONS = {
  checkSpaces: true,
  translatorRequireTemplate: "{translator} = require('{translatorRequire}').translator",
  translatorRequire: 'L10n',
  translator: 'tr',
  message: 'msg',
  prompt: false
};

var HANDLEBARS_WRAP_OPTIONS = {
  message: 'MSG'
};

describe('harvester', function() {
  describe('collect keys', function() {
    it('from JS', function() {
      var template = fs.readFileSync(
        'test/data/js/0.js', 'utf8'
      );
      var keyItems = {};

      var keyItemsRet =
        harvester.collectKeyItemsFromJs({
          keyItems: keyItems,
          input: template
        });

      // console.log(testUtils.stringifyObject(keyItems));

      expect(keyItemsRet).to.equal(keyItems);

      expect(testUtils.normalizeJson(keyItems)).to.deep.equal({
        "Ключ 0_1\u0004Контекст 0_1": [
          {
            "key": "Ключ 0_1",
            "context": "Контекст 0_1",
            "location": {
              "start": {
                "line": 4,
                "column": 2
              },
              "end": {
                "line": 4,
                "column": 22
              }
            }
          },
          {
            "key": "Ключ 0_1",
            "context": "Контекст 0_1",
            "location": {
              "start": {
                "line": 11,
                "column": 2
              },
              "end": {
                "line": 11,
                "column": 12
              }
            }
          },
          {
            "key": "Ключ 0_1",
            "context": "Контекст 0_1",
            "location": {
              "start": {
                "line": 27,
                "column": 19
              },
              "end": {
                "line": 27,
                "column": 29
              }
            }
          },
          {
            "key": "Ключ 0_1",
            "context": "Контекст 0_1",
            "location": {
              "start": {
                "line": 33,
                "column": 19
              },
              "end": {
                "line": 33,
                "column": 29
              }
            }
          }
        ],
        "Ключ 0_1": [
          {
            "key": "Ключ 0_1",
            "context": null,
            "location": {
              "start": {
                "line": 16,
                "column": 21
              },
              "end": {
                "line": 16,
                "column": 31
              }
            }
          },
          {
            "key": "Ключ 0_1",
            "context": null,
            "location": {
              "start": {
                "line": 25,
                "column": 19
              },
              "end": {
                "line": 25,
                "column": 29
              }
            }
          },
          {
            "key": "Ключ 0_1",
            "context": null,
            "location": {
              "start": {
                "line": 29,
                "column": 19
              },
              "end": {
                "line": 29,
                "column": 29
              }
            }
          }
        ]
      });
    });

    it('from Lua', function() {
      var template = fs.readFileSync(
        'test/data/lua/0.lua', 'utf8'
      );
      var keyItems = {};

      var keyItemsRet =
        harvester.collectKeyItemsFromLua({
          keyItems: keyItems,
          input: template
        });

      // console.log(testUtils.stringifyObject(keyItems));

      expect(keyItemsRet).to.equal(keyItems);

      expect(testUtils.normalizeJson(keyItems)).to.deep.equal({
        "Ключ 0_1\u0004Контекст 0_1": [
          {
            "key": "Ключ 0_1",
            "context": "Контекст 0_1",
            "location": {
              "start": {
                "line": 5,
                "column": 2
              },
              "end": {
                "line": 5,
                "column": 25
              }
            }
          },
          {
            "key": "Ключ 0_1",
            "context": "Контекст 0_1",
            "location": {
              "start": {
                "line": 12,
                "column": 2
              },
              "end": {
                "line": 12,
                "column": 12
              }
            }
          },
          {
            "key": "Ключ 0_1",
            "context": "Контекст 0_1",
            "location": {
              "start": {
                "line": 28,
                "column": 19
              },
              "end": {
                "line": 28,
                "column": 31
              }
            }
          },
          {
            "key": "Ключ 0_1",
            "context": "Контекст 0_1",
            "location": {
              "start": {
                "line": 34,
                "column": 19
              },
              "end": {
                "line": 34,
                "column": 31
              }
            }
          }
        ],
        "Ключ 0_1": [
          {
            "key": "Ключ 0_1",
            "context": null,
            "location": {
              "start": {
                "line": 17,
                "column": 17
              },
              "end": {
                "line": 17,
                "column": 27
              }
            }
          },
          {
            "key": "Ключ 0_1",
            "context": null,
            "location": {
              "start": {
                "line": 26,
                "column": 19
              },
              "end": {
                "line": 26,
                "column": 29
              }
            }
          },
          {
            "key": "Ключ 0_1",
            "context": null,
            "location": {
              "start": {
                "line": 30,
                "column": 19
              },
              "end": {
                "line": 30,
                "column": 29
              }
            }
          }
        ]
      });
    });

    it('from Handlebars template', function() {
      var template = fs.readFileSync(
        'test/data/templates/handlebars/0.handlebars', 'utf8'
      );
      var keyItems = {};

      var keyItemsRet =
        harvester.collectKeyItemsFromHandlebarsTemplate({
          keyItems: keyItems,
          input: template
        });

      // console.log(testUtils.stringifyObject(keyItems));

      expect(keyItemsRet).to.equal(keyItems);

      expect(testUtils.normalizeJson(keyItems)).to.deep.equal({
        "Ключ 0_1": [ {
            "key": "Ключ 0_1",
            "context": null,
            "location": {
              "start": {
                "line": 3,
                "column": 10
              },
              "end": {
                "line": 3,
                "column": 20
              }
            }
          },
          {
            "key": "Ключ 0_1",
            "context": null,
            "location": {
              "start": {
                "line": 5,
                "column": 10
              },
              "end": {
                "line": 5,
                "column": 20
              }
            }
          }
        ],
        "Ключ 0_1\u0004Контекст 0_1": [ {
            "key": "Ключ 0_1",
            "context": "Контекст 0_1",
            "location": {
              "start": {
                "line": 4,
                "column": 10
              },
              "end": {
                "line": 4,
                "column": 20
              }
            }
          },
          {
            "key": "Ключ 0_1",
            "context": "Контекст 0_1",
            "location": {
              "start": {
                "line": 6,
                "column": 10
              },
              "end": {
                "line": 6,
                "column": 20
              }
            }
          }
        ],
        "Ключ с форматированием: {result}": [ {
          "key": "Ключ с форматированием: {result}",
          "context": null,
          "location": {
            "start": {
              "line": 12,
              "column": 10
            },
            "end": {
              "line": 12,
              "column": 44
            }
          }
        } ],
        "Ключ с форматированием: {count, plural, =0 {a} =1 {b} one {c} few {d} many {e} other {f}}\u0004Контекст 0_1": [ {
          "key": "Ключ с форматированием: {count, plural, =0 {a} =1 {b} one {c} few {d} many {e} other {f}}",
          "context": "Контекст 0_1",
          "location": {
            "start": {
              "line": 14,
              "column": 10
            },
            "end": {
              "line": 14,
              "column": 101
            }
          }
        } ]
      });
    });

    it('from Handlebars template: i18n helper as SubExpression', function() {
      var template = fs.readFileSync(
        'test/data/templates/handlebars/3.handlebars', 'utf8'
      );

      Handlebars.registerHelper('MSG', require('src/handlebars/helpers/MSG'));
      Handlebars.registerPartial('item', fs.readFileSync(
        'test/data/templates/handlebars/3_item.handlebars', 'utf8'
      ));

      var html = testUtils.evalHandlebars(template);

      expect(html).to.equal([
        '<div>',
        '  Ключ 3_1',
        '  <span>',
        '    Ключ 3_2 ',
        '  </span>',
        '  <span>',
        '    Ключ 3_3_1 Ключ 3_3_2',
        '  </span>',
        '</div>',
        ''
      ].join('\n'));

      var keyItems = harvester.collectKeyItemsFromHandlebarsTemplate({
          keyItems: null,
          input: template
        });

      // console.log(testUtils.stringifyObject(keyItems));

      expect(testUtils.normalizeJson(keyItems)).to.deep.equal({
        "Ключ 3_1": [ {
          "key": "Ключ 3_1",
          "context": null,
          "location": {
            "start": {
              "line": 3,
              "column": 8
            },
            "end": {
              "line": 3,
              "column": 18
            }
          }
        } ],
        "Ключ 3_3_1": [ {
          "key": "Ключ 3_3_1",
          "context": null,
          "location": {
            "start": {
              "line": 7,
              "column": 23
            },
            "end": {
              "line": 7,
              "column": 35
            }
          }
        } ],
        "Ключ 3_3_2\u0004Контекст 3_3_2": [ {
          "key": "Ключ 3_3_2",
          "context": "Контекст 3_3_2",
          "location": {
            "start": {
              "line": 7,
              "column": 49
            },
            "end": {
              "line": 7,
              "column": 61
            }
          }
        } ]
      });
    });

    it('from files', function() {
      var keyItems = harvester.collectKeyItemsFromFiles({
        keyItems: null,
        cwd: 'test/data',
        pattern: '**/0.+(js|lua|handlebars)',
        excludes: null
      });

      var sources = flatten(map(keyItems, function(items) {
          return map(items, function(item) {
            return item.location.src;
          });
      })).sort();

      expect(sources).to.deep.equal([
        'js/0.js',
        'js/0.js',
        'js/0.js',
        'js/0.js',
        'js/0.js',
        'js/0.js',
        'js/0.js',

        'lua/0.lua',
        'lua/0.lua',
        'lua/0.lua',
        'lua/0.lua',
        'lua/0.lua',
        'lua/0.lua',
        'lua/0.lua',

        'templates/handlebars/0.handlebars',
        'templates/handlebars/0.handlebars',
        'templates/handlebars/0.handlebars',
        'templates/handlebars/0.handlebars',
        'templates/handlebars/0.handlebars',
        'templates/handlebars/0.handlebars'
      ]);
    });

    it('build PO files', function() {
      var keyItems = harvester.collectKeyItemsFromFiles({
        keyItems: null,
        cwd: 'test/data',
        pattern: '**/0.+(js|lua|handlebars)',
        excludes: null
      });

      var locales = [ 'ru', 'en' ];
      var poFileDir = 'test/tmp/po';
      var poFileBaseName = 'test_';

      harvester.buildPoFiles({
        keyItems: keyItems,
        locales: locales,
        poFileDir: poFileDir,
        poFileBaseName: poFileBaseName
      });
    });
  });

  describe('wrap translation texts', function() {
    describe('JS', function() {
      it('clean (without tr)', function() {
        test_wrapTranslationTextsInJs('test/data/wrap-translation/js/clean');
      });

      it('dirty (with tr and spaces)', function() {
        test_wrapTranslationTextsInJs('test/data/wrap-translation/js/dirty');
      });

      it('empty (no wrap)', function() {
        test_wrapTranslationTextsInJs('test/data/wrap-translation/js/empty');
      });

      it('test', function() {
        var wrapOptions = defaultsDeep({
          checkSpaces: false
        }, JS_WRAP_OPTIONS);

        test_wrapTranslationTextsInJs('test/data/wrap-translation/js/test', true, wrapOptions);
      });

      it('test EN & custom check', function() {
        harvester.setConfig({
          js: {
            wrap: {
              wrapTargetRegExp: /[a-z]/i
            }
          }
        });

        var wrapOptions = defaultsDeep({
          checkSpaces: false,
          skipNode: function(node) {
            if (node._skip) {
              return true;
            }
            var value = trim(node.value || '');
            return value.length < 3 || /^[.#?&]|http|mailto/.test(value);
          },
          skipProperty: function(property, node) {
            if (node._skip) {
              return true;
            }

            var excludedFuncs = ['$', 'find', 'append', 'on'];

            if (property === 'arguments' && (
                includes(excludedFuncs, get(node, 'callee.name')) ||
                includes(excludedFuncs, get(node, 'callee.property.name'))
            )) {
              node.arguments.forEach(function(argument) {
                if (!includes([
                      'FunctionExpression', 'ObjectExpression'
                    ], argument.type)) {
                  argument._skip = true;
                }
              });
            }
          }
        }, JS_WRAP_OPTIONS);

        test_wrapTranslationTextsInJs('test/data/wrap-translation/js/test_en', true, wrapOptions);

        harvester.setConfig();
      });
    });

    describe('Lua', function() {
      it('clean (without tr)', function() {
        test_wrapTranslationTextsInLua('test/data/wrap-translation/lua/clean');
      });

      it('dirty (with tr and spaces)', function() {
        test_wrapTranslationTextsInLua('test/data/wrap-translation/lua/dirty');
      });

      it('empty (no wrap)', function() {
        test_wrapTranslationTextsInLua('test/data/wrap-translation/lua/empty');
      });

      it('test', function() {
        var wrapOptions = defaultsDeep({
          checkSpaces: false
        }, LUA_WRAP_OPTIONS);

        test_wrapTranslationTextsInLua('test/data/wrap-translation/lua/test', true, wrapOptions);
      });

      it('test EN & custom check', function() {
        harvester.setConfig({
          lua: {
            wrap: {
              wrapTargetRegExp: /[a-z]/i
            }
          }
        });

        var wrapOptions = defaultsDeep({
          checkSpaces: false,
          skipNode: function(node) {
            if (node._skip) {
              return true;
            }
            var value = trim(node.value || '');
            return value.length < 3 || /^[.#?&]|http|mailto/.test(value);
          },
          skipProperty: function(property, node) {
            if (node._skip) {
              return true;
            }

            var skip = false;
            var identifierRegexp = /sql/i;

            if (identifierRegexp.test(get(node, 'key.name'))) {
              return true;
            }

            each(node.variables, function(v) {
              skip = identifierRegexp.test(v.name) ||
                identifierRegexp.test(get(v, 'identifier.name'));
              return !skip;
            });

            if (skip) {
              return true;
            }

            var excludedFuncs = ['foo', 'error', 'gsub'];

            if (property === 'arguments' && (
                includes(excludedFuncs, get(node, 'base.identifier.name')) ||
                includes(excludedFuncs, get(node, 'base.name'))
            )) {
              node.arguments.forEach(function(argument) {
                if (!includes([
                      'TableConstructorExpression'
                    ], argument.type)) {
                  argument._skip = true;
                }
              });
            }
          }
        }, LUA_WRAP_OPTIONS);

        test_wrapTranslationTextsInLua('test/data/wrap-translation/lua/test_en', true, wrapOptions);

        harvester.setConfig();
      });

      describe('smart', function() {
        before(function() {
          harvester.setConfig({
            lua: {
              wrap: {
                wrapTargetRegExp: /[a-z]/i,
                excludes: {
                  properties: null,
                  nodeTypes: null,
                  operators: null
                }
              }
            }
          });
        });

        after(function() {
          harvester.setConfig();
        });

        describe('no control messages', function() {
          it.skip('within prompt (unskip for test)', function() {
            var wrapOptions = defaultsDeep({
              checkSpaces: false
            }, LUA_WRAP_OPTIONS, {
              prompt: true
            });

            this.timeout(300000);
            test_wrapTranslationTextsInLua('test/data/smart/wrap-translation/lua/within_prompt', true, wrapOptions, true);
          });
        });

        describe('control messages', function() {
          it.skip('within prompt (unskip for test)', function() {
            var controlMessages = cloneDeep(require('test/data/smart/wrap-translation/lua/control_messages'));

            var wrapOptions = defaultsDeep({
              checkSpaces: false
            }, LUA_WRAP_OPTIONS, {
              controlMessages: controlMessages,
              wordChar: EN_WORD_CHAR,
              prompt: true
            });

            this.timeout(300000);
            test_wrapTranslationTextsInLua('test/data/smart/wrap-translation/lua/control_messages_within_prompt', true, wrapOptions, true);
          });

          it('without prompt', function() {
            var controlMessages = cloneDeep(require('test/data/smart/wrap-translation/lua/control_messages'));

            var wrapOptions = defaultsDeep({
              checkSpaces: false
            }, LUA_WRAP_OPTIONS, {
              controlMessages: controlMessages,
              wordChar: EN_WORD_CHAR,
              prompt: false
            });

            test_wrapTranslationTextsInLua('test/data/smart/wrap-translation/lua/control_messages_without_prompt', true, wrapOptions);

            var result = getSmartWrapResult(controlMessages);

            expect(result.allCount).to.be.equal(9);
            expect(result.noWraps).to.have.lengthOf(4);
            expect(result.noWraps).to.include('Message Z');
            expect(result.noWraps).to.not.include('Message');
          });
        });
      });
    });

    describe('Handlebars template', function() {
      it('clean (HTML only)', function(done) {
        test_wrapTranslationTextsInHandlebars('test/data/wrap-translation/templates/handlebars/clean', done);
      });

      it('dirty (with Handlebars)', function(done) {
        test_wrapTranslationTextsInHandlebars('test/data/wrap-translation/templates/handlebars/dirty', done);
      });

      it('empty (no wrap)', function(done) {
        test_wrapTranslationTextsInHandlebars('test/data/wrap-translation/templates/handlebars/empty', done);
      });

      it('test', function(done) {
        test_wrapTranslationTextsInHandlebars('test/data/wrap-translation/templates/handlebars/test', done, true);
      });
    });

    it('from files', function(done) {
      var dir = 'wrap-translation';
      var srcDir = path.resolve('test/data', dir);
      var targetDir = path.resolve('test/tmp', dir);
      var pattern = '**/!(test|test_*).+(js|lua|handlebars)';
      var expectedFileCount = 18;

      fs.removeSync(targetDir);
      fs.copySync(srcDir, targetDir);

      harvester.wrapTranslationTextsInFiles({
        cwd: targetDir,
        pattern: pattern,
        excludes: null,
        byTypeWrapOptions: {
          js: JS_WRAP_OPTIONS,
          lua: LUA_WRAP_OPTIONS,
          handlebars: HANDLEBARS_WRAP_OPTIONS
        },
        resultCallback: function(err, result) {
          expect(err).to.be.null;
          expect(result.files).to.have.lengthOf(expectedFileCount);
          expect(result.stat.counts.wrappedTexts).to.be.at.least(1);

          var wrappedTextsCount = 0;

          result.files.forEach(function(file) {
            expect(file.name).to.match(/\.(js|lua|handlebars)$/);
            wrappedTextsCount += file.stat.counts.wrappedTexts;
          });

          expect(wrappedTextsCount).to.be.equal(result.stat.counts.wrappedTexts);

          //
          var files = glob.sync(pattern, {
            cwd: targetDir,
            nodir: true
          });

          files.forEach(function(file) {
            var wrappedExt = '_wrapped';
            var ext = path.extname(file);
            var name = path.basename(file, ext);

            var isWrapped = endsWith(name, wrappedExt);
            var expactedFile = isWrapped ? file :
              path.join(path.dirname(file), name + wrappedExt + ext);

            var filePath = path.resolve(targetDir, file);
            var expactedFilePath = path.resolve(targetDir, expactedFile);

            expect(
              fs.readFileSync(filePath, 'utf8')
            ).to.equal(
              fs.readFileSync(expactedFilePath, 'utf8')
            );
          });

          done();
        },
        verbose: true
      });
    });

    describe('TAIS', function() {
      describe('Handlebars template', function() {
        it('rule.handlebars', function(done) {
          test_wrapTranslationTextsInHandlebars('test/data/tais/wrap-translation/handlebars/rule', done, true);
        });

        it('initializers.handlebars', function(done) {
          test_wrapTranslationTextsInHandlebars('test/data/tais/wrap-translation/handlebars/initializers', done, true);
        });
      });
    });

  });
});

function test_wrapTranslationTextsInJs(file, dump, wrapOptions) {
  wrapOptions = wrapOptions || JS_WRAP_OPTIONS;

  var js = fs.readFileSync(
    file + '.js', 'utf8'
  );

  var expextedJs = fs.readFileSync(
    file + '_wrapped.js', 'utf8'
  );

  var result = harvester.wrapTranslationTextsInJs(js, wrapOptions);
  dump && fs.outputFileSync('test/tmp/' + file + '_wrapped.js', result.wrapped);
  assert_wrapTranslationTextsInJs(js, result, expextedJs);

  result = harvester.wrapTranslationTextsInJs(result.wrapped, wrapOptions);
  dump && fs.outputFileSync('test/tmp/' + file + '_wrapped_2.js', result.wrapped);
  assert_wrapTranslationTextsInJs(result.wrapped, result, expextedJs);
}

function test_wrapTranslationTextsInLua(file, dump, wrapOptions, noReuseTest) {
  wrapOptions = wrapOptions || LUA_WRAP_OPTIONS;

  var lua = fs.readFileSync(
    file + '.lua', 'utf8'
  );

  var expextedLua = fs.readFileSync(
    file + '_wrapped.lua', 'utf8'
  );

  var result = harvester.wrapTranslationTextsInLua(lua, wrapOptions);
  dump && fs.outputFileSync('test/tmp/' + file + '_wrapped.lua', result.wrapped);
  assert_wrapTranslationTextsInLua(lua, result, expextedLua);

  if (!noReuseTest) {
    result = harvester.wrapTranslationTextsInLua(result.wrapped, wrapOptions);
    dump && fs.outputFileSync('test/tmp/' + file + '_wrapped_2.lua', result.wrapped);
    assert_wrapTranslationTextsInLua(result.wrapped, result, expextedLua);
  }
}

function test_wrapTranslationTextsInHandlebars(file, done, dump, wrapOptions) {
  wrapOptions = wrapOptions || HANDLEBARS_WRAP_OPTIONS;

  var template = fs.readFileSync(
    file + '.handlebars', 'utf8'
  );

  var expextedTemplate = fs.readFileSync(
    file + '_wrapped.handlebars', 'utf8'
  );

  harvester.wrapTranslationTextsInHandlebars(template, wrapOptions, function(result) {
    dump && fs.outputFileSync('test/tmp/' + file + '_wrapped.handlebars', result.wrapped);
    assert_wrapTranslationTextsInHandlebars(template, result, expextedTemplate);

    harvester.wrapTranslationTextsInHandlebars(result.wrapped, wrapOptions, function(result) {
      dump && fs.outputFileSync('test/tmp/' + file + '_wrapped_2.handlebars', result.wrapped);
      assert_wrapTranslationTextsInHandlebars(result.wrapped, result, expextedTemplate);

      done();
    });
  });
}

function assert_wrapTranslationTexts(mathRegexp, input, result, expected) {
  var inputMatch = (input.match(mathRegexp) || []).length;
  var resultMatch = (result.wrapped.match(mathRegexp) || []).length;

  expect(result.stat.counts.wrappedTexts).to.equal(
    resultMatch - inputMatch,
    '[result.stat] test error...'
  );

  expect(result.wrapped).to.equal(
    expected, '[result.wrapped] test error...'
  );
}

function assert_wrapTranslationTextsInJs(input, result, expected) {
  assert_wrapTranslationTexts(/[^a-z]tr\./g, input, result, expected);
}

function assert_wrapTranslationTextsInLua(input, result, expected) {
  assert_wrapTranslationTexts(/[^a-z]tr\./g, input, result, expected);
}

function assert_wrapTranslationTextsInHandlebars(input, result, expected) {
  assert_wrapTranslationTexts(/[^a-z]MSG\s'/g, input, result, expected);
}

function getSmartWrapResult(controlMessages) {
  var allCount = size(controlMessages);
  var noWraps = [];

  each(controlMessages, function(isWrap, message) {
    if (!isWrap) {
      noWraps.push(message);
    }
  });

  console.log('Control messages:', allCount);
  console.log('No wrap messages:', chalk.red(noWraps.length), '...');

  each(noWraps, function(message) {
    console.log(chalk.red(message));
  });

  return {
    allCount: allCount,
    noWraps: noWraps
  };
}
