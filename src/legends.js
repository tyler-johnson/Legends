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