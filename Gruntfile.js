

module.exports = function(grunt) {
  "use strict";
  var thirdparty_scripts = [
    //'node_modules/grunt-riot/node_modules/riot/riot.js',
    'src/web/thirdparty/raphael-min.js',
    'src/web/thirdparty/jquery-validation/jquery.validate.min.js',
    'src/web/thirdparty/jquery.nanoscroller.js',
    'src/web/thirdparty/screenfull.js',
    'src/web/thirdparty/typeahead.bundle.min.js',
    'src/web/thirdparty/interact-1.2.4.min.js',
    'src/web/thirdparty/modernizr.min.js',
    'src/web/thirdparty/jquery.mobile-events.min.js',
  ];

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    less: {
      umbra: {
        options: {
          plugins: [
            new (require('less-plugin-autoprefix'))()
            //new (require('less-plugin-clean-css'))()
          ],
          dumpLineNumbers: true,
          stripBanners: true,
          banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
            '<%= grunt.template.today("yyyy-mm-dd") %> */',
          compress: true,
          cleancss: true,
          strictUnits: true,
          sourceMap: true,
          sourceMapFilename: "build/web/style/umbra.css.map",
          sourceMapURL: "/style/umbra.css.map",
          sourceMapBasepath: '/style',
          outputSourceFiles: true
        },
        src: 'src/web/style/umbra.less',
        dest: 'build/web/style/umbra.css'
      },
      themes: {
        options: {
          plugins: [
            new (require('less-plugin-autoprefix'))()
            //new (require('less-plugin-clean-css'))()
          ],
          dumpLineNumbers: true,
          stripBanners: true,
          banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
          '<%= grunt.template.today("yyyy-mm-dd") %> */',
          compress: false,
          cleancss: true,
          strictUnits: true
        },
        files: [{
          expand: true,
          cwd: 'src/web/style',
          src: ['*-theme.less'],
          dest: 'build/web/style/',
          ext: '.css'
        }]
      }
    },
    babel: {
      options: {
        sourceMap: true,
        presets: ['es2015']
        //plugins: ["closure-elimination"]
      },
      web: {
        files: [{
          expand: true,
          cwd: 'src/web/script',
          src: ['**/*.es6'],
          dest: 'src-gen/web/babel/',
          ext: '.js'
        }]
      },
      server: {
        files: [{
          expand: true,
          cwd: 'src/server',
          src: ['**/*.es6'],
          dest: 'src-gen/server/babel/',
          ext: '.js'
        }]
      }
    },
    uglify: {
      options: {
        stripBanners: true,
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
          '<%= grunt.template.today("yyyy-mm-dd") %> */',
        sourceMap: true,
        sourceMapName: 'build/web/script/umbra.map',
        sourceMapIncludeSources : true,
        mangle: false
      },
      web: {
        src: ['src-gen/web/babel/*.js'],
        dest: 'build/web/script/umbra.js'
      }
    },
    copy: {
      web_thirdparty: {
        files: [
          {expand: true, flatten: true, src: thirdparty_scripts, dest: 'build/web/thirdparty' }
        ]
      },
      node_scripts: {
        files: [
          // includes files within path
          {expand: true, cwd: 'src/server', src: ['**'], dest: 'build/server'}
        ]
      },
      web_img: {
        files: [
          // includes files within path
          {expand: true, cwd: 'src/web/img', src: ['**'], dest: 'build/web/img'}
        ]
      },
      web_html: {
        files: [
          // includes files within path
          {expand: true, cwd: 'src/web', src: ['**/*.html'], dest: 'build/web'}
        ]
      },
      web_semantic: {
        files: [
          {expand: true, cwd: 'src/web/thirdparty/semantic-ui', src: '**/*', dest: 'build/web/semantic-ui' }
        ]
      },
      web_fonts: {
        files: [
          {expand: true, cwd: 'src/web', src: ['**/*.woff2'], dest: 'build/web'}
        ]
      }
    },
    watch: {
      less: {
        files: ['src/web/style/*.less'],
        tasks: ['less']
      },
      uglify: {
        files: ['src/web/script/clientmain.js'],
        tasks: ['uglify']
      },
      copy: {
        files: ['src/**'],
        tasks: ['copy']
      }
    }
  });

  grunt.loadNpmTasks("grunt-contrib-less");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-babel');

  //don't watch by default, 'grunt watch' works perfectly well without killing CI
  grunt.registerTask('default', [
    'less',
    'babel',
    'copy',
    'uglify'
  ]);
};