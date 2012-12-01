run: build
	@echo ------------------- DONE ----------------------------------------------
	@echo
	@echo Now check `pwd`/config.sample.json for correct values and run:
	@echo '    codingscene -c '`pwd`'/config.sample.json'
	@echo
	@echo To create a database structure:
	@echo '    mysql -u root -p -h localhost codingscene < '`pwd`'/structure.sql'

build: node_modules node_modules/ace public_html/json/templates public_html/style diff_match_patch_20120106 bootstrap

node_modules/ace:
	npm install git://github.com/ajaxorg/ace.git

node_modules:
	npm up

public_html/style: bootstrap
	mkdir -p public_html/style
	node scripts/styles.js

public_html/json/templates:
	mkdir -p public_html/json/templates
	node scripts/templates.js

bootstrap:
	mkdir -p public_html/img
	git clone https://github.com/twitter/bootstrap
	cd bootstrap;PATH="../node_modules/.bin:$(PATH)" make
	cp bootstrap/docs/assets/img/glyphicons-halflings-white.png bootstrap/docs/assets/img/glyphicons-halflings.png public_html/img
	cp bootstrap/docs/assets/css/bootstrap.css styles/00-bootstrap.css

diff_match_patch_20120106:
	wget http://google-diff-match-patch.googlecode.com/files/diff_match_patch_20120106.zip
	unzip diff_match_patch_20120106.zip
	cp -r diff_match_patch_20120106 lib
	rm diff_match_patch_20120106.zip

clean:
	rm -rf bootstrap node_modules public_html/style public_html/json/templates
	rm -rf public_html/img
	rm -rf public_html/style styles/00-bootstrap.css
	rm -rf styles/00-bootstrap.css public_html/img
	rm -rf diff_match_patch_20120106 lib/diff_match_patch_20120106
