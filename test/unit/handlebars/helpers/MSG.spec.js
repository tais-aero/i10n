//
var chai = require('chai');
var expect = chai.expect;

var fs = require('fs');

var testUtils = require('test/utils');

// -----------------------------------------------------------------------------

var Handlebars = require('handlebars');

// -----------------------------------------------------------------------------

var translator = require('src/translator');

describe('handlebars/helpers', function() {
  before(function() {
    translator.setConfig({
      untranslatedMessageTemplate:
        '<b class="{cls}" data-locale="{_locale_}">{_messageKey_}</b>',
      untranslatedMessageData: {
        cls: 'untranslated'
      }
    });

    translator.loadMessagesFromPo([
      fs.readFileSync('test/data/po/ru.po', 'utf8'),
      fs.readFileSync('test/data/po/en.po', 'utf8')
    ]);
  });

  after(function() {
    translator.loadMessages(null);
    translator.setConfig(null);
  });

  describe('MSG', function() {
    Handlebars.registerHelper('MSG', require('src/handlebars/helpers/MSG'));

    describe('untranslated messages', function() {
      it('base locale', function() {
        translator.setLocale('ru');
        var html =
          testUtils.evalHandlebars('<div>{{MSG "blah-blah-blah"}}</div>');

        expect(html).to.equal('<div>blah-blah-blah</div>');
      });

      it('not base locale', function() {
        translator.setLocale('en');
        var html =
          testUtils.evalHandlebars('<div>{{MSG "blah-blah-blah"}}</div>');

        expect(html).to.equal(
          '<div>' +
            '<b class="untranslated" data-locale="en">blah-blah-blah</b>' +
          '</div>'
        );
      });
    });

    describe('HTML Escape', function() {
      it('escaped output}', function() {
        translator.setLocale('en');
        var html = testUtils.evalHandlebars('<div>{{MSG "Данные"}}</div>');

        expect(html).to.equal(
          '<div>' +
            '&lt;div ' +
            'click=&quot;alert(&#39;XSS&#39;)&quot;&gt;Data&lt;/div&gt;' +
          '</div>'
        );
      });
    });

    describe('MSG variations', function() {
      before(function() {
        translator.setLocale('en');
      });

      it('{{MSG}}', function() {
        var html = testUtils.evalHandlebars('<div>{{MSG}}</div>');
        expect(html).to.equal(
          '<div><b class="untranslated" data-locale="en"></b></div>'
        );
      });

      it('{{MSG key}}', function() {
        var html = testUtils.evalHandlebars('<div>{{MSG "Ключ"}}</div>');
        expect(html).to.equal('<div>Key</div>');
      });

      it('{{MSG key context}}', function() {
        var html = testUtils.evalHandlebars(
          '<div>{{MSG "Ключ" "к разгадке чего-либо"}}</div>'
        );
        expect(html).to.equal('<div>Clue</div>');
      });

      it('{{MSG key {...}}}', function() {
        var html = testUtils.evalHandlebars(
          '<div>{{MSG "Найденных совпадений" this}}</div>', {
            count: 123
          }
        );

        expect(html).to.equal('<div>Matches found: 123</div>');
      });

      it('{{MSG key [...]}}', function() {
        var html = testUtils.evalHandlebars(
          '<div>{{MSG "Сколько?" a}}</div>', {
            a: 5
          }
        );

        expect(html).to.equal('<div>5</div>');
      });

      it('{{MSG key context {...}}}', function() {
        var html = testUtils.evalHandlebars(
          '<div>{{MSG "Найдено" "Поиск совпадений" this}}</div>', {
            count: 1
          }
        );

        expect(html).to.equal('<div>Only one match</div>');
      });

      it('{{MSG key context [...]}}', function() {
        var html = testUtils.evalHandlebars(
          '<div>{{MSG "Сколько?" "из чего" a b}}</div>', {
            a: 2,
            b: 5
          }
        );

        expect(html).to.equal('<div>2 from 5</div>');
      });
    });

    describe('format messages {...}', function() {
      it('base locale', function() {
          translator.setLocale('ru');

          var html = testUtils.evalHandlebars(
            '<div>{{MSG "Результат [12 / 2]: {result}" this}}</div>', {
              result: 6
            }
          );

          expect(html).to.be.equal('<div>Результат [12 / 2]: 6</div>');
      });

      it('not base locale', function() {
        translator.setLocale('en');

        var html = testUtils.evalHandlebars(
          '<div>{{MSG "Результат [12 / 2]: {result}" this}}</div>', {
            result: 6
          }
        );

        expect(html).to.be.equal('<div>Result [12 / 2]: 6</div>');
      });
    });

    describe('plural {...}', function() {
      it('base locale', function() {
        translator.setLocale('ru');

        var html = testUtils.evalHandlebars(
          '<div>{{MSG "{count, plural, =0 {Совпадений не найдено} =1 {Только одно совпадение} one {Совпадение} few {Совпадения} many {Совпадений} other {Совпадений}}" "Поиск совпадений" this}}</div>', {
            count: 1
          }
        );

        expect(html).to.be.equal('<div>Только одно совпадение</div>');
      });

      it('not base locale', function() {
        translator.setLocale('en');

        var html = testUtils.evalHandlebars(
          '<div>{{MSG "{count, plural, =0 {Совпадений не найдено} =1 {Только одно совпадение} one {Совпадение} few {Совпадения} many {Совпадений} other {Совпадений}}" "Поиск совпадений" this}}</div>', {
            count: 1
          }
        );

        expect(html).to.be.equal('<div>Only one match</div>');
      });
    });

    describe('plural [...]', function() {
      it('base locale', function() {
        translator.setLocale('ru');

        var html = testUtils.evalHandlebars(
          '<div>{{MSG "{0} {0, plural, one {корова} few {коровы} many {коров} other {коровы}}" cows.length}}</div>', {
            cows: ['a', 'b', 'c', 'd', 'e']
          }
        );

        expect(html).to.be.equal('<div>5 коров</div>');
      });

      it('not base locale', function() {
        translator.setLocale('en');

        var html = testUtils.evalHandlebars(
          '<div>{{MSG "{0} {0, plural, one {корова} few {коровы} many {коров} other {коровы}}" cows.length}}</div>', {
            cows: ['a', 'b']
          }
        );

        expect(html).to.be.equal('<div>2 cows</div>');
      });
    });

    describe('plural + format {...}', function() {
      it('base locale', function() {
        translator.setLocale('ru');

        var html = testUtils.evalHandlebars(
          '<div>{{MSG "Найдено {count} {count, plural, one {совпадение} few {совпадения} many {совпадений} other {совпадений}} из {allCount}" this}}</div>', {
            count: 25,
            allCount: 100
          }
        );

        expect(html).to.be.equal('<div>Найдено 25 совпадений из 100</div>');
      });

      it('not base locale', function() {
        translator.setLocale('en');

        var html = testUtils.evalHandlebars(
          '<div>{{MSG "Найдено {count} {count, plural, one {совпадение} few {совпадения} many {совпадений} other {совпадений}} из {allCount}" this}}</div>', {
            count: 25,
            allCount: 100
          }
        );

        expect(html).to.be.equal('<div>Found 25 matches from 100</div>');
      });
    });

    describe('plural + format [...]', function() {
      it('base locale', function() {
        translator.setLocale('ru');

        var html = testUtils.evalHandlebars(
          '<div>{{MSG "Найдено {0} {0, plural, one {совпадение} few {совпадения} many {совпадений} other {совпадений}} из {1}" count allCount}}</div>', {
            count: 25,
            allCount: 100
          }
        );

        expect(html).to.be.equal('<div>Найдено 25 совпадений из 100</div>');
      });

      it('not base locale', function() {
        translator.setLocale('en');

        var html = testUtils.evalHandlebars(
          '<div>{{MSG "Найдено {0} {0, plural, one {совпадение} few {совпадения} many {совпадений} other {совпадений}} из {1}" count allCount}}</div>', {
            count: 25,
            allCount: 100
          }
        );

        expect(html).to.be.equal('<div>Found 25 matches from 100</div>');
      });
    });
  });
});
