/*!
 * Legends.js
 * MIT License
 * https://github.com/appleifreak/Legends.git 
 */

(function() {

/**
* promiscuous
* Copyright (c) 2013 Ruben Verborgh <https://github.com/RubenVerborgh/promiscuous> 
* MIT License
* Slightly modified for use in this library
*/

var Promise = (function (func, obj) {
	// Type checking utility function
	function is(type, item) { return (typeof item)[0] == type; }

	// Creates a promise, calling callback(resolve, reject), ignoring other parameters.
	function Promise(callback, handler) {
		// The `handler` variable points to the function that will
		// 1) handle a .then(resolved, rejected) call
		// 2) handle a resolve or reject call (if the first argument === `is`)
		// Before 2), `handler` holds a queue of callbacks.
		// After 2), `handler` is a finalized .then handler.
		handler = function pendingHandler(resolved, rejected, value, queue, then) {
			queue = pendingHandler.q;

			// Case 1) handle a .then(resolved, rejected) call
			if (resolved != is) {
				return Promise(function (resolve, reject) {
					queue.push({ p: this, r: resolve, j: reject, 1: resolved, 0: rejected });
				});
			}

			// Case 2) handle a resolve or reject call
			// (`resolved` === `is` acts as a sentinel)
			// The actual function signature is
			// .re[ject|solve](<is>, success, value)

			// Check if the value is a promise and try to obtain its `then` method
			if (value && (is(func, value) | is(obj, value))) {
				try { then = value.then; }
				catch (reason) { rejected = 0; value = reason; }
			}
			// If the value is a promise, take over its state
			if (is(func, then)) {
				function valueHandler(resolved) {
					return function (value) { then && (then = 0, pendingHandler(is, resolved, value)); };
				}
				try { then.call(value, valueHandler(1), rejected = valueHandler(0)); }
				catch (reason) { rejected(reason); }
			}
			// The value is not a promise; handle resolve/reject
			else {
				// Replace this handler with a finalized resolved/rejected handler
				handler = createFinalizedThen(callback, value, rejected);
				// Resolve/reject pending callbacks
				callback = 0;
				while (callback < queue.length) {
					then = queue[callback++];
					// If no callback, just resolve/reject the promise
					if (!is(func, resolved = then[rejected]))
						(rejected ? then.r : then.j)(value);
					// Otherwise, resolve/reject the promise with the result of the callback
					else
						finalize(then.p, then.r, then.j, value, resolved);
				}
			}
		};
		// The queue of pending callbacks; garbage-collected when handler is resolved/rejected
		handler.q = [];

		// Create and return the promise (reusing the callback variable)
		callback.call(callback = { then: function (resolved, rejected) { return handler(resolved, rejected); } },
									function (value)  { handler(is, 1,  value); },
									function (reason) { handler(is, 0, reason); });
		return callback;
	}

	// Creates a resolved or rejected .then function
	function createFinalizedThen(promise, value, success) {
		return function (resolved, rejected) {
			// If the resolved or rejected parameter is not a function, return the original promise
			if (!is(func, (resolved = success ? resolved : rejected)))
				return promise;
			// Otherwise, return a finalized promise, transforming the value with the function
			return Promise(function (resolve, reject) { finalize(this, resolve, reject, value, resolved); });
		};
	}

	// Finalizes the promise by resolving/rejecting it with the transformed value
	function finalize(promise, resolve, reject, value, transform) {
		setTimeout(function () {
			try {
				// Transform the value through and check whether it's a promise
				value = transform(value);
				transform = value && (is(obj, value) | is(func, value)) && value.then;
				// Return the result if it's not a promise
				if (!is(func, transform))
					resolve(value);
				// If it's a promise, make sure it's not circular
				else if (value == promise)
					reject(new TypeError());
				// Take over the promise's state
				else
					transform.call(value, resolve, reject);
			}
			catch (error) { reject(error); }
		}, 0);
	}

	Promise.resolve = function (value, promise) {
		return (promise = {}).then = createFinalizedThen(promise, value,  1), promise;
	};
	Promise.reject = function (reason, promise) {
		return (promise = {}).then = createFinalizedThen(promise, reason, 0), promise;
	};

	return Promise;
})('f', 'o');

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

	return new Promise(function(resolve, reject) {
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

	return new Promise(function(resolve, reject) {
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
	
	return new Promise(function(resolve, reject) {
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
	return typeof require == "function" ? nodeRequest(url) : XHRRequest(url);
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