'use strict';

// -----------------------------------------------------------------------------

/**
 * Character for glue of message key & context.
 */
var CONTEXT_GLUE = '\u0004';

/**
 * Label for context.
 */
var CONTEXT_LABEL = 'CONTEXT:';

/**
 * Label for message context.
 */
var MSG_CONTEXT_LABEL = '[msgctxt]';

/**
 * Label for message id.
 */
var MSG_ID_LABEL = '[msgid]';

/**
 * 'TODO' text.
 */
var TODO = 'TODO';

/**
 * TODO: docs
 */
var PO_HEADERS = {
  "Project-Id-Version": "TAIS i18n",
  "Report-Msgid-Bugs-To": "",
  "POT-Creation-Date": "",
  "PO-Revision-Date": "",
  "Last-Translator": "",
  "Language": "",
  "Language-Team": "JSC TAIS <office@tais.ru>",
  "Content-Type": "text/plain; charset=UTF-8",
  "Content-Transfer-Encoding": "8bit",
  "Plural-Forms": "",
  "MIME-Version": "1.0",
  "X-Generator": ""
};

// -----------------------------------------------------------------------------

module.exports = {
  CONTEXT_GLUE: CONTEXT_GLUE,
  CONTEXT_LABEL: CONTEXT_LABEL,
  TODO: TODO,
  MSG_CONTEXT_LABEL: MSG_CONTEXT_LABEL,
  MSG_ID_LABEL: MSG_ID_LABEL,
  PO_HEADERS: PO_HEADERS
};
