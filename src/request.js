function stringifyPrimitive(v) {
	switch (typeof v) {
		case "string": return v;
		case "boolean": return v ? 'true' : 'false';
		case "number": return v.toString(10);
		default: return '';
	}
}

function stringifyQuery(obj, sep, eq) {
	if (obj == null) obj = void 0;
	if (sep == null) sep = '&';
	if (eq == null) eq = '=';

	if (typeof obj === "object") {
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
	500: "Internal server error",
	503: "Service Unavailable"
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
	return typeof require === "function" ? nodeRequest(url) : XHRRequest(url);
}