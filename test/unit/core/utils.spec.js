//
var chai = require('chai');
var expect = chai.expect;

var fs = require('fs');

var testUtils = require('test/utils');

// -----------------------------------------------------------------------------

var POT = require('src/core/po/pot');
var utils = require('src/core/utils');

describe('core/utils', function() {
  it('#buildMessageKey', function() {
    expect(utils.buildMessageKey('hello')).to.equal('hello');
    expect(utils.buildMessageKey('hello', 'acclamation'))
      .to.equal('hello' + POT.CONTEXT_GLUE + 'acclamation');
  });

  it('#formatTemplate', function() {
    var options = {
      interpolate: /{([\s\S]+?)}/g
    };

    var data = {
      cls: 'hello-text',
      text: 'Hello'
    };

    var formattedTemplate = utils.formatTemplate(
      '<b class="{cls}">{text}</b>',
      options,
      data
    );

    expect(formattedTemplate).to.equal('<b class="hello-text">Hello</b>');
  });

  it('#toStringIndex', function() {
    var text = '1\n23\r\n456\n7890'

    expect(utils.toStringIndex(text, 1, 1)).to.equal(1);

    expect(utils.toStringIndex(text, 2, 1)).to.equal(3);
    expect(utils.toStringIndex(text, 2, 2)).to.equal(4);

    expect(utils.toStringIndex(text, 3, 1)).to.equal(6);
    expect(utils.toStringIndex(text, 3, 2)).to.equal(7);
    expect(utils.toStringIndex(text, 3, 3)).to.equal(8);

    expect(utils.toStringIndex(text, 4, 1)).to.equal(10);
    expect(utils.toStringIndex(text, 4, 2)).to.equal(11);
    expect(utils.toStringIndex(text, 4, 3)).to.equal(12);
    expect(utils.toStringIndex(text, 4, 4)).to.equal(13);
  });
});
