'use strict';

var fs = require('fs');

var rootDirs = [ 'src', 'test' ];

var createSymlink = function(path, dst_path, type) {
  fs.exists(dst_path, function(exists) {
    if (!exists) {
      fs.symlinkSync(path, dst_path, type);
    }
  });
};

rootDirs.forEach(function(dir) {
  createSymlink('../' + dir, 'node_modules/' + dir, 'dir');
});
