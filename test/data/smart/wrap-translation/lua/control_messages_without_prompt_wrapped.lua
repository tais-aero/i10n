tr = require('L10n').translator

local log = require('utils/log')

--------------------------------------------------------------------------------

local message_text = tr.msg('Message')

message_text = 'XXX ' .. tr.msg('Message')
message_text = tr.msg('Message') .. ' XXX'
message_text = 'XXX ' .. tr.msg('Message') .. ' XXX'

message_text = "XXX " .. tr.msg('Message') .. " XXX"
message_text = [[XXX ]] .. tr.msg('Message') .. [[ XXX]]

message_text = ('XXX ' .. tr.msg('Message') .. ' XXX')..("XXX " .. tr.msg('Message') .. " XXX")..([[XXX ]] .. tr.msg('Message') .. [[ XXX]])

message_text = tr.msg('Message Message')
message_text = tr.msg('Message 1') .. ' ' .. tr.msg('Message 2') .. ' ' .. tr.msg('Message Message') .. ' ' .. tr.msg('Message')

local no_message_text = 'Some text'

--------------------------------------------------------------------------------

message_html = [[<div class="block">
  ]] .. tr.msg('Message') .. [[ <div class="row">
            <a class="link"><i class="icon"></i> ]] .. tr.msg('Message 1') .. [[</a> ]] .. tr.msg('Message 2') .. [[ - Some text
            <input type="text" placeholder="]] .. tr.msg('Message') .. [["/>
          </div>
  <b>]] .. tr.msg('Message Message') .. [[</b>
</div>]]

--------------------------------------------------------------------------------

if data[tr.msg('Message')] == tr.msg('Message') then
  data[tr.msg('Message')] = 'Some text'
end
