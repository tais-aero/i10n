'use strict';

var find = require('lodash/collection/find');
var PO = require('pofile');

// TEMP:
// var testUtils = require('test/utils');
// -----------------------------------------------------------------------------

var POT = require('src/core/po/pot');
var utils = require('src/core/utils');

// -----------------------------------------------------------------------------

/**
 * Transform PO to JSON.
 *
 * @param {String} po po (utf-8) as string.
 * @returns {Object} PO as JSON.
 */
var poToJson = function(po) {
  return PO.parse(po);
};

/**
 * Transform PO object to PO format.
 *
 * @param {Object} json PO object.
 * @returns {String} PO as string.
 */
var jsonToPo = function(json) {
  json.items = json.items || [];

  var po = new PO();

  po.comments = json.comments || [];
  po.extractedComments = json.extractedComments || [];
  po.headers = json.headers || {};

  po.items = [];

  json.items.forEach(function(i) {
    var item = new PO.Item();

    item.msgid = i.msgid || '';
    item.msgctxt = i.msgctxt || null;
    item.references = i.references || [];
    item.msgid_plural = i.msgid_plural || null;
    item.msgstr = i.msgstr || [];
    item.comments = i.comments || [];
    item.extractedComments = i.extractedComments || [];
    item.flags = i.flags || {};
    item.obsolete = i.obsolete || false;
    item.nplurals = i.nplurals || 2;

    po.items.push(item);
  });

  return po.toString();
};

/**
 * TODO: docs
 */
var textInfo = function(text) {
  text = text || '';

  return {
    counts: {
      charsWithSpaces: text.length,
      chars: text.replace(/\s/gm, '').length,
      words: text.split(/\s+/gm).length
    }
  };
};

/**
 * TODO: docs
 */
var poInfo = function(po) {
  var info = {
    counts: {
      messages: {
        all: 0,
        translated: 0,
        fuzzy: 0,

        charsWithSpaces: 0,
        chars: 0,
        words: 0
      },
      context: {
        all: 0,

        charsWithSpaces: 0,
        chars: 0,
        words: 0
      }
    }
  };

  var poJson = PO.parse(po);
  var items = poJson.items || [];

  var updateCounts = function(entity, i) {
    var counts = info.counts[entity];
    var c = i.counts;

    counts.charsWithSpaces += c.charsWithSpaces || 0;
    counts.chars += c.chars || 0;
    counts.words += c.words || 0;
  };

  items.forEach(function(item) {
    var msgid = item.msgid ? item.msgid.trim() : '';
    var msgctxt = item.msgctxt ? item.msgctxt.trim() : '';
    var msgstr = item.msgstr ? item.msgstr.join(' ').trim() : '';

    if (msgid) {
      updateCounts('messages', textInfo(msgid));
    }

    if (msgctxt) {
      info.counts.context.all++;
      updateCounts('context', textInfo(msgctxt));
    }

    if (msgstr) {
      info.counts.messages.translated++;
    }

    if (item.flags.fuzzy) {
      info.counts.messages.fuzzy++;
    }
  });

  info.counts.messages.all = items.length;

  return info;
};

/**
 * TODO: docs
 */
var contextToComments = function(po) {
  var poJson = PO.parse(po);
  var items = poJson.items || [];

  items.forEach(function(item) {
    var exists = find(item.comments, function(comment) {
      return comment.indexOf(POT.CONTEXT_LABEL) >= 0;
    });

    if (!exists && item.msgctxt) {
      item.comments.push(POT.CONTEXT_LABEL);
    }
  });

  return jsonToPo(poJson);
};

/**
 * TODO: docs
 */
var findPoItem = function(items, msgid, msgctxt) {
  return find(items, function(item) {
    return (msgid || null) === (item.msgid || null) &&
      (msgctxt || null) === (item.msgctxt || null);
  });
};

/**
 * TODO: docs
 */
var getContextFromComments = function(item) {
  var comments = item.comments.join(' ');
  var i = comments.lastIndexOf(POT.CONTEXT_LABEL);

  return i >= 0 ? comments.substring(i + POT.CONTEXT_LABEL.length).trim() : '';
};

