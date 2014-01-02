function flattenArgs(args, out) {
	args = Array.prototype.slice.call(args, 0);
	if (out == null) out = [];

	args.forEach(function(v) {
		Array.isArray(v) ? flattenArgs(v, out) : out.push(v);
	});

	return out;
}