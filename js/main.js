;[].indexOf||(Array.prototype.indexOf=function(a,b,c,r){for(b=this,c=b.length,r=-1;~c;r=b[--c]===a?c:r);return r})
;[].filter||(Array.prototype.filter=function(a,b,c,d,e){for(b=this,d=0,c=[];d<b.length;d++)if(a.call(b,e=b[d]))c.push(e);return c})
Function.prototype.bind=(function(){}).bind||function(a,b){b=this;return function(){b.apply(a,arguments)}}
Array.isArray||(Array.isArray=function(a){return{}.toString.call(a)=='[object Array]'});

var Players = require('./players')
var Fb = require('./fb')
