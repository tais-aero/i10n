'use strict';

var fs = require('fs');

var nodeModulesDir = 'node_modules';
var rootDirs = [ 'src', 'test' ];

if (!fs.existsSync(nodeModulesDir)) {
    fs.mkdirSync(nodeModulesDir);
}

var createSymlink = function(path, dst_path, type) {
  fs.exists(dst_path, function(exists) {
    if (!exists) {
      fs.symlinkSync(path, dst_path, type);
    }
  });
};

rootDirs.forEach(function(dir) {
  createSymlink('../' + dir, nodeModulesDir + '/' + dir, 'dir');
});
