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