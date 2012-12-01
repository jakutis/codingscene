var fs = require('fs');
var v = require('valentine');
var common = require('./common');

var dir = __dirname + '/../styles';

var compile = function(type, filename) {
    var styles = fs.readdirSync(dir);
    styles.sort();
    styles = v.map(styles, function(style) {
        return dir + '/' + style;
    });
    styles.unshift(__dirname + '/../node_modules/bootstrap/docs/assets/css/bootstrap.css');

    fs.writeFileSync(__dirname + '/../public_html/style/index.css', v.map(styles, function(style) {
        return fs.readFileSync(style);
    }).join(''));
};

compile();
if(process.argv[2] === 'watch') {
    common.onchange(dir, '.css', compile);
}
