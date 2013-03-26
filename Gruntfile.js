module.exports = function(grunt) {
	
  var stars = '******************************',
	pkg = grunt.file.readJSON('package.json'),
	banner  = '/*!' + stars 
			+ '\n* Author: '+ pkg.author.name 
			+ '\n* Email: ' + pkg.author.email 
			+ '\n* URL: ' + pkg.author.url 
			+ '\n* <%= grunt.template.today("yyyy-mm-dd") %>\n*' + stars + '*/\n',
	distdir = 'dist/' + pkg.name + '-' + pkg.version + '/';
	 
  // Project configuration.
  grunt.initConfig({
	distdir: distdir,
	
	// Copy things to a distdir dir, and only change things in the temp dir
	copy: {
		prod: {
			files: [
				{expand: true, cwd: 'src/', src : ['chrome.manifest', 'install.rdf' ],  dest: distdir },
				{expand: true, cwd: 'src/', src : ['**/*.css','**/*.js','**/*.jsm', '**/*.xul', '**/*.png','**/*.jpg'],  dest: distdir },
				{expand: true, cwd: 'src/', src : ['**/*.dtd', '!**/*_amo_*.dtd', '**/*.properties'],  dest: distdir },
			]
		},
	},
	
		
  });

  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.loadNpmTasks('grunt-htmlrefs');
 
  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.loadNpmTasks('grunt-contrib-cssmin');
  
  grunt.loadNpmTasks('grunt-hashres');
  
  // $: grunt bump
  grunt.loadNpmTasks('grunt-bump');

  // Default task(s).
  grunt.registerTask('default', ['copy:prod']); //, 'htmlrefs', 'uglify', 'cssmin', 'hashres:prod']);
  
  // when final delivery, package sources of app.js and app.css as well
  grunt.registerTask('final', ['copy', 'htmlrefs', 'uglify', 'cssmin', 'hashres:prod']);

};