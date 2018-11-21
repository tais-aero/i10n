var log = require('utils/log');

// -----------------------------------------------------------------------------

message_text = 'Message';
message_text = "Message";

message_text = 'Message 1 Message 2';
message_text = "Message 1 Message 2";

// -----------------------------------------------------------------------------

message_text = 'Message 1 XXX Message 2';
message_text = "Message 1 XXX Message 2";

message_text = 'XXX Message 1 XXX Message 2 XXX';
message_text = "XXX Message 1 XXX Message 2 XXX";

// -----------------------------------------------------------------------------

var no_message_text = 'Some text';

// -----------------------------------------------------------------------------

message_text = 'Message Message';
message_text = "Message Message";

message_text = 'Message 1 Message 2 Message Message Message';
message_text = "Message 1 Message 2 Message Message Message";

// -----------------------------------------------------------------------------

message_html = '<div class="block">Message</div>addMessage MessageAdd "add" Message';
message_html = 'Message <div class="block">Message</div>addMessage MessageAdd [[add]]';
message_html = 'Message <div class="block">Message</div>addMessage MessageAdd add Message';
message_html = '[[add]] Message <div class="block">Message</div>addMessage MessageAdd add Message';

message_html = "<div class='block'>Message</div>addMessage MessageAdd [[add]] Message";
message_html = "Message <div class='block'>Message</div>addMessage MessageAdd 'add'";
message_html = "Message <div class='block'>Message</div>addMessage MessageAdd add Message";
message_html = "'add' Message <div class='block'>Message</div>addMessage MessageAdd add Message";

// -----------------------------------------------------------------------------

message_html = '\
  <div class="block">\
    Message <div class="row">\
              <a class="link"><i class="icon"></i> Message 1</a> Message 2 - Some text\
              <input type="text" placeholder="Message"/>\
            </div>\
    <b>Message Message</b>\
  </div>addMessage MessageAdd add Message\
'; // Some comment

// -----------------------------------------------------------------------------

if (data['Message'] == "Message") {
  data["Message"] = 'Some text'
}

// -----------------------------------------------------------------------------

message_text = 'M';
message_text = ' M ';

message_text = 'Message Z.';
message_text = ' Message Z. ';

message_text = 'XXX.Message.XXX';
message_text = 'XXX-Message-XXX';
message_text = 'XXX_Message_XXX';

message_text = 'Message + Message';
message_text = 'Message - Message';
message_text = 'Message * Message';
message_text = 'Message / Message';
message_text = 'Message = Message';
message_text = 'Message ? Message';

message_text = tr.msg('Message');
message_text = tr.msg("Message");
