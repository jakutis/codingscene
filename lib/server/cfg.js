var fs = require('fs');
var opt = require('optimist');

opt.usage('Usage: $0 [options]');
opt.demand('config');
opt.string('config');
opt.alias('config', 'c');
opt.describe('config', 'Path to configuration json file');
opt.boolean('help');
opt.alias('help', 'h');
opt.describe('help', 'Show this message');

var argv = opt.argv;
if(argv.help) {
    opt.showHelp();
    process.exit(1);
}

var filename = fs.realpathSync(argv.c);
var cfg = JSON.parse(fs.readFileSync(filename).toString());
cfg.salt = new Buffer(cfg.salt);
cfg.filename = filename;

module.exports = cfg;
