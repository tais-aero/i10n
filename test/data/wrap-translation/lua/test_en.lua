-- test

-- NO WRAP
local xxx = require 'xxx'
local xxx = require("xxx")
dofile "xxx"
dofile ('xxx')

-- WRAP
io.write("Hello word!")

-- NO WRAP
x = xxx["xxx"]
x = xxx["xxx"]['yyy']

-- NO WRAP
if x == "xxx" or y ~= [[zzz]] then
  -- WRAP
  x = [[xxx]]
else
  -- WRAP
  x = [[yyy]]
end

-- NO WRAP
x = bar('text') == baz('text')
x = bar('text') ~= baz('text')
x = bar('text') == baz('text') and bar('text_2') == baz('text_2')

-- NO WRAP
foo([[xxx]])
x = a.b.c.foo([[xxx]])

-- NO WRAP, WRAP
local xxx = foo("xxx", {
  Key_1 = 'text',
  Key_2 = 'text'
})

-- NO WRAP
error("xxx\nyyy\n")
error("xxx\n"..err)

-- NO WRAP, WRAP
local xxx = {
  ["yyy"] = {
    ['zzz'] = [[text]]
  }
}

-- NO WRAP:
x = ".xxx";
x = "#xxx";

-- NO WRAP:
x = "?app=filemanager&ajax=true&fileRequired=false";
x = "&mode=getfolder&time=";

-- WRAP:
x = "q?xxx";
x = "q&xxx";

-- NO WRAP:
x = "http://xxx.com";
x = "mailto:xxx@xxx.com";

-- NO WRAP:
x = "-x";
x = "x";

-- NO WRAP:
local SQLstring = [[SELECT ]] .. escape(columns) .. [[ FROM ]]
SQLstring = SQLstring .. [[ TABLE ]]
xxx.SQLstring = SQLstring .. [[ TABLE ]]
xxx.yyy.SQLstring = SQLstring .. [[ TABLE ]]
xxx[yyy].SQLstring = [[SELECT ]]
xxx = {SQLstring = "auxiliary"}

-- NO WRAP:
local function getfieldnames (headers)
  local disposition_hdr = headers["content-disposition"]
  local attrs = {}
  if disposition_hdr then
    gsub(disposition_hdr, ';%s*([^%s=]+)="(.-)"', function(attr, val)
	   attrs[attr] = val
         end)
  else
    error("Error processing multipart/form-data."..
          "\nMissing content-disposition header")
  end
  return attrs.name, attrs.filename
end
