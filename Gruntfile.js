module.exports = function(grunt) {
	
  var pkg = grunt.file.readJSON('package.json'),
	  distdir = 'dist/' + pkg.name + '-' + pkg.version + '/';
	 
  // Project configuration.
  grunt.initConfig({
	pkg: pkg,
	
	clean: {
		prod: ['dist']
	},
	
	// Copy things to a distdir dir, and only change things in the temp dir
	copy: {
		common: {
			files: [
				{expand: true, cwd: 'src/', src : ['chrome.manifest' ],  dest: distdir },
				{expand: true, cwd: 'src/', src : ['**/*.css','**/*.js','**/*.jsm', '**/*.xul', '**/*.png','**/*.jpg'],  dest: distdir },
			]
		},
		prod: {
			files: [
				{expand: true, cwd: 'src/', src : ['**/*.dtd', '!**/*_amo_*.dtd', '**/*.properties'],  dest: distdir },
			]
		},
		babelzilla: {
			files: [
				{expand: true, cwd: 'src/', src : ['**/*.dtd', '**/*.properties'],  dest: distdir },
			]
		},
	},
	
	"string-replace": {
	  install_rdf: {
		src: 'src/install.rdf',
		dest: distdir + 'install.rdf',
		options: {
		  replacements: [
		  {
			pattern: /\<em\:creator\>.+\<\/em\:creator\>/g,
			replacement: "<em:creator>" + pkg.author.name + "</em:creator>"
		  },
		  {
			pattern: /\<em\:homepageURL\>.*\<\/em\:homepageURL\>/g,
			replacement: "<em:homepageURL>" + pkg.homepage + "</em:homepageURL>"
		  },		  
		  {
			pattern: /\<em\:description\>.*\<\/em\:description\>/g,
			replacement: "<em:description>" + pkg.description + "</em:description>"
		  }
		  ]
		}
	  },
	
	  all_files: {
		options: {
		  replacements: [{
			pattern: /__version__/g,
			replacement: pkg.version
		  }]
		},
		files: [
			{expand: true, cwd: distdir, src : ['**/*.*', '!**/*.png', '!**/*.jpg', '!**/*.jpeg', '!**/*.gif' ], dest: distdir },
		]
	  }
	},
	
	compress: { 
		prod: { 
			options: {
			  archive: 'dist/<%=pkg.name%>-<%=pkg.version%>.xpi',
			  mode: 'zip'
			},
			files: [ { expand: true, cwd: distdir, src: '**/**' }]
		} 
	}
  });

  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.loadNpmTasks('grunt-string-replace');
  
  grunt.loadNpmTasks('grunt-contrib-compress');

  // Load the plugin that provides the "uglify" task.
  //grunt.loadNpmTasks('grunt-contrib-uglify');
  
  // $: grunt bump
  grunt.loadNpmTasks('grunt-bump');

  // Default task(s).
  grunt.registerTask('default', ['clean', 'copy:common', 'copy:prod', 'string-replace', 'compress']);
  grunt.registerTask('babelzilla', ['clean', 'copy:common', 'copy:babelzilla', 'string-replace', 'compress']);
  
};