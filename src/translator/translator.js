'use strict';

var merge = require('lodash/object/merge');
var get = require('lodash/object/get');
var escape = require('lodash/string/escape');
var forEach = require('lodash/collection/forEach');

// TEMP:
// var testUtils = require('test/utils');
// -----------------------------------------------------------------------------

var Globalize = require('globalize');

Globalize.load(
  require('cldr-data/supplemental/likelySubtags'),
  require( 'cldr-data/supplemental/plurals')
);

// -----------------------------------------------------------------------------

var utils = require('src/core/utils');
var poUtils = require('src/core/po/utils');

// -----------------------------------------------------------------------------

var TEMPLATE_OPTIONS = {
  interpolate: /{([\s\S]+?)}/g
};

var GLOBALIZE_ESCAPE_STRING = '\u0006'; // [ACKNOWLEDGE]{1}

/**
 * Default config
 */
var DEFAULT_CONFIG = {
  /**
   * Base locale for message keys
   */
  baseLocale: 'ru',

  /**
   * Don't escape message
   */
  noEscape: false,

  /**
   * Template for untranslated message.
   * This formatted template will be used instead of untranslated messages.
   * Note: This template will not be used for base locale messages.
   * `untranslatedMessageData` -- data for `untranslatedMessageTemplate`.
   * Note: `_messageKey_`, `_locale_` data keys is reserved.
   *
   * @example
   *
   * {
   *   untranslatedMessageTemplate: '<b class="{cls}">{_messageKey_}</b>',
   *   untranslatedMessageData: {
   *     cls: 'untranslated'
   *   }
   * }
   *
   * translator.message('blah-blah-blah');
   * // => '<b class="untranslated">blah-blah-blah</b>'
   */
  untranslatedMessageTemplate: '',
  untranslatedMessageData: {}
};

var MESSAGE_KEY_PROPERTY_NAME = '_messageKey_';
var LOCALE_PROPERTY_NAME = '_locale_';

/**
 * Translator class
 */
var Translator = function() {
  this.setConfig();
  this.setLocale(this._config.baseLocale);
};

