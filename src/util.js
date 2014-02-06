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
			promise = Promise.lift(promise);
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

function concatMany(args, max_per_request, forEach) {
	var callback, promises = [], vals, promise;

	// check for a callback
	if (args.length > 0 && typeof args[args.length - 1] === "function") {
		callback = args.pop();
	}

	while (args.length) {
		vals = args.splice(0, max_per_request);
		promises.push(forEach(vals));
	}

	promise = multiPromiseResolver(promises).then(function(data) {
		return data.reduce(function(m, o) {
			for (var key in o) {
				if (Object.prototype.hasOwnProperty.call(o, key)) {
					m[key] = o[key];
				}
			}

			return m;
		}, {});
	});

	if (callback) nodifyPromise(promise, callback);

	return promise;
}

function titleize(str) {
	return str[0].toUpperCase() + str.substr(1);
}