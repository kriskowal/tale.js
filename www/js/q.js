(function(e,i){function o(a){return a}function p(){var a=[],b,c=t(h.prototype);c.emit=function(){var d=Array.prototype.slice.call(arguments);a?a.push(d):m.apply(i,[b].concat(d))};c.valueOf=function(){if(a)return c;return b.valueOf()};var f=function(d){var g;if(a){b=k(d);d=0;for(g=a.length;d<g;++d)m.apply(i,[b].concat(a[d]));a=i}};return{promise:q(c),resolve:f,reject:function(d){f(j(d))}}}function h(a,b,c){if(b===i)b=function(d){return j("Promise does not support operation: "+d)};var f=t(h.prototype);
f.emit=function(d,g){g=g||o;var r=Array.prototype.slice.call(arguments,2);r=a[d]?a[d].apply(a,r):b.apply(a,arguments);return g(r)};if(c)f.valueOf=c;return q(f)}function s(a){return a instanceof h}function u(a){return!s(a.valueOf())}function j(a){return h({when:function(b){return b?b(a):j(a)}},function(b,c){var f=j(a);return c?c(f):f})}function k(a){if(s(a))return a;return h({when:function(){return a},get:function(b){return a[b]},put:function(b,c){a[b]=c},"delete":function(b){delete a[b]},post:function(b,
c){return a[b].apply(a,c)}},i,function(){return a})}function v(a,b,c){var f=p(),d=false;m(k(a),"when",function(g){if(!d){d=true;f.resolve(k(g).emit("when",b,c))}},function(g){if(!d){d=true;f.resolve(c?c(g):j(g))}});return f.promise}function l(a){return function(b){var c=p(),f=Array.prototype.slice.call(arguments,1);m.apply(i,[k(b),a,c.resolve].concat(f));return c.promise}}function m(a){var b=Array.prototype.slice.call(arguments,1);n(function(){try{a.emit.apply(a,b)}catch(c){w(c.stack||c)}})}var n;
try{n=require("event-queue").enqueue}catch(x){n=function(a){setTimeout(a,0)}}var w;w=typeof console!=="undefined"?function(a){console.log(a)}:typeof require!=="undefined"?require("system").print:function(){};var q=Object.freeze||o,t=Object.create||function(a){var b=function(){};b.prototype=a;object=new b};e.enqueue=n;e.defer=p;e.Promise=h;h.prototype.toSource=function(){return this.toString()};h.prototype.toString=function(){return"[object Promise]"};q(h.prototype);e.isPromise=s;e.isResolved=u;e.reject=
j;e.ref=k;e.when=v;e.asap=function(a,b,c){b=b||o;return u(a)?b(a.valueOf()).valueOf():v(a,b,c)};e.Method=l;e.get=l("get");e.put=l("put");e.del=l("del");e.post=l("post");e.defined=function(a){return e.when(a,function(b){if(b===i||b===null)return j("Resolved undefined value: "+b);return b})};e.error=function(a){a instanceof Error||(a=Error(a));throw a;}})(typeof exports!=="undefined"?exports:this["/q"]={});