Translator.prototype = {

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
   * Get config.
   *
   * @returns {Object} Current config.
   */
  getConfig: function() {
    return this._config;
  },

  /**
   * Set default locale.
   *
   * @param {String} locale Locale string, e.g. 'en', 'ru', 'zh-Hant-TW'.
   * @returns {String} Default locale.
   */
  setLocale: function(locale) {
    var cldr = Globalize.locale(locale);
    return cldr.locale;
  },

  /**
   * Get default locale.
   *
   * @returns {String} Default locale.
   */
  getLocale: function() {
    var cldr = Globalize.locale();
    return cldr.locale;
  },

  /**
   * Load messages data.
   *
   * The first level of keys must be locales.
   *
   * ICU MessageFormat pattern is supported:
   * variable replacement, gender and plural inflections.
   *
   * @param {Object} JSON object of messages data.
   * Keys can use any character, except /, {, }.
   * \u0004 character is glue of the message context,
   * see: `POT.CONTEXT_GLUE`, `core.utils.buildMessageKey`.
   * Values (i.e., the message content itself) can contain any character.
   *
   * @example
   *  {
   *    en: {
   *      'Key': 'Message',
   *      'Key\u0004Context': 'Message by Context',
   *      'Matches\u0004Match Search': '
   *        {count, plural,
   *          =0 {No matches found}
   *          =1 {Only one match}
   *         one {Match}
   *       other {Matches}}
   *      '
   *    },
   *    ru: {
   *      ...
   *    }
   *  }
   */
  loadMessages: function(json) {
    this._loadMessages(json);
  },

  /**
   * Load messages data from po files.
   *
   * See `loadMessages`.
   *
   * TODO:
   *
   * @param {Array} pos Array of: po (utf-8) as string.
   */
  loadMessagesFromPo: function(pos) {
    var messages = {};

    pos.forEach(function(po) {
      var poData = poUtils.poToJson(po);
      var locale = poData.headers.Language;
      var localeMessages = {};

      poData.items.forEach(function(item) {
        var messageKey = utils.buildMessageKey(item.msgid, item.msgctxt);
        var message = item.msgstr.join('');

        localeMessages[messageKey] = message;
      });

      messages[locale] = localeMessages;
    });

    this._loadMessages(messages);
  },

  /**
   * Get message by key or by key & context.
   * Fot formatted message uses variables object.
   *
   * See `loadMessages`.
   *
   * @alias msg
   *
   * @param {String} config Message key.
   * @param {String} [context] Message context.
   * TODO: @param {Object} [data] Variables object,
   * where each property can be referenced by name inside a message.
   * @returns {String} Translated and/or formatted message.
   */
  message: function(/*key, context, data*/) {
    var args = utils.buildMessageArguments.apply(this, arguments);

    var key = args.key;
    var context = args.context;
    var data = args.data;

    var messageKey = utils.buildMessageKey(key, context);
    var locale = this.getLocale();
    var isTranslated = get(this._messages, [ locale, messageKey ]);

    if (isTranslated) {
      var globalizeMessageKey = this._messageKeyToGlobalizeKey(messageKey);

      var message = Globalize.formatMessage(
        globalizeMessageKey, data === null ? undefined : data
      );

      return this._toMessage(message);
    }

    return this._buildUntranslatedMessage(locale, key, messageKey, data);
  },

  _toMessage: function(text) {
    return this._config.noEscape ? text : escape(text);
  },

  _loadMessages: function(json) {
    json = json || {};

    var me = this;
    var baseLocale = me._config.baseLocale;
    var rawJson = {};
    var globalizeJson = {};

    forEach(json, function(messages, locale) {
      var rawMessages = locale === baseLocale ? {} : messages;
      var globalizeMessages = {};

      forEach(messages, function(message, messageKey) {
        if (locale === baseLocale) {
          var k = utils.unbuildMessageKey(messageKey);
          message = message || k.key;
          rawMessages[messageKey] = message;
        }

        var globalizeMessageKey = me._messageKeyToGlobalizeKey(messageKey);
        globalizeMessages[globalizeMessageKey] = message;
      });

      rawJson[locale] = rawMessages;
      globalizeJson[locale] = globalizeMessages;
    });

    me._messages = rawJson;
    Globalize.loadMessages(globalizeJson);
  },

  _messageKeyToGlobalizeKey: function(messageKey) {
    // Escape `/`, `{` and `}`
    // see:
    // github.com/globalizejs/globalize/
    // blob/master/doc/api/message/load-messages.md#parameters
    return messageKey.replace(/[/{}]/gm, GLOBALIZE_ESCAPE_STRING);
  },

  // TODO: FIXME: deduplicate code, see: Translator::message(...)
  _buildUntranslatedMessage: function(locale, key, messageKey, data) {
    var config = this._config;

    if (!config.untranslatedMessageTemplate || locale === config.baseLocale) {
      return this._toMessage(key);
    }

    var message = key;
    var isKey = get(this._messages, [ config.baseLocale, messageKey ]);

    if (isKey) {
      var globalizeMessageKey = this._messageKeyToGlobalizeKey(messageKey);

      Globalize.locale(config.baseLocale);

      message = Globalize.formatMessage(
        globalizeMessageKey, data === null ? undefined : data
      );

      Globalize.locale(locale);
    }

    var templateData = {};

    templateData[LOCALE_PROPERTY_NAME] = locale;
    templateData[MESSAGE_KEY_PROPERTY_NAME] = this._toMessage(message);
    merge(templateData, config.untranslatedMessageData);

    return utils.formatTemplate(
      config.untranslatedMessageTemplate,
      TEMPLATE_OPTIONS,
      templateData
    );
  }
};

// -----------------------------------------------------------------------------

// Aliases
var prototype = Translator.prototype;

prototype.msg = prototype.message;

// -----------------------------------------------------------------------------

module.exports = new Translator();
