var tr = require('L10n').translator;

var log = require('utils/log');

// -----------------------------------------------------------------------------

message_text = tr.msg('Message');
message_text = tr.msg("Message");

message_text = tr.msg('Message 1') + ' ' + tr.msg('Message 2');
message_text = tr.msg("Message 1") + " " + tr.msg("Message 2");

// -----------------------------------------------------------------------------

message_text = tr.msg('Message 1') + ' XXX ' + tr.msg('Message 2');
message_text = tr.msg("Message 1") + " XXX " + tr.msg("Message 2");

message_text = 'XXX ' + tr.msg('Message 1') + ' XXX ' + tr.msg('Message 2') + ' XXX';
message_text = "XXX " + tr.msg("Message 1") + " XXX " + tr.msg("Message 2") + " XXX";

// -----------------------------------------------------------------------------

var no_message_text = 'Some text';

// -----------------------------------------------------------------------------

message_text = tr.msg('Message Message');
message_text = tr.msg("Message Message");

message_text = tr.msg('Message 1') + ' ' + tr.msg('Message 2') + ' ' + tr.msg('Message Message') + ' ' + tr.msg('Message');
message_text = tr.msg("Message 1") + " " + tr.msg("Message 2") + " " + tr.msg("Message Message") + " " + tr.msg("Message");

// -----------------------------------------------------------------------------

message_html = '<div class="block">' + tr.msg('Message') + '</div>addMessage MessageAdd "add" ' + tr.msg('Message');
message_html = tr.msg('Message') + ' <div class="block">' + tr.msg('Message') + '</div>addMessage MessageAdd [[add]]';
message_html = tr.msg('Message') + ' <div class="block">' + tr.msg('Message') + '</div>addMessage MessageAdd add ' + tr.msg('Message');
message_html = '[[add]] ' + tr.msg('Message') + ' <div class="block">' + tr.msg('Message') + '</div>addMessage MessageAdd add ' + tr.msg('Message');

message_html = "<div class='block'>" + tr.msg("Message") + "</div>addMessage MessageAdd [[add]] " + tr.msg("Message");
message_html = tr.msg("Message") + " <div class='block'>" + tr.msg("Message") + "</div>addMessage MessageAdd 'add'";
message_html = tr.msg("Message") + " <div class='block'>" + tr.msg("Message") + "</div>addMessage MessageAdd add " + tr.msg("Message");
message_html = "'add' " + tr.msg("Message") + " <div class='block'>" + tr.msg("Message") + "</div>addMessage MessageAdd add " + tr.msg("Message");

// -----------------------------------------------------------------------------

message_html = '\
  <div class="block">\
    ' + tr.msg('Message') + ' <div class="row">\
              <a class="link"><i class="icon"></i> ' + tr.msg('Message 1') + '</a> ' + tr.msg('Message 2') + ' - Some text\
              <input type="text" placeholder="' + tr.msg('Message') + '"/>\
            </div>\
    <b>' + tr.msg('Message Message') + '</b>\
  </div>addMessage MessageAdd add ' + tr.msg('Message') + '\
'; // Some comment

// -----------------------------------------------------------------------------

if (data[tr.msg('Message')] == tr.msg("Message")) {
  data[tr.msg("Message")] = 'Some text'
}

// -----------------------------------------------------------------------------

message_text = 'M';
message_text = ' M ';

message_text = tr.msg('Message Z.');
message_text = ' ' + tr.msg('Message Z.') + ' ';

message_text = 'XXX.Message.XXX';
message_text = 'XXX-Message-XXX';
message_text = 'XXX_Message_XXX';

message_text = tr.msg('Message + Message');
message_text = tr.msg('Message - Message');
message_text = tr.msg('Message * Message');
message_text = tr.msg('Message / Message');
message_text = tr.msg('Message = Message');
message_text = tr.msg('Message ? Message');

message_text = tr.msg('Message');
message_text = tr.msg("Message");
