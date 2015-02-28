module.exports = function(grunt) {
  var jsFiles = [
    'src/web/script/inline-styler.js',
    'src/web/script/jquery-validation/jquery.validate.js',
    'src/web/script/jquery.nanoscroller.js',
    'src/web/semantic-ui/semantic.js',
    'src/web/script/screenfull.js',
    'src/web/script/watcherClient.js',
    'src/web/script/clientmain.js',
    'src-gen/web/tags/*.js'
  ];

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    less: {
      dist: {
        options: {
          stripBanners: true,
          banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
            '<%= grunt.template.today("yyyy-mm-dd") %> */',
          compress: true,
          cleancss: true,
          sourceMap: true,
          sourceMapFilename: "build/web/style/umbra.css.map",
          sourceMapURL: "/style/umbra.css.map",
          sourceMapBasepath: "build/web/style/"
        },
        src: ['src/web/style/umbra.less'],
        dest: 'build/web/style/umbra.css'
      }
    },
    riot: {
      options:{
        template : 'jade',
        type : 'es6'
      },
      dist: {
        expand: true,
        cwd: 'src/web/tags',
        src: '**/*.tag',
        dest: 'src-gen/web/tags',
        ext: '.js'
      }
    },
    babel: {
      options: {
        sourceMap: true
      },
      server: {
        files: [{
          expand: true,
          cwd: 'src/server',
          src: '**/*.es6',
          dest: 'src-gen/server/',
          ext: '.js'
        }]
      },
      web: {
        files: [{
          expand: true,
          cwd: 'src/web/script',
          src: '**/*.es6',
          dest: 'src-gen/web/script/',
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
        mangle: false
      },
      web: {
        files: {
          'build/web/script/umbra.js': jsFiles
        }
      }
    },
    copy: {
      main: {
        files: [
          // includes files within path
          {expand: true, cwd: 'src', src: ['**'], dest: 'build/'},
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
  grunt.loadNpmTasks('grunt-riot');
  grunt.loadNpmTasks('grunt-babel');

  //don't watch by default, 'grunt watch' works perfectly well without killing CI
  grunt.registerTask('default', ["less", "riot", "babel", "uglify", 'copy']);
};