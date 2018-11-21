var tr = require('L10n').translator;

// NO WRAP:
var xxx = require('xxx');

//
var test = {
  'yyy': tr.msg('Text'),
  'zzz': true
};

// NO WRAP:
if (test['xxx_1'] == 'text_1') {
  // WRAP:
  x = tr.msg('Text');
}

// NO WRAP:
if (x != 'text_1') {
  // WRAP:
  x = tr.msg('Text');
}

// NO WRAP:
if (test['xxx_1'] == 'text_1' || test['xxx_2'] === 'text_2' || test['xxx_1'] != 'text_1' || test['xxx_2'] !== 'text_2') {
  // WRAP:
  x = tr.msg('Text');
}

// NO WRAP, WRAP
x = (x == 'xxx' ? tr.msg('text_1') : tr.msg('text_2'));

// NO WRAP:
x = bar('text') == baz('text')
x = bar('text') === baz('text')
x = bar('text') != baz('text')
x = bar('text') !== baz('text')
x = bar('text') == baz('text') && bar('text_2') == baz('text_2')

// NO WRAP:
x = test['xxx_1']['text_2'];

// NO WRAP, WRAP
x = $("select[name='type']");
x = x.find('#xxx');
x = $("select[name='type']").text(tr.msg('text_1')).find('#' + 'xxx').append("xxx").text(tr.msg('text_1'));

// WRAP
$(function(){
  x = tr.msg('text_1');
});

// NO WRAP:
x = ".xxx";
x = "#xxx";

// NO WRAP:
x = "?app=filemanager&ajax=true&fileRequired=false";
x = "&mode=getfolder&time=";

// WRAP:
x = tr.msg("q?xxx");
x = tr.msg("q&xxx");

// NO WRAP:
x = "http://xxx.com";
x = "mailto:xxx@xxx.com";

// NO WRAP:
x = "-x";
x = "x";

// NO WRAP:
$('body').on('click', '#xxx', function () {
  // WRAP:
  x = tr.msg('Text');
});

x = x.append({
  // WRAP:
  text: tr.msg('Text')
});