/**
 * TODO: docs
 */
var getMessageInfoFromComments = function(item) {
  var msgid = false;
  var msgctxt = false;

  item.extractedComments.forEach(function(comment) {
    if (comment.indexOf(POT.MSG_ID_LABEL) === 0) {
      msgid = comment.replace(POT.MSG_ID_LABEL + ' ', '');
    }
    if (comment.indexOf(POT.MSG_CONTEXT_LABEL) === 0) {
      msgctxt = comment.replace(POT.MSG_CONTEXT_LABEL + ' ', '');
    }
  });

  return {
    msgid: msgid,
    msgctxt: msgctxt
  };
};

/**
 * TODO: docs
 */
/*
var clearMessageInfoInComments = function(item) {
  var extractedComments = [];

  item.extractedComments.forEach(function(comment) {
    if (comment.indexOf(POT.MSG_ID_LABEL) !== 0 &&
        comment.indexOf(POT.MSG_CONTEXT_LABEL) !== 0) {
      extractedComments.push(comment);
    }
  });

  item.extractedComments = extractedComments;

  return item;
};
*/

/**
 * TODO: docs
 */
var transferPo = function(srcPo, dstPo) {
  var srcPoJson = PO.parse(srcPo);
  var srcItems = srcPoJson.items || [];

  var dstPoJson = PO.parse(dstPo);
  var dstItems = dstPoJson.items || [];

  srcItems.forEach(function(srcItem) {
    var dstItem = findPoItem(dstItems, srcItem.msgid, srcItem.msgctxt);

    if (!dstItem) {
      // console.warn(utils.formatTemplate(
      //   '[transferPo] no message found:' +
      //   '\n  msgid "{msgid}"\n  msgctxt "{msgctxt}"',
      //   null, {
      //     msgid: srcItem.msgid,
      //     msgctxt: srcItem.msgctxt
      // }));

      return;
    }

    var messageInfo = getMessageInfoFromComments(dstItem);

    if (messageInfo.msgctxt === false && srcItem.msgctxt) {
      dstItem.extractedComments.push(
        POT.MSG_CONTEXT_LABEL + ' ' + srcItem.msgctxt
      );
    }

    if (messageInfo.msgid === false) {
      dstItem.extractedComments.push(POT.MSG_ID_LABEL + ' ' + srcItem.msgid);
    }

    dstItem.msgid = (srcItem.msgstr && srcItem.msgstr.join(' ')) ||
      dstItem.msgid;

    dstItem.msgctxt = getContextFromComments(srcItem) || dstItem.msgctxt;
  });

  return jsonToPo(dstPoJson);
};

var restoreTransferPo = function(srcPo, dstPo) {
  var srcPoJson = PO.parse(srcPo);
  var srcItems = srcPoJson.items || [];

  var dstPoJson = PO.parse(dstPo);
  var dstItems = dstPoJson.items || [];

  srcItems.forEach(function(srcItem) {
    var messageInfo = getMessageInfoFromComments(srcItem);
    var dstItem = findPoItem(dstItems, messageInfo.msgid, messageInfo.msgctxt);

    if (!dstItem) {
      console.warn(utils.formatTemplate(
        '[transferPo] no message found:' +
        '\n  msgid "{msgid}"\n  msgctxt "{msgctxt}"',
        null, {
          msgid: srcItem.msgid,
          msgctxt: srcItem.msgctxt
      }));

      return;
    }

    var msgstr = srcItem.msgstr ? srcItem.msgstr.join(' ').trim() : '';

    dstItem.msgstr = msgstr ? srcItem.msgstr : dstItem.msgstr;
  });

  return jsonToPo(dstPoJson);
};

// -----------------------------------------------------------------------------

module.exports = {
  poToJson: poToJson,
  jsonToPo: jsonToPo,
  poInfo: poInfo,
  contextToComments: contextToComments,
  transferPo: transferPo,
  restoreTransferPo: restoreTransferPo
};
