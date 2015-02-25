module.exports = function(grunt) {
  var jsFiles = [
    "web/script/inline-styler.js",
    "web/script/jquery-validation/jquery.validate.js",
    "web/script/jquery.nanoscroller.min.js",
    "web/semantic-ui/semantic.min.js",
    "web/script/screenfull.min.js",
    "web/script/watcherClient.js",
    "web/script/clientmain.js",
  ]

  grunt.initConfig({
    less: {
      dev: {
        options: {
          stripBanners: true,
          banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
            '<%= grunt.template.today("yyyy-mm-dd") %> */',
          compress: true,
          cleancss: true,
          sourceMap: true,
          sourceMapFilename: "web/style/umbra.css.map",
          sourceMapURL: "/style/umbra.css.map",
          sourceMapBasepath: "web/style/",
        },
        src: ['web/style/umbra.less'],
        dest: 'web/style/umbra.css'
      },
    },
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        stripBanners: true,
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
          '<%= grunt.template.today("yyyy-mm-dd") %> */',
        sourceMap: true,
        sourceMapName: 'web/script/umbra.map',
        mangle: false
      },
      my_target: {
        files: {
          'web/script/umbra.js': jsFiles
        }
      }
    },
    watch: {
      less: {
        files: ['web/style/*.less'],
        tasks: ['less'],
      },
      uglify: {
        files: ['web/script/clientmain.js'],
        tasks: ['uglify'],
      }
    },
  });


  grunt.loadNpmTasks("grunt-contrib-less");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ["less", "uglify", 'watch']);
};