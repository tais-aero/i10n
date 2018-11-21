/* jshint -W003 */
/* jshint -W030 */

'use strict';

var chai = require('chai');
var expect = chai.expect;

var fs = require('fs');

var cloneDeep = require('lodash/cloneDeep');
var unescape = require('lodash/unescape');

// var testUtils = require('test/utils');

// -----------------------------------------------------------------------------

var translator = require('src/translator');

describe('translator', function() {
  after(function() {
    translator.loadMessages(null);
    translator.setConfig(null);
  });

  describe('config', function() {
    it('set config', function() {
      var config = {
        untranslatedMessageTemplate:
          '<b class="{cls}" data-locale="{_locale_}">{_messageKey_}</b>',
        untranslatedMessageData: {
          cls: 'untranslated'
        }
      };

      var newConfig = translator.setConfig(config);

      expect(newConfig).to.have.deep.property(
        'untranslatedMessageTemplate', config.untranslatedMessageTemplate
      );
      expect(newConfig).to.have.deep.property(
        'untranslatedMessageData', config.untranslatedMessageData
      );
    });
  });

  describe('locale', function() {
    it('set locale', function() {
      var locale = 'zh-Hant-TW';
      var translatorLocale = translator.setLocale(locale);

      expect(translatorLocale).to.be.equal(locale);
    });

    it('get locale', function() {
      var locale = 'zh-Hant-TW';
      translator.setLocale(locale);
      var translatorLocale = translator.getLocale();

      expect(translatorLocale).to.be.equal(locale);
    });
  });

  describe('untranslated messages', function() {
    it('base locale', function() {
        translator.setLocale('ru');
        expect(translator.message('blah-blah-blah'))
          .to.be.equal('blah-blah-blah');
    });

    it('not base locale', function() {
        translator.setLocale('zh-Hant-TW');
        expect(translator.message('blah-blah-blah')).to.be.equal(
          '<b class="untranslated" data-locale="zh-Hant-TW">blah-blah-blah</b>'
        );
    });

    it('formatted', function() {
        translator.loadMessages({
          ru: {
            'Найдено {0} {0, plural, one {совпадение} few {совпадения} many {совпадений} other {совпадений}} из {1}': ''
          },
          en: {
            'Найдено {0} {0, plural, one {совпадение} few {совпадения} many {совпадений} other {совпадений}} из {1}': ''
          }
        });

        translator.setLocale('ru');

        expect(
          translator.message(
            'Найдено {0} {0, plural, one {совпадение} few {совпадения} many {совпадений} other {совпадений}} из {1}',
            25, 100
          )
        ).to.be.equal(
          'Найдено 25 совпадений из 100'
        );

        translator.setLocale('en');

        expect(
          translator.message(
            'Найдено {0} {0, plural, one {совпадение} few {совпадения} many {совпадений} other {совпадений}} из {1}',
            25, 100
          )
        ).to.be.equal(
          '<b class="untranslated" data-locale="en">Найдено 25 совпадений из 100</b>'
        );
    });
  });

  describe('HTML Escape for messages', function() {
    it('base locale', function() {
        translator.setLocale('ru');
        expect(translator.message('<a>Key</a>')).to.be.equal(
          '&lt;a&gt;Key&lt;/a&gt;'
        );
        expect(unescape(translator.message('<a>Key</a>'))).to.be.equal(
          '<a>Key</a>'
        );
    });

    it('not base locale', function() {
        translator.loadMessages({
          en: {
            'Key': '<div click="alert(\'XSS\')"></div>'
          }
        });

        translator.setLocale('en');

        expect(translator.message('Key')).to.be.equal(
          '&lt;div click=&quot;alert(&#39;XSS&#39;)&quot;&gt;&lt;/div&gt;'
        );
        expect(unescape(translator.message('Key'))).to.be.equal(
          '<div click="alert(\'XSS\')"></div>'
        );

        expect(translator.message('<a>Key</a>')).to.be.equal(
          '<b class="untranslated" data-locale="en">&lt;a&gt;Key&lt;/a&gt;</b>'
        );
        expect(unescape(translator.message('<a>Key</a>'))).to.be.equal(
          '<b class="untranslated" data-locale="en"><a>Key</a></b>'
        );

        expect(translator.message('blah-blah-blah')).to.be.equal(
          '<b class="untranslated" data-locale="en">blah-blah-blah</b>'
        );
        expect(unescape(translator.message('blah-blah-blah'))).to.be.equal(
          '<b class="untranslated" data-locale="en">blah-blah-blah</b>'
        );
    });
  });

  describe('No HTML Escape for messages', function() {
    var config;

    before(function() {
      var c = translator.getConfig();
      config = cloneDeep(c);
      c.noEscape = true;
      translator.setConfig(c);
    });

    after(function() {
      translator.setConfig(config);
    });

    it('base locale', function() {
        translator.setLocale('ru');
        expect(translator.message('<a>Key</a>')).to.be.equal('<a>Key</a>');
        expect(unescape(translator.message('<a>Key</a>'))).to.be.equal('<a>Key</a>');
    });

    it('not base locale', function() {
        translator.loadMessages({
          en: {
            'Key': '<div click="alert(\'XSS\')"></div>'
          }
        });

        translator.setLocale('en');

        expect(translator.message('Key')).to.be.equal(
          '<div click="alert(\'XSS\')"></div>'
        );
        expect(unescape(translator.message('Key'))).to.be.equal(
          '<div click="alert(\'XSS\')"></div>'
        );

        expect(translator.message('<a>Key</a>')).to.be.equal(
          '<b class="untranslated" data-locale="en"><a>Key</a></b>'
        );
        expect(unescape(translator.message('<a>Key</a>'))).to.be.equal(
          '<b class="untranslated" data-locale="en"><a>Key</a></b>'
        );

        expect(translator.message('blah-blah-blah')).to.be.equal(
          '<b class="untranslated" data-locale="en">blah-blah-blah</b>'
        );
        expect(unescape(translator.message('blah-blah-blah'))).to.be.equal(
          '<b class="untranslated" data-locale="en">blah-blah-blah</b>'
        );
    });
  });

  describe('translate messages', function() {
    before(function() {
      translator.loadMessagesFromPo([
        fs.readFileSync('test/data/po/ru.po', 'utf8'),
        fs.readFileSync('test/data/po/en.po', 'utf8')
      ]);
    });

    describe('message variations', function() {
      before(function() {
        translator.setLocale('en');
      });

      it('message()', function() {
        var text = translator.message();
        expect(text).to.be.equal(
          '<b class="untranslated" data-locale="en"></b>'
        );
      });

      it('message(key)', function() {
        var text = translator.message('Ключ');
        expect(text).to.be.equal('Key');
      });

      it('message(key, context)', function() {
        var text = translator.message('Ключ', 'к разгадке чего-либо');
        expect(text).to.be.equal('Clue');
      });

      it('message(key, {...})', function() {
        var text = translator.message('Найденных совпадений', {
          count: 123
        });
        expect(text).to.be.equal('Matches found: 123');
      });

      it('message(key, [...])', function() {
        var text = translator.message('Сколько?', [5]);
        expect(text).to.be.equal('5');
      });

      it('message(key, context, {...})', function() {
        var text = translator.message('Найдено', 'Поиск совпадений', {
          count: 1
        });
        expect(text).to.be.equal('Only one match');
      });

      it('message(key, context, [...])', function() {
        var text = translator.message('Сколько?', 'из чего', [2, 5]);
        expect(text).to.be.equal('2 from 5');
      });
    });

    describe('format messages {...}', function() {
      it('base locale', function() {
          translator.setLocale('ru');

          var text = translator.message('Результат [12 / 2]: {result}', {
            result: 6
          });

          expect(text).to.be.equal('Результат [12 / 2]: 6');
      });

      it('not base locale', function() {
          translator.setLocale('en');

          var text = translator.message('Результат [12 / 2]: {result}', {
            result: 6
          });

          expect(text).to.be.equal('Result [12 / 2]: 6');
      });
    });

    describe('plural {...}', function() {
      it('base locale', function() {
          translator.setLocale('ru');

          var text = translator.message(
            '{count, plural, =0 {Совпадений не найдено} =1 {Только одно совпадение} one {Совпадение} few {Совпадения} many {Совпадений} other {Совпадений}}',
            'Поиск совпадений', {
            count: 1
          });

          expect(text).to.be.equal('Только одно совпадение');
      });

      it('not base locale', function() {
          translator.setLocale('en');

          var text = translator.message(
            '{count, plural, =0 {Совпадений не найдено} =1 {Только одно совпадение} one {Совпадение} few {Совпадения} many {Совпадений} other {Совпадений}}',
            'Поиск совпадений', {
            count: 1
          });

          expect(text).to.be.equal('Only one match');
      });
    });

    describe('plural [...]', function() {
      it('base locale', function() {
          translator.setLocale('ru');

          var text = translator.message(
            '{0} {0, plural, one {корова} few {коровы} many {коров} other {коровы}}',
            5
          );

          expect(text).to.be.equal('5 коров');
      });

      it('not base locale', function() {
          translator.setLocale('en');

          var text = translator.message(
            '{0} {0, plural, one {корова} few {коровы} many {коров} other {коровы}}',
            2
          );

          expect(text).to.be.equal('2 cows');
      });
    });

    describe('plural + format {...}', function() {
      it('base locale', function() {
          translator.setLocale('ru');

          var text = translator.message(
            'Найдено {count} {count, plural, one {совпадение} few {совпадения} many {совпадений} other {совпадений}} из {allCount}', {
            count: 25,
            allCount: 100
          });

          expect(text).to.be.equal('Найдено 25 совпадений из 100');
      });

      it('not base locale', function() {
          translator.setLocale('en');

          var text = translator.message(
            'Найдено {count} {count, plural, one {совпадение} few {совпадения} many {совпадений} other {совпадений}} из {allCount}', {
            count: 25,
            allCount: 100
          });

          expect(text).to.be.equal('Found 25 matches from 100');
      });
    });

    describe('plural + format [...]', function() {
      it('base locale', function() {
          translator.setLocale('ru');

          var text = translator.message(
            'Найдено {0} {0, plural, one {совпадение} few {совпадения} many {совпадений} other {совпадений}} из {1}', 25, 100);

          expect(text).to.be.equal('Найдено 25 совпадений из 100');
      });

      it('not base locale', function() {
          translator.setLocale('en');

          var text = translator.message(
            'Найдено {0} {0, plural, one {совпадение} few {совпадения} many {совпадений} other {совпадений}} из {1}', 25, 100);

          expect(text).to.be.equal('Found 25 matches from 100');
      });
    });
  });

  describe('load messages', function() {
    describe('load messages from JSON', function() {
      it('get messages', function() {
        var messageByKey = 'Message';
        var messageByFormat =
            '{count, plural, =0 {No matches found} =1 ' +
            '{Only one match} one {Match} other {Matches}}';

        translator.loadMessages({
          en: {
            'Key': messageByKey,
            'Matches\u0004Match Search': messageByFormat
          },
          ru: {
          }
        });

        // no messages for ru locale
        translator.setLocale('ru');

        expect(translator.message('Key')).to.be.equal('Key');

        // messages for en locale
        translator.setLocale('en');

        expect(translator.message('Key')).to.be.equal(messageByKey);

        expect(translator.message('Matches', 'Match Search', {
          count: 0
        })).to.be.equal('No matches found');

        expect(translator.message('Matches', 'Match Search', {
          count: 1
        })).to.be.equal('Only one match');

        expect(translator.message('Matches', 'Match Search', {
          count: 2
        })).to.be.equal('Matches');
      });
    });

    describe('load messages from PO', function() {
      it.skip('// TODO: PO modules', function() {
      });

      it('get messages', function() {
        translator.loadMessagesFromPo([
          fs.readFileSync('test/data/po/ru.po', 'utf8'),
          fs.readFileSync('test/data/po/en.po', 'utf8')
        ]);

        // messages for ru locale (no translated, formatted only)
        translator.setLocale('ru');

        expect(translator.message('Ключ')).to.be.equal('Ключ');

        expect(translator.message('Ключ', 'к разгадке чего-либо'))
          .to.be.equal('Ключ');

        expect(translator.message('Ключ', 'ключ воды, приток реки'))
          .to.be.equal('Ключ');

        expect(translator.message('Найдено', 'Поиск совпадений', {
          count: 0
        })).to.be.equal('Совпадений не найдено');

        expect(translator.message('Найдено', 'Поиск совпадений', {
          count: 1
        })).to.be.equal('Только одно совпадение');

        expect(translator.message('Найдено', 'Поиск совпадений', {
          count: 21
        })).to.be.equal('Совпадение');

        expect(translator.message('Найдено', 'Поиск совпадений', {
          count: 2
        })).to.be.equal('Совпадения');

        expect(translator.message('Найдено', 'Поиск совпадений', {
          count: 5
        })).to.be.equal('Совпадений');

        expect(translator.message('Найдено', 'Поиск совпадений', {
          count: 2.4
        })).to.be.equal('Совпадений');

        // messages for en locale
        translator.setLocale('en');

        expect(translator.message('Ключ')).to.be.equal('Key');

        expect(translator.message('Ключ', 'к разгадке чего-либо'))
          .to.be.equal('Clue');

        expect(translator.message('Ключ', 'ключ воды, приток реки'))
          .to.be.equal('Feeder');

        expect(translator.message('Найдено', 'Поиск совпадений', {
          count: 0
        })).to.be.equal('No matches found');

        expect(translator.message('Найдено', 'Поиск совпадений', {
          count: 1
        })).to.be.equal('Only one match');

        expect(translator.message('Найдено', 'Поиск совпадений', {
          count: 21
        })).to.be.equal('Matches');

        expect(translator.message('Найдено', 'Поиск совпадений', {
          count: 2.4
        })).to.be.equal('Matches');
      });
    });
  });

  describe('aliases', function() {
      it('msg', function() {
        var messageByKey = 'Message';

        translator.loadMessages({
          en: {
            'Key': messageByKey
          }
        });

        translator.setLocale('en');
        expect(translator.msg('Key')).to.be.equal(messageByKey);
      });
  });
});
