translator = require('i18n/translator')
tr = translator

m_1 = translator.message(
  'Ключ' + " " .. [[0_1]],
  "Контекст"..[[ ]] +
  '0_1', {
  count = 0
})

tr.msg(
  'Ключ 0_1',
  [[Контекст 0_1]], {
  count = 0
})

m_2 = tr.message("Ключ 0_1")

m_3 = tr.message()

tr.message(m1, m2, m3)

-- message variations
translator.message()

translator.message('Ключ 0_1')

translator.message([[Ключ 0_1]], [[Контекст 0_1]])

translator.message("Ключ 0_1", {
  count = 123
})

translator.message([[Ключ 0_1]], [[Контекст 0_1]], {
  count = 1
})

-- TODO: multiline..
-- translator.message(
--   [[
--     Ключ 2_1
--     _2
--     _m
--   ]],
--   [[
--     Контекст 2_1
--     _3
--     _m
--   ]]
-- )
