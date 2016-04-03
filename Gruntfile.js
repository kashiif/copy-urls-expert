'use strict';

/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MIT
* Copyright (c) 2013-2014 Kashif Iqbal Khan
********************************************/

module.exports = function(grunt) {

  var path  = require('path');

  var pkg = grunt.file.readJSON('package.json'),
      srcDir = 'src/',  // Path of directory where source code resides
      distDir = 'dist/',
      tempDir = distDir + 'temp/',
      versionForFileSystem = pkg.version.replace(/\./g, '-');

  // Project configuration.
  grunt.initConfig({
	pkg: pkg,
	
	clean: {
		prod: [tempDir, distDir]
	},
	
	// Copy files to tempDir, and only change things in there
	copy: {
		common: {
			files: [
				{expand: true, cwd: srcDir, src : ['chrome.manifest' ],  dest: tempDir },
				{expand: true, cwd: srcDir, src : ['**/*.css', '**/*.xul', '**/*.png','**/*.jpg'],  dest: tempDir }
			]
		},
	},
	
  preprocess: {
    common: {
      files: [
        {expand: true, cwd: srcDir, src : ['**/*.js', '**/*.jsm'],  dest: tempDir }
      ]
    },

    prod: {
      files: [
        {expand: true, cwd: srcDir, src : ['**/*.dtd', '**/*.properties', '!**/*_amo_*.dtd'],  dest: tempDir }
      ]
    },
    babelzilla: {
      files: [
        {expand: true, cwd: srcDir, src : ['**/*.dtd', '**/*.properties', '**/locale/*/*.txt'],  dest: tempDir }
      ]
    }

  },

	'string-replace': {
	  install_rdf: { /* Task to replace tokens in install.rdf */
      options: {
        replacements: [
          {
            pattern: /\<em\:creator\>.+\<\/em\:creator\>/g,
            replacement: '<em:creator>' + pkg.author.name + '</em:creator>'
          },
          {
            pattern: /\<em\:homepageURL\>.*\<\/em\:homepageURL\>/g,
            replacement: '<em:homepageURL>' + pkg.homepage + '</em:homepageURL>'
          },
          {
            pattern: /\<em\:description\>.*\<\/em\:description\>/g,
            replacement: '<em:description>' + pkg.description + '</em:description>'
          }
        ]
      },
      src: srcDir + 'install.rdf',
      dest: tempDir + 'install.rdf'
	  },
	
	  all_files: { /* Task to replace tokens in all files */
      options: {
        replacements: [{
          pattern: /___version___/g,
          replacement: pkg.version
        },
        {
          pattern: /__version__/g,
          replacement: versionForFileSystem
        }]
      },
      files: [
        {expand: true, cwd: tempDir, src : ['**/*.*', '!**/*.png', '!**/*.jpg', '!**/*.jpeg', '!**/*.gif' ], dest: tempDir }
      ]
	  }
	},
	
	compress: { 
		prod: { 
			options: {
			  archive: distDir + pkg.name + '-' + pkg.version + '.xpi',
			  mode: 'zip'
			},
			files: [ { expand: true, cwd: tempDir, src: '**/**' }]
		} 
	}
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-preprocess');
  
  // $: grunt bump
  grunt.loadNpmTasks('grunt-bump');


  grunt.registerTask('renameVersionDir', 'renames the __version__ directory', function() {
      var fs    = require('fs');

      var oldName = path.resolve(path.join(tempDir, '__version__')),
            newName = path.resolve(path.join(tempDir, versionForFileSystem));
 
      if (fs.existsSync(oldName)) {
        fs.renameSync(oldName, newName);
      }

    });

  // Default task(s).
  grunt.registerTask('default', ['clean', 'copy:common', 'preprocess:common', 'preprocess:prod', 'string-replace', 'renameVersionDir', 'compress']);
  grunt.registerTask('babelzilla', ['clean', 'copy:common', 'preprocess:common', 'preprocess:babelzilla', 'string-replace', 'renameVersionDir', 'compress']);
  
};