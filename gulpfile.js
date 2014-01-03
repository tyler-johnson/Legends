// Include gulp
var gulp = require('gulp'); 

// Include Our Plugins
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var header = require('gulp-header');
var footer = require('gulp-footer');

// Build Task
gulp.task('default', function() {
	gulp.src([ "src/promises.js", "src/util.js", "src/request.js", "src/legends.js" ])
		.pipe(concat('legends.js', { newLine: "\n\n" }))
		.pipe(header("/*!\n" +
			" * Legends.js\n" +
			" * Copyright (c) {{year}} Tyler Johnson\n" +
			" * MIT License\n" +
			" */\n\n" +
			"(function() {\n"))
		.pipe(footer("\n})();"))
		.pipe(gulp.dest('./dist'))
		.pipe(rename('legends.min.js'))
		.pipe(uglify({ output: { comments: /^!/i } }))
		.pipe(gulp.dest('./dist'));
});