var tr = translator = require('i18n/translator');

var m_1 = translator.message(
  'Ключ' + ' ' + '0_1',
  'Контекст' + ' ' +
  '0_1', {
  count: 0
});

tr.msg(
  'Ключ 0_1',
  'Контекст 0_1', {
  count: 0
});

var m_2 = tr.message('Ключ 0_1');

var m_3 = tr.message();

tr.message(m1, m2, m3);

// message variations
translator.message();

translator.message('Ключ 0_1');

translator.message('Ключ 0_1', 'Контекст 0_1');

translator.message('Ключ 0_1', {
  count: 123
});

translator.message('Ключ 0_1', 'Контекст 0_1', {
  count: 1
});

//
module.exports = {
  m_1: m_1,
  m_2: m_2,
  m_3: m_3
};
