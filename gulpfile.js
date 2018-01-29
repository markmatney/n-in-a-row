var del = require('del')
var gulp = require('gulp')
var ts = require('gulp-typescript')
var nodemon = require('gulp-nodemon')
var mocha = require('gulp-mocha')
var runSequence = require('run-sequence')

gulp.task('run', function() {
    runSequence('default', 'start')
})

gulp.task('test', function() {
    runSequence('default', 'start', 'mocha', 'stop')
})

// internal

gulp.task('default', function() {
    var tsResult = gulp.src('src/**/*.ts')
        .pipe(ts.createProject('tsconfig.json')())

    return tsResult.js.pipe(gulp.dest('dist'))
})

gulp.task('start', function() {
    return nodemon({
        script: 'dist/api.js',
        stdout: process.argv.indexOf('--debug') !== -1
    })
})

gulp.task('mocha', function() {
    return gulp.src('test/**/*.js', { read: false })
        .pipe(mocha())
		.once('error', err => {
            //console.error(err)
			process.exit(1)
		})
})

gulp.task('stop', function() {
    process.exit()
})
