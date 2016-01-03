#!/bin/sh

targetdir="./"

thisdir="`dirname \"$0\"`"
cd "$thisdir" &&

#concat all
cat ./src/testisimo.js ./src/testisimo-angular-app.js ./src/actions/*.js > "$targetdir"testisimo.js &&

#minify all
uglifyjs ./src/testisimo.js ./src/testisimo-angular-app.js ./src/actions/*.js \
-m toplevel,eval \
-r getClassValue,getObjValue,encode \
-c sequences,dead_code,drop_debugger,conditionals,comparisons,booleans,loops,unused,hoist_funs,hoist_vars,if_return,join_vars,cascade \
--source-map ./testisimo.min.js.map \
--source-map-root ./testisimo.min.js.map \
-o "$targetdir"testisimo.min.js ||

# stop if error
read -p "Some error occured, press [Enter] key to exit..."