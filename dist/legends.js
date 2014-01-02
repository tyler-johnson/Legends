/*!
 * Legends.js
 * MIT License
 * https://github.com/nodejitsu/http-server.git 
 */

(function() {

/**
* D.js
* Original by Jonathan Gotti <https://github.com/malko/D.js> 
* MIT License
* Slightly modified for use in this library
*/
var D = (function(undef){
	"use strict";

	var nextTick
		, isFunc = function(f){ return ( typeof f === 'function' ); }
		, isArray = function(a){ return Array.isArray ? Array.isArray(a) : (a instanceof Array); }
		, isObjOrFunc = function(o){ return !!(o && (typeof o).match(/function|object/)); }
		, isNotVal = function(v){ return (v === false || v === undef || v === null); }
		, slice = function(a, offset){ return [].slice.call(a, offset); }
		, undefStr = 'undefined'
		, tErr = typeof TypeError === undefStr ? Error : TypeError
	;
	if ( (typeof process !== undefStr) && process.nextTick ) {
		nextTick = process.nextTick;
	} else if ( typeof MessageChannel !== undefStr ) {
		var ntickChannel = new MessageChannel(), queue = [];
		ntickChannel.port1.onmessage = function(){ queue.length && (queue.shift())(); };
		nextTick = function(cb){
			queue.push(cb);
			ntickChannel.port2.postMessage(0);
		};
	} else {
		nextTick = function(cb){ setTimeout(cb, 0); };
	}
	function rethrow(e){ nextTick(function(){ throw e;}); }

	/**
	 * @typedef deferred
	 * @property {promise} promise
	 * @method resolve
	 * @method fulfill
	 * @method reject
	 */

	/**
	 * @typedef {function} fulfilled
	 * @param {*} value promise resolved value
	 * @returns {*} next promise resolution value
	 */

	/**
	 * @typedef {function} failed
	 * @param {*} reason promise rejection reason
	 * @returns {*} next promise resolution value or rethrow the reason
	 */

	//-- defining unenclosed promise methods --//
	/**
	 * same as then without failed callback
	 * @param {fulfilled} fulfilled callback
	 * @returns {promise} a new promise
	 */
	function promise_success(fulfilled){ return this.then(fulfilled, undef); }

	/**
	 * same as then with only a failed callback
	 * @param {failed} failed callback
	 * @returns {promise} a new promise
	 */
	function promise_error(failed){ return this.then(undef, failed); }


	/**
	 * same as then but fulfilled callback will receive multiple parameters when promise is fulfilled with an Array
	 * @param {fulfilled} fulfilled callback
	 * @param {failed} failed callback
	 * @returns {promise} a new promise
	 */
	function promise_apply(fulfilled, failed){
		return this.then(
			function(a){
				return isFunc(fulfilled) ? fulfilled.apply(null, isArray(a) ? a : [a]) : (defer.onlyFuncs ? a : fulfilled);
			}
			, failed || undef
		);
	}

	/**
	 * cleanup method which will be always executed regardless fulfillment or rejection
	 * @param {function} cb a callback called regardless of the fulfillment or rejection of the promise which will be called
	 *                      when the promise is not pending anymore
	 * @returns {promise} the same promise untouched
	 */
	function promise_ensure(cb){
		function _cb(){ cb(); }
		this.then(_cb, _cb);
		return this;
	}

	/**
	 * take a single callback which wait for an error as first parameter. other resolution values are passed as with the apply/spread method
	 * @param {function} cb a callback called regardless of the fulfillment or rejection of the promise which will be called
	 *                      when the promise is not pending anymore with error as first parameter if any as in node style
	 *                      callback. Rest of parameters will be applied as with the apply method.
	 * @returns {promise} a new promise
	 */
	function promise_nodify(cb){
		return this.then(
			function(a){
				return isFunc(cb) ? cb.apply(null, [undefined, a]) : (defer.onlyFuncs ? a : cb);
			}
			, function(e){
				return cb(e);
			}
		);
	}

	/**
	 *
	 * @param {function} [failed] without parameter will only rethrow promise rejection reason outside of the promise library on next tick
	 *                            if passed a failed method then will call failed on rejection and throw the error again if failed didn't
	 * @returns {promise} a new promise
	 */
	function promise_rethrow(failed){
		return this.then(
			undef
			, failed ? function(e){ failed(e); throw e; } : rethrow
		);
	}

	/**
	* @param {boolean} [alwaysAsync] if set force the async resolution for this promise independantly of the D.alwaysAsync option
	* @returns {deferred} defered object with property 'promise' and methods reject,fulfill,resolve (fulfill being an alias for resolve)
	*/
	var defer = function (alwaysAsync){
		var alwaysAsyncFn = (undef !== alwaysAsync ? alwaysAsync : defer.alwaysAsync) ? nextTick : function(fn){fn();}
			, status = 0 // -1 failed | 1 fulfilled
			, pendings = []
			, value
			/**
			 * @typedef promise
			 */
			, _promise  = {
				/**
				 * @param {fulfilled|function} fulfilled callback
				 * @param {failed|function} failed callback
				 * @returns {promise} a new promise
				 */
				then: function(fulfilled, failed){
					var d = defer();
					pendings.push([
						function(value){
							try{
								if( isNotVal(fulfilled)){
									d.resolve(value);
								} else {
									d.resolve(isFunc(fulfilled) ? fulfilled(value) : (defer.onlyFuncs ? value : fulfilled));
								}
							}catch(e){
								d.reject(e);
							}
						}
						, function(err){
							if ( isNotVal(failed) || ((!isFunc(failed)) && defer.onlyFuncs) ) {
								d.reject(err);
							}
							if ( failed ) {
								try{ d.resolve(isFunc(failed) ? failed(err) : failed); }catch(e){ d.reject(e);}
							}
						}
					]);
					status !== 0 && alwaysAsyncFn(execCallbacks);
					return d.promise;
				}

				, success: promise_success

				, error: promise_error
				, otherwise: promise_error

				, apply: promise_apply
				, spread: promise_apply

				, ensure: promise_ensure

				, nodify: promise_nodify

				, rethrow: promise_rethrow

				, isPending: function(){ return !!(status === 0); }

				, getStatus: function(){ return status; }
			}
		;
		_promise.toSource = _promise.toString = _promise.valueOf = function(){return value === undef ? this : value; };


		function execCallbacks(){
			if ( status === 0 ) {
				return;
			}
			var cbs = pendings, i = 0, l = cbs.length, cbIndex = ~status ? 0 : 1, cb;
			pendings = [];
			for( ; i < l; i++ ){
				(cb = cbs[i][cbIndex]) && cb(value);
			}
		}

		/**
		 * fulfill deferred with given value
		 * @param {*} val
		 * @returns {deferred} this for method chaining
		 */
		function _resolve(val){
			var done = false;
			function once(f){
				return function(x){
					if (done) {
						return undefined;
					} else {
						done = true;
						return f(x);
					}
				};
			}
			if ( status ) {
				return this;
			}
			try {
				var then = isObjOrFunc(val) && val.then;
				if ( isFunc(then) ) { // managing a promise
					if( val === _promise ){
						throw new tErr("Promise can't resolve itself");
					}
					then.call(val, once(_resolve), once(_reject));
					return this;
				}
			} catch (e) {
				once(_reject)(e);
				return this;
			}
			alwaysAsyncFn(function(){
				value = val;
				status = 1;
				execCallbacks();
			});
			return this;
		}

		/**
		 * reject deferred with given reason
		 * @param {*} Err
		 * @returns {deferred} this for method chaining
		 */
		function _reject(Err){
			status || alwaysAsyncFn(function(){
				try{ throw(Err); }catch(e){ value = e; }
				status = -1;
				execCallbacks();
			});
			return this;
		}
		return /**@type deferred */ {
			promise:_promise
			,resolve:_resolve
			,fulfill:_resolve // alias
			,reject:_reject
		};
	};

	defer.deferred = defer.defer = defer;
	defer.nextTick = nextTick;
	defer.alwaysAsync = true; // setting this will change default behaviour. use it only if necessary as asynchronicity will force some delay between your promise resolutions and is not always what you want.
	/**
	* setting onlyFuncs to false will break promises/A+ conformity by allowing you to pass non undefined/null values instead of callbacks
	* instead of just ignoring any non function parameters to then,success,error... it will accept non null|undefined values.
	* this will allow you shortcuts like promise.then('val','handled error'')
	* to be equivalent of promise.then(function(){ return 'val';},function(){ return 'handled error'})
	*/
	defer.onlyFuncs = true;

	/**
	 * return a fulfilled promise of given value (always async resolution)
	 * @param {*} value
	 * @returns {promise}
	 */
	defer.resolved = defer.fulfilled = function(value){ return defer(true).resolve(value).promise; };

	/**
	 * return a rejected promise with given reason of rejection (always async rejection)
	 * @param {*} reason
	 * @returns {promise}
	 */
	defer.rejected = function(reason){ return defer(true).reject(reason).promise; };

	/**
	 * return a promise with no resolution value which will be resolved in time ms (using setTimeout)
	 * @param {int} [time] in ms default to 0
	 * @returns {promise}
	 */
	defer.wait = function(time){
		var d = defer();
		setTimeout(d.resolve, time || 0);
		return d.promise;
	};

	/**
	 * return a promise for the return value of function call which will be fulfilled in delay ms or rejected if given fn throw an error
	 * @param {function} fn
	 * @param {int} [delay] in ms default to 0
	 * @returns {promise}
	 */
	defer.delay = function(fn, delay){
		var d = defer();
		setTimeout(function(){ try{ d.resolve(fn.apply(null)); }catch(e){ d.reject(e); } }, delay || 0);
		return d.promise;
	};

	/**
	 * if given value is not a promise return a fulfilled promise resolved to given value
	 * @param {*} promise a value or a promise
	 * @returns {promise}
	 */
	defer.promisify = function(promise){
		if ( promise && isFunc(promise.then) ) { return promise;}
		return defer.resolved(promise);
	};

	function multiPromiseResolver(callerArguments, returnPromises){
		var promises = slice(callerArguments);
		if ( promises.length === 1 && isArray(promises[0]) ) {
			if(! promises[0].length ){
				return defer.fulfilled([]);
			}
			promises = promises[0];
		}
		var args = []
			, d = defer()
			, c = promises.length
		;
		if ( !c ) {
			d.resolve(args);
		} else {
			var resolver = function(i){
				promises[i] = defer.promisify(promises[i]);
				promises[i].then(
					function(v){
						if (! (i in args) ) { //@todo check this is still required as promises can't be resolve more than once
							args[i] = returnPromises ? promises[i] : v;
							(--c) || d.resolve(args);
						}
					}
					, function(e){
						if(! (i in args) ){
							if( ! returnPromises ){
								d.reject(e);
							} else {
								args[i] = promises[i];
								(--c) || d.resolve(args);
							}
						}
					}
				);
			};
			for( var i = 0, l = c; i < l; i++ ){
				resolver(i);
			}
		}
		return d.promise;
	}

	/**
	 * return a promise for all given promises / values.
	 * the returned promises will be fulfilled with a list of resolved value.
	 * if any given promise is rejected then on the first rejection the returned promised will be rejected with the same reason
	 * @param {array|...*} [promise] can be a single array of promise/values as first parameter or a list of direct parameters promise/value
	 * @returns {promise} of a list of given promise resolution value
	 */
	defer.all = function(){ return multiPromiseResolver(arguments,false); };

	/**
	 * return an always fulfilled promise of array<promise> list of promises/values regardless they resolve fulfilled or rejected
	 * @param {array|...*} [promise] can be a single array of promise/values as first parameter or a list of direct parameters promise/value
	 *                     (non promise values will be promisified)
	 * @returns {promise} of the list of given promises
	 */
	defer.resolveAll = function(){ return multiPromiseResolver(arguments,true); };

	/**
	 * transform a typical nodejs async method awaiting a callback as last parameter, receiving error as first parameter to a function that
	 * will return a promise instead. the returned promise will resolve with normal callback value minus the first error parameter on
	 * fulfill and will be rejected with that error as reason in case of error.
	 * @param {object} [subject] optional subject of the method to encapsulate
	 * @param {function} fn the function to encapsulate if the normal callback should receive more than a single parameter (minus the error)
	 *                      the promise will resolve with the list or parameters as fulfillment value. If only one parameter is sent to the
	 *                      callback then it will be used as the resolution value.
	 * @returns {Function}
	 */
	defer.nodeCapsule = function(subject, fn){
		if ( !fn ) {
			fn = subject;
			subject = void(0);
		}
		return function(){
			var d = defer(), args = slice(arguments);
			args.push(function(err, res){
				err ? d.reject(err) : d.resolve(arguments.length > 2 ? slice(arguments, 1) : res);
			});
			try{
				fn.apply(subject, args);
			}catch(e){
				d.reject(e);
			}
			return d.promise;
		};
	};

	return defer;

})();

function flattenArgs(args, out) {
	args = Array.prototype.slice.call(args, 0);
	if (out == null) out = [];

	args.forEach(function(v) {
		Array.isArray(v) ? flattenArgs(v, out) : out.push(v);
	});

	return out;
}

function stringifyPrimitive(v) {
	if (typeof v == "string") return v;
	if (typeof v == "boolean") return v ? 'true' : 'false';
	return '';
}

function stringifyQuery(obj, sep, eq) {
	if (obj == null) obj = void 0;
	if (sep == null) sep = '&';
	if (eq == null) eq = '=';

	if (typeof obj == "object") {
		return Object.keys(obj).map(function(k) {
			var ks = encodeURIComponent(stringifyPrimitive(k)) + eq,
				val = obj[k];
			
			if (Array.isArray(val)) {
				return val.map(function(v) {
					return ks + encodeURIComponent(stringifyPrimitive(v));
				}).join(sep);
			} else {
				return ks + encodeURIComponent(stringifyPrimitive(val));
			}
		}).join(sep);
	} else {
		return "";
	}
}

var responseCodes = {
	400: "Bad request",
	401: "Unauthorized",
	404: "Not found",
	500: "Internal server error"
};

function HTTPError(err, res) {
	if (err == null) err = new Error;
	err.name = "HTTPError";

	if (res != null) {
		var status = res.status || res.statusCode;
		
		if (!err.message) {
			var msg = responseCodes[status];
			if (msg == null) msg = "Server responded with status code " + status
			err.message = msg;
		}

		err.status = status;
		err.response = res;

		err.toString = function() {
			return this.name + " " + this.status + ": " + this.message;
		}
	}

	return err;
}

function nodeRequest(url) {
	var http = require("http"),
		deferred = D();

	http.get(url, function(res) {
		function onError(err) {
			deferred.reject(HTTPError(err, res));
		}

		res.on("error", onError);
		if (res.statusCode >= 400) return onError();
		
		var raw = "";
		res.on("data", function(chunk) {
			raw += chunk.toString("utf-8");
		});

		res.on("end", function() {
			var data;

			try { deferred.resolve(JSON.parse(raw)); }
			catch (err) { onError(err); }
		});
	}).on('error', function(err) {
		deferred.reject(HTTPError(err));
	});

	return deferred.promise;
}

function XHRRequest(url) {
	var req = new XMLHttpRequest(),
		deferred = D();

	function onError(err) {
		deferred.reject(HTTPError(err, req));
	}
	
	req.onload = function() {
		if (req.status >= 400) return onError();

		try { deferred.resolve(JSON.parse(req.responseText)); }
		catch (err) { onError(err); }
	}
	
	req.open("get", url);
	req.send();

	return deferred.promise;
}

function HTTPRequest(url) {
	if (typeof require == "function") return nodeRequest.apply(null, arguments);
	else return XHRRequest.apply(null, arguments);
}

/**
 * Constructor
 */

function Legends(key, region) {
	if (!(this instanceof Legends)) return new Legends(key, region);

	this.key = key;
	this.region = region;
}

/**
 * API Request
 */

Legends.request = function(options, callback) {
	if (typeof options != "object") options = {};

	var method = options.method != null ? options.method : "",
		region = options.region != null ? options.region : "na",
		version = options.version != null ? options.version : "1.1",
		key = options.key,
		params = typeof options.params == "object" ? options.params : {},
		extract = options.extract;

	var url = "http://prod.api.pvp.net/api/lol/";
	url += region.toLowerCase() + "/";

	// Version needs a v
	if (version[0] != "v") version = "v" + version;
	url += version + "/";

	// clean up the method
	url += method.split("/").map(function(p) {
		return encodeURIComponent(p);
	}).reduce(function(m, p) {
		if (p != "") m.push(p);
		return m;
	}, []).join("/");

	// stringify params with the api key
	if (key != null) params.api_key = key;
	url += "?" + stringifyQuery(params);

	// create a new http request
	var promise = HTTPRequest(url);

	// extract the specified key
	if (extract != null) promise = promise.then(function(data) { return data[extract]; });

	// load the callback
	if (typeof callback == "function") promise.nodify(callback);

	return promise;
}

Legends.prototype.request = function(options, callback) {
	if (typeof options != "object") options = {};
	if (options.key == null) options.key = this.key;
	if (options.region == null) options.region = this.region;

	return Legends.request(options, callback);
}

/**
 * Human Readable Game Constants
 */

Legends.MATCH_MAKING_QUEUES = {
	2: "Normal 5v5 Blind Pick",
	4: "Ranked Solo 5v5",
	7: "Coop vs AI 5v5",
	8: "Normal 3v3",
	14: "Normal 5v5 Draft Pick",
	16: "Dominion 5v5 Blind Pick",
	17: "Dominion 5v5 Draft Pick",
	25: "Dominion Coop vs AI",
	41: "Ranked Team 3v3",
	42: "Ranked Team 5v5",
	52: "Twisted Treeline Coop vs AI",
	65: "ARAM",
	67: "ARAM Coop vs AI",
	70: "One for All 5v5",
	72: "Snowdown Showdown 1v1",
	73: "Snowdown Showdown 2v2"
}

Legends.MAP_NAMES = {
	1: { name: "Summoner's Rift", notes: "Summer Variant" },
	2: { name: "Summoner's Rift", notes: "Autumn Variant" },
	3: { name: "The Proving Grounds", notes: "Tutorial Map" },
	4: { name: "Twisted Treeline", notes: "Original Version" },
	8: { name: "The Crystal Scar", notes: "Dominion Map" },
	10: { name: "Twisted Treeline", notes: "Current Version" },
	12: { name: "Howling Abyss", notes: "ARAM Map" }
}

Legends.REGIONS = [ "NA", "EUW", "EUNE", "BR", "TR" ];

/**
 * Champions
 */

Legends.prototype.getChampions = function(freeToPlay, callback) {
	if (typeof freeToPlay == "function" && callback == null) {
		callback = freeToPlay;
		freeToPlay = false;
	}

	return this.request({
		method: "champion",
		version: "1.1",
		params: { freeToPlay: freeToPlay ? true : false },
		extract: "champions"
	}, callback);
}

/**
 * Games
 */

Legends.prototype.getRecentGames = function(summonerId, callback) {
	return this.request({
		method: "game/by-summoner/" + summonerId + "/recent",
		version: "1.2",
		extract: "games"
	}, callback);
}

/**
 * League
 */

Legends.prototype.getLeagues = function(summonerId, callback) {
	return this.request({
		method: "league/by-summoner/" + summonerId,
		version: "2.2"
	}, callback);
}

/**
 * Stats
 */

Legends.prototype.getSummaryStats = function(summonerId, season, callback) {
	if (typeof season == "function" && callback == null) {
		callback = season;
		season = null;
	}

	if (season != null) season = "SEASON" + season;

	return this.request({
		method: "stats/by-summoner/" + summonerId + "/summary",
		version: "1.2",
		params: { season: season },
		extract: "playerStatSummaries"
	}, callback);
}

Legends.prototype.getRankedStats = function(summonerId, season, callback) {
	if (typeof season == "function" && callback == null) {
		callback = season;
		season = null;
	}

	if (season != null) season = "SEASON" + season;

	return this.request({
		method: "stats/by-summoner/" + summonerId + "/ranked",
		version: "1.2",
		params: { season: season },
		extract: "champions"
	}, callback);
}

/**
 * Summoner
 */

Legends.prototype.getSummonerById = function(summonerId, callback) {
	return this.request({
		method: "summoner/" + summonerId,
		version: "1.2"
	}, callback);
}

Legends.prototype.getSummonerByName = function(name, callback) {
	return this.request({
		method: "summoner/by-name/" + name,
		version: "1.2"
	}, callback);
}

Legends.prototype.getRunes = function(summonerId, callback) {
	return this.request({
		method: "summoner/" + summonerId + "/runes",
		version: "1.2",
		extract: "pages"
	}, callback);
}

Legends.prototype.getMasteries = function(summonerId, callback) {
	return this.request({
		method: "summoner/" + summonerId + "/masteries",
		version: "1.2",
		extract: "pages"
	}, callback);
}

Legends.prototype.getNames = function() {
	var args = flattenArgs(arguments), callback;

	// check for a callback
	if (args.length > 0 && typeof args[args.length - 1] == "function") {
		callback = args.pop();
	}

	var MAX_PER_REQUEST = 40,
		promises = [], ids;

	while (args.length) {
		ids = args.splice(0, MAX_PER_REQUEST).join(",");
		
		promises.push(this.request({
			method: "summoner/" + ids + "/name",
			version: "1.2",
			extract: "summoners"
		}));
	}

	var promise = D.all(promises).success(function(data) {
		return data.reduce(function(m, a) { return m.concat(a); }, []);
	});

	if (callback) promise.nodify(callback);

	return promise;
}

/**
 * Team
 */

Legends.prototype.getTeams = function(summonerId, callback) {
	return this.request({
		method: "team/by-summoner/" + summonerId,
		version: "2.2"
	}, callback);
}

/**
 * Public API Factory
 */

if (typeof module == "object" && module.exports != null) {
	module.exports = Legends;
} else if (typeof window != "undefined") {
	window.Legends = Legends;
}

})();