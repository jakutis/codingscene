run: build
	@echo ------------------- DONE ----------------------------------------------
	@echo
	@echo Now check `pwd`/config.sample.json for correct values and run:
	@echo '    codingscene -c '`pwd`'/config.sample.json'
	@echo
	@echo To create a database structure:
	@echo '    mysql -u root -p -h localhost codingscene < '`pwd`'/structure.sql'

build: node_modules public_html/json/templates public_html/style diff_match_patch_20120106

node_modules:
	npm up

public_html/style: node_modules
	mkdir -p public_html/style
	node scripts/styles.js

public_html/json/templates: node_modules
	mkdir -p public_html/json/templates
	node scripts/templates.js

diff_match_patch_20120106:
	wget http://google-diff-match-patch.googlecode.com/files/diff_match_patch_20120106.zip
	unzip diff_match_patch_20120106.zip
	cp -r diff_match_patch_20120106 lib
	rm diff_match_patch_20120106.zip

clean:
	rm -rf node_modules public_html/style public_html/json/templates
	rm -rf public_html/style
	rm -rf diff_match_patch_20120106 lib/diff_match_patch_20120106
