/* jshint -W003 */
/* jshint -W030 */

'use strict';

var chai = require('chai');
var expect = chai.expect;

var fs = require('fs');

var testUtils = require('test/utils');

// -----------------------------------------------------------------------------

var poUtils = require('src/core/po/utils');

describe('core/po/utils', function() {
  it('#poToJson', function() {
    var po = fs.readFileSync('test/data/po/xx.po', 'utf8');
    var poJson = require('test/data/po/xx.po.json');
    var poData = poUtils.poToJson(po);

    // console.log(testUtils.stringifyObject(poData));
    expect(testUtils.normalizeJson(poData)).to.deep.equal(poJson);
  });

  it('#jsonToPo', function() {
    var poJson = require('test/data/po/xx.po.json');
    var originalPoData = poUtils.poToJson(
      fs.readFileSync('test/data/po/xx.po', 'utf8')
    );
    var originalPo = poUtils.jsonToPo(originalPoData);
    var po = poUtils.jsonToPo(poJson);

    // console.log(po);
    expect(po).to.equal(originalPo);
    expect(po).to.have.string('"Language: ru\\n"');
    expect(po).to.have.string('"Content-Type: text/plain; charset=UTF-8\\n"');
    expect(po).to.have.string('msgid "Ключ"');
  });

  it('#poInfo', function() {
    var po = fs.readFileSync('test/data/po/info/en.po', 'utf8');
    var info = poUtils.poInfo(po);

    expect(info).to.deep.equal({
      counts: {
        messages: {
          all: 4,
          translated: 3,
          fuzzy: 1,

          charsWithSpaces: 41,
          chars: 39,
          words: 6
        },
        context: {
          all: 2,

          charsWithSpaces: 42,
          chars: 37,
          words: 7
        }
      }
    });
  });

  it('#contextToComments', function() {
    var po = fs.readFileSync('test/data/po/transfer-translate/ru-en.po', 'utf8');
    var poWithContextComments = poUtils.contextToComments(po);

    // test for reuse
    poWithContextComments = poUtils.contextToComments(poWithContextComments);
    poWithContextComments = poUtils.contextToComments(poWithContextComments);

    expect(poWithContextComments).to.equal(
      fs.readFileSync('test/data/po/transfer-translate/ru-en_translate_context_prepare.po', 'utf8')
    );

    // test for reuse
    po = fs.readFileSync('test/data/po/transfer-translate/ru-en_translated.po', 'utf8');
    poWithContextComments = poUtils.contextToComments(po);
    poWithContextComments = poUtils.contextToComments(po);
    poWithContextComments = poUtils.contextToComments(po);

    expect(poWithContextComments).to.equal(po);
  });

  it('#transferPo', function() {
    var srcPo = fs.readFileSync('test/data/po/transfer-translate/ru-en_translated.po', 'utf8');
    var dstPo = fs.readFileSync('test/data/po/transfer-translate/ru-zh.po', 'utf8');
    var transferedPo = poUtils.transferPo(srcPo, dstPo);

    // test for reuse
    transferedPo = poUtils.transferPo(srcPo, transferedPo);
    transferedPo = poUtils.transferPo(srcPo, transferedPo);

    expect(transferedPo).to.equal(
      fs.readFileSync('test/data/po/transfer-translate/ru-en-zh.po', 'utf8')
    );

    // test for reuse
    dstPo = fs.readFileSync('test/data/po/transfer-translate/ru-en-zh_translated.po', 'utf8');
    transferedPo = poUtils.transferPo(srcPo, dstPo);

    expect(transferedPo).to.equal(dstPo);
  });

  it('#restoreTransferPo', function() {
    var srcPo = fs.readFileSync('test/data/po/transfer-translate/ru-en-zh_translated.po', 'utf8');
    var dstPo = fs.readFileSync('test/data/po/transfer-translate/ru-zh.po', 'utf8');
    var restoredPo = poUtils.restoreTransferPo(srcPo, dstPo);

    // test for reuse
    restoredPo = poUtils.restoreTransferPo(srcPo, restoredPo);
    restoredPo = poUtils.restoreTransferPo(srcPo, restoredPo);

    expect(restoredPo).to.equal(
      fs.readFileSync('test/data/po/transfer-translate/ru-zh_translated.po', 'utf8')
    );
  });
});
