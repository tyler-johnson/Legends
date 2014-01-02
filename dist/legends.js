/*!
 * Legends.js
 * MIT License
 * https://github.com/appleifreak/Legends.git 
 */

(function() {

/**
* avow
* Copyright (c) 2012-2013 Brian Cavalier <https://github.com/briancavalier/avow> 
* MIT License
* Slightly modified for use in this library
*/

var avow = (function() {

	var avow, enqueue, defaultConfig, setTimeout, bind, uncurryThis, call, undef;

	bind = Function.prototype.bind;
	uncurryThis = bind.bind(bind.call);
	call = uncurryThis(bind.call);

	// Prefer setImmediate, cascade to node, vertx and finally setTimeout
	/*global setImmediate,process,vertx*/
	setTimeout = global.setTimeout;
	enqueue = typeof setImmediate === 'function' ? setImmediate.bind(global)
		: typeof process === 'object' && process.nextTick ? process.nextTick
		: typeof vertx === 'object' ? vertx.runOnLoop // vert.x
			: function(task) { setTimeout(task, 0); }; // fallback

	// Default configuration
	defaultConfig = {
		enqueue:   enqueue,
		unhandled: noop,
		handled:   noop,
		protect:   noop
	};

	// Create the default module instance
	// This is what you get when you require('avow')
	avow = constructAvow(defaultConfig);

	// You can use require('avow').construct(options) to
	// construct a custom configured version of avow
	avow.construct = constructAvow;

	return avow;

	// This constructs configured instances of the avow module
	function constructAvow(config) {

		var enqueue, onHandled, onUnhandled, protect;

		// Grab the config params, use defaults where necessary
		enqueue     = config.enqueue   || defaultConfig.enqueue;
		onHandled   = config.handled   || defaultConfig.handled;
		onUnhandled = config.unhandled || defaultConfig.unhandled;
		protect     = config.protect   || defaultConfig.protect;

		// Add lift and reject methods.
		promise.lift    = lift;
		promise.reject  = reject;

		return promise;

		// Return a trusted promise for x.  Where if x is a
		// - Promise, return it
		// - value, return a promise that will eventually fulfill with x
		// - thenable, assimilate it and return a promise whose fate follows that of x.
		function lift(x) {
			return promise(function(resolve) {
				resolve(x);
			});
		}

		// Return a rejected promise
		function reject(reason) {
			return promise(function(_, reject) {
				reject(reason);
			});
		}

		// Return a pending promise whose fate is determined by resolver
		function promise(resolver) {
			var self, value, handled, handlers = [];

			self = new Promise(then);

			// Call the resolver to seal the promise's fate
			try {
				resolver(promiseResolve, promiseReject);
			} catch(e) {
				promiseReject(e);
			}

			// Return the promise
			return self;

			// Register handlers with this promise
			function then(onFulfilled, onRejected) {
				if (!handled) {
					handled = true;
					onHandled(self);
				}

				return promise(function(resolve, reject) {
					handlers
						// Call handlers later, after resolution
						? handlers.push(function(value) {
							value.then(onFulfilled, onRejected).then(resolve, reject);
						})
						// Call handlers soon, but not in the current stack
						: enqueue(function() {
							value.then(onFulfilled, onRejected).then(resolve, reject);
						});
				});
			}

			// Resolve with a value, promise, or thenable
			function promiseResolve(value) {
				if(!handlers) {
					return;
				}

				resolve(coerce(value));
			}

			// Reject with reason verbatim
			function promiseReject(reason) {
				if(!handlers) {
					return;
				}

				if(!handled) {
					onUnhandled(self, reason);
				}

				resolve(rejected(reason));
			}

			// For all handlers, run the Promise Resolution Procedure on this promise
			function resolve(x) {
				var queue = handlers;
				handlers = undef;
				value = x;

				enqueue(function () {
					queue.forEach(function (handler) {
						handler(value);
					});
				});
			}
		}

		// Private

		// Trusted promise constructor
		function Promise(then) {
			this.then = then;
			protect(this);
		}

		// Coerce x to a promise
		function coerce(x) {
			if(x instanceof Promise) {
				return x;
			} else if (x !== Object(x)) {
				return fulfilled(x);
			}

			return promise(function(resolve, reject) {
				enqueue(function() {
					try {
						// We must check and assimilate in the same tick, but not the
						// current tick, careful only to access promiseOrValue.then once.
						var untrustedThen = x.then;

						if(typeof untrustedThen === 'function') {
							call(untrustedThen, x, resolve, reject);
						} else {
							// It's a value, create a fulfilled wrapper
							resolve(fulfilled(x));
						}
					} catch(e) {
						// Something went wrong, reject
						reject(e);
					}
				});
			});
		}

		// create an already-fulfilled promise used to break assimilation recursion
		function fulfilled(x) {
			var self = new Promise(function (onFulfilled) {
				try {
					return typeof onFulfilled == 'function'
						? coerce(onFulfilled(x)) : self;
				} catch (e) {
					return rejected(e);
				}
			});

			return self;
		}

		// create an already-rejected promise
		function rejected(x) {
			var self = new Promise(function (_, onRejected) {
				try {
					return typeof onRejected == 'function'
						? coerce(onRejected(x)) : self;
				} catch (e) {
					return rejected(e);
				}
			});

			return self;
		}
	}

	function noop() {}

})();

function flattenArgs(args, out) {
	args = Array.prototype.slice.call(args, 0);
	if (out == null) out = [];

	args.forEach(function(v) {
		Array.isArray(v) ? flattenArgs(v, out) : out.push(v);
	});

	return out;
}

function nodifyPromise(promise, callback) {
	return promise.then(
		function(a) {
			return callback(null, a);
		},
		function(e) {
			return callback(e);
		}
	);
}

function multiPromiseResolver(promises) {
	var args = [], c = promises.length;

	return avow(function(resolve, reject) {
		if (!c) return resolve(args);

		promises.forEach(function(promise, i) {
			promise = avow.lift(promise);
			promise.then(
				function(v) {
					if (!(i in args)) {
						args[i] = v;
						(--c) || resolve(args);
					}
				},
				reject
			);
		});
	});
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
	var http = require("http");

	return avow(function(resolve, reject) {
		http.get(url, function(res) {
			function onError(err) {
				reject(HTTPError(err, res));
			}

			res.on("error", onError);
			if (res.statusCode >= 400) return onError();
			
			var raw = "";
			res.on("data", function(chunk) {
				raw += chunk.toString("utf-8");
			});

			res.on("end", function() {
				var data;

				try { resolve(JSON.parse(raw)); }
				catch (err) { onError(err); }
			});
		}).on('error', function(err) {
			reject(HTTPError(err));
		});
	});
}

function XHRRequest(url) {
	var req = new XMLHttpRequest();
	
	return avow(function(resolve, reject) {
		function onError(err) {
			reject(HTTPError(err, req));
		}
		
		req.onload = function() {
			if (req.status >= 400) return onError();

			try { resolve(JSON.parse(req.responseText)); }
			catch (err) { onError(err); }
		}
		
		req.open("get", url);
		req.send();
	});
}

function HTTPRequest(url) {
	if (typeof require == "function") return nodeRequest(url);
	else return XHRRequest(url);
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
	if (typeof callback == "function") nodifyPromise(promise, callback);

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

	var promise = multiPromiseResolver(promises).then(function(data) {
		return data.reduce(function(m, a) { return m.concat(a); }, []);
	});

	if (callback) nodifyPromise(promise, callback);

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