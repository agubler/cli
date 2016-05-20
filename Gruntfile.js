module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-contrib-uglify');

	require('grunt-dojo2').initConfig(grunt, {
		copy: {
			staticDevFiles: {
				expand: true,
				cwd: 'src',
				src: [ 'config/*', 'templates/*' ],
				dest: '<%= devDirectory %>'
			},
		}
	});

	grunt.registerTask('dev', [
		'typings',
		'tslint',
		'clean:dev',
		'ts:dev',
		'copy:staticDevFiles',
		'copy:staticTestFiles',
		'updateTsconfig'
	]);
};
