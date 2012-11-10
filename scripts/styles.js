var fs = require('fs');
var v = require('valentine');
var common = require('./common');

var dir = __dirname + '/../styles';

var compile = function(type, filename) {
    var styles = fs.readdirSync(dir);
    styles.sort();
    var index = v.map(styles, function(style) {
        return fs.readFileSync(dir + '/' + style);
    }).join('');
    fs.writeFileSync(__dirname + '/../public_html/style/index.css', index);
};

compile();
if(process.argv[2] === 'watch') {
    common.onchange(dir, '.css', compile);
}
