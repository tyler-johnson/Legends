Legends is a small (~8KB minified) League of Legends API Library for Node.js and browsers. It based on promises, making it very fast and robust. The full Riot API is available and it also includes human readable names for maps and queues.

## Installation and Usage

### Node.js

Install the NPM module:

	$ npm install legends

Then require and use:

```javascript
var legends = require("legends")("MY_SECRET_API_KEY", "na");
```

### Browsers

Include `dist/legends.js` or `dist/legends.min.js` on your page:

	<script type="text/javascript" src="legends.min.js"></script>

And use:

```javascript
var legends = Legends("MY_SECRET_API_KEY", "na");
```

**NOTE**: Using this library in the browser will require you to reveal your API key to end users. This is not reccomended for obvious reasons. Check out <https://developer.riotgames.com/best-practices> for best practices with the API.

## Example

This example uses traditional callbacks to get a summoner's ranked stats knowing only their username.

```javascript
var legends = Legends("MY_SECRET_API_KEY", "na");

legends.getSummonerByName("meteos", function(err, data) {
	if (err != null) return console.error(err);

	legends.getRankedStats(data.id, function(err, stats) {
		if (err != null) console.error(err);
		else console.log(stats);
	});
});
```

This can also be rewritten using promises.

```javascript
var legends = Legends("MY_SECRET_API_KEY", "na");

legends.getSummonerByName("meteos")
	.then(function(data) { return legends.getRankedStats(data.id); })
	.then(function(data) {
		console.log(data);
	}, function(error) {
		console.error(error);
	});
```

## API

### Constructor

#### new Legends( *API_KEY*, *[ REGION ]* )

Creates a new Legends instance. `API_KEY` is your secret api key given to you by Riot. Go to <https://developer.riotgames.com/> to obtain a key. `REGION` is any valid region code: `na`, `euw`, `eune`, `br`, or `tr`. A Legend instance can also be created without using the `new` keyword.

### Class Methods and Properties

#### Legends.request( *[ OPTIONS ]*, *[ CALLBACK ]* )

Makes a request to the Roit API. `OPTIONS` is a dictionary with any of the fields listed below. `CALLBACK` is an optional function that is called with two arguments, `error` and `data`. Returns a `promise`. This method is useful for making custom API requests.

##### Available Options

* `method`: Url method, appended to the base API url.
* `region`: A valid LoL region code: `na`, `euw`, `eune`, `br`, or `tr`.
* `version`: API version. Generally `1.1`, `1.2`, `2.1`, or `2.2`.
* `key`: API Key to be prepended to the url query.
* `params`: A dictionary of additional url query parameters.
* `extract`: The key to extract from the returned data.

#### Legends.MATCH_MAKING_QUEUES

A dictionary pairing queue ids to human readable names.

#### Legends.MAP_NAMES

A dictionary pairing map ids to human readable names and notes.

#### Legends.REGIONS

An array of valid LoL region codes.

### Instance Methods

#### legends.request( *[ OPTIONS ]*, *[ CALLBACK ]* )

A shortcut for `Legends.request`. Defaults the options `key` and `region` to those provided to the instance when it was created.

#### legends.getChampions( *[ FREE_TO_PLAY ]*, *[ CALLBACK ]* )

Retrieves the list of champions. `FREE_TO_PLAY` is a boolean. <https://developer.riotgames.com/api/methods#!/311/1059>

#### legends.getRecentGames( SUMMONER_ID, *[ CALLBACK ]* )

Retrieves information on the last ten games played. <https://developer.riotgames.com/api/methods#!/313/1061>

#### legends.getLeagues( SUMMONER_ID, *[ CALLBACK ]* )

Retrieves leagues data for summoner, including leagues for all of summoner's teams. <https://developer.riotgames.com/api/methods#!/307/1055>

#### legends.getSummaryStats( SUMMONER_ID, *[ CALLBACK ]* )

Retrieves player stats summaries. <https://developer.riotgames.com/api/methods#!/317/1075>

#### legends.getRankedStats( SUMMONER_ID, *[ CALLBACK ]* )

Retrieves player ranked stats. <https://developer.riotgames.com/api/methods#!/317/1074>

#### legends.getSummonerById( SUMMONER_ID, *[ CALLBACK ]* )

Retrieves basic summoner info by id. <https://developer.riotgames.com/api/methods#!/315/1069>

#### legends.getSummonerByName( NAME, *[ CALLBACK ]* )

Retrieves basic summoner info by name. <https://developer.riotgames.com/api/methods#!/315/1067>

#### legends.getRunes( SUMMONER_ID, *[ CALLBACK ]* )

Retrieves player runes pages. <https://developer.riotgames.com/api/methods#!/315/1070>

#### legends.getMasteries( SUMMONER_ID, *[ CALLBACK ]* )

Retrieves player mastery pages. <https://developer.riotgames.com/api/methods#!/315/1071>

#### legends.getNames( *[ SUMMONER_IDS, ... ]*, *[ CALLBACK ]* )

Retrieves summoners' names by list of ids. Ids can be passed as seperate arguments, as an array of ids, or a combination of the two. Riot limits 40 summoner ids to one request. If more than 40 ids are passed, the method will automatically split it into multiple calls. <https://developer.riotgames.com/api/methods#!/315/1068>

#### legends.getTeams( SUMMONER_ID, *[ CALLBACK ]* )

Retrieves a summoner's teams. <https://developer.riotgames.com/api/methods#!/310/1058>

*This product is not endorsed, certified or otherwise approved in any way by Riot Games, Inc. or any of its affiliates.*