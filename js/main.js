[].indexOf||(Array.prototype.indexOf=function(a,b,c,r){for(b=this,c=b.length,r=-1;~c;r=b[--c]===a?c:r);return r})

var Players = require('./players')
var Fb = require('./fb')
