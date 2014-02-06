/**
 * Static Data Constructor
 */

Legends.Static = function(key, region) {
	if (!(this instanceof Legends.Static)) return new Legends.Static(key, region);

	this.key = key;
	this.region = region;
}

// Pointer for a smaller minified source
var LegendsStaticProto = Legends.Static.prototype; 

/**
 * Static Request
 */

Legends.Static.request = function(options, callback) {
	if (options == null) options = {};
	if (options.region == null) options.region = "na";
	if (options.version == null) options.version = "1";

	options.region = "static-data/" + options.region;
	if (options.id != null) options.method += "/" + options.id;

	return Legends.request(options, callback);
}

LegendsStaticProto.request = function(options, callback) {
	if (typeof options != "object") options = {};
	if (options.key == null) options.key = this.key;
	if (options.region == null) options.region = this.region;

	return Legends.Static.request(options, callback);
}

/**
 * Constants
 */

Legends.Static.REGIONS = [ "NA", "EUW", "EUNE", "BR", "TR", "LAS", "KR", "LAN", "OCE", "RU" ];

/**
 * Standard Static Endpoints
 */

var staticEndpoints = {
	"champion": [ "champion", "champions" ],
	"item": [ "item", "items" ],
	"mastery": [ "mastery", "masteries" ],
	"rune": [ "rune", "runes" ],
	"summoner-spell": [ "summonerSpell", "summonerSpells" ]
}

for (var endpoint in staticEndpoints) {
	var method = staticEndpoints[endpoint];

	LegendsStaticProto[method[0]] =
	LegendsStaticProto[method[1]] =
	LegendsStaticProto["get" + titleize(method[0])] =
	LegendsStaticProto["get" + titleize(method[1])] = function(id, callback) {
		if (typeof id === "function" && callback == null) {
			callback = id;
			id = null;
		}

		return this.request({
			method: endpoint,
			id: id,
			extract: id != null ? null : "data"
		}, callback);
	}
}

/**
 * Realm
 */

LegendsStaticProto.realm =
LegendsStaticProto.getRealm = function(callback) {
	return this.request({
		method: "realm"
	}, callback);
}