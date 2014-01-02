
module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
			options: {
				banner: "/*!\n * Legends.js\n * MIT License\n * <%= pkg.repository.url %> \n */\n\n" +
					"(function() {\n\n",
				footer: "\n\n})();",
				separator: "\n\n"
			},
			dist: {
				src: [ "src/promises.js", "src/util.js", "src/request.js", "src/legends.js" ],
				dest: "dist/<%= pkg.name %>.js"
			}
		},
		uglify: {
			options: {
				report: 'gzip',
				preserveComments: 'some'
			},
			build: {
				src: 'dist/<%= pkg.name %>.js',
				dest: 'dist/<%= pkg.name %>.min.js'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('default', ['concat','uglify']);

}