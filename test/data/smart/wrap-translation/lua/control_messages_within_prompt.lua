local log = require('utils/log')

--------------------------------------------------------------------------------

local message_text = 'Message 1 Message 2 Message Message Message'

--------------------------------------------------------------------------------

local message_html = [[<div class="block">
  Message <div class="row">
            <a class="link"><i class="icon"></i> Message 1</a> Message 2 - Some text
            <input type="text" placeholder="Message"/>
          </div>
  <b>Message Message</b>
</div>]]

--------------------------------------------------------------------------------

if data['Message'] == 'Message' then
  data['Message'] = 'Some text'
end
