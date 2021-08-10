#!/bin/bash

echo "generating mystic_symbolic_vocabulary.js"
cat <( echo 'var vocabulary =' ) \
  <( jq -c . _svg-vocabulary-pretty-printed.json ) \
  <( echo -e ';\nmodule.exports = { "vocabulary":vocabulary };' ) > mystic_symbolic_vocabulary.js

#cat <( echo 'var vocabulary = ' ) \
#  <( node gen-tarot-json.js ) \
#  <( echo -e ';\nmodule.exports = { "vocabulary":vocabulary };' ) > tarot_vocabulary.js

echo "generating tarot_vocabulary.js"
cat <( echo 'var vocabulary = ' ) \
  <( echo '[' ) \
  <( node gen-tarot-json.js | jq -c '.[]' | sed 's/$/,/' ) \
  <( jq  -c '.[0]' _svg-lovers.json ) \
  <( echo ']' ) \
  <( echo -e ';\nmodule.exports = { "vocabulary":vocabulary };' ) > tarot_vocabulary.js

echo "generating ../js/browser-sibyl.js"
browserify --standalone sibyl sibyl.js > ../js/browser-sibyl.js

