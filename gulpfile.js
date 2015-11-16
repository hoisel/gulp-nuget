var gulp = require('gulp'),
	del = require('del'),
    path = require('path'),
    runSequence = require('run-sequence'),
    xmlpoke = require("gulp-xmlpoke"),
    semver = require('semver'),
    tap = require('gulp-tap'),
    cache = require('gulp-cached'),
	nuget = require('./index.js');

var nugetPath = './tools/nuget.exe';
 
var plugins = {
    baseDir:'./tools/plugins',
    VERSION_PATTERN: /(\d\.\d\.\d(-dev\d{1,4})+)/,
    packagesDir: './packages'
    //nuspecsFilter:  path.join( plugins.baseDir,'**', '*.nuspec') 
};



gulp.task('nuget-pack', function () {
   gulp.src('./tools/plugins/**/*.nuspec')
       .pipe(cache('nuspecs'))                  // só atua em arquivos que foram atualizados
       .pipe(nuget.pack({ nuget: nugetPath }))  // cria packages
       .pipe(gulp.dest(plugins.packagesDir))    // salva no dir destino nupckg
       .pipe(tap(function(file){                // apaga versões antigas
           return deleteOlderVersions(file);
       }));
});


function deleteOlderVersions(file, numVersionsToPreserve){

    var lastVersion = getVersionInfo(file);

     gulp.src(path.join( plugins.packagesDir, lastVersion.file +'.*.nupkg' ))
         .pipe(tap(function(f){
                var version = getVersionInfo(f);
                if( version && semver.lt(version.number, lastVersion.number) ){    
                    console.log('apagando:', version.number, '<', lastVersion.number); 
                    del(f.path, { force: true });
                }
         }));
         
     return file;
}


function getVersionInfo(file){
    
    if(!file){ return null;}
    
    var fileName = path.basename(file.path);
    var version = fileName.match(plugins.VERSION_PATTERN)[1].replace('dev','dev.');
    var fileNameWithoutVersion = fileName.split('.')[0];
           
    return { file: fileNameWithoutVersion, number: version};
}



gulp.task('watch', function () {
    
    gulp.watch(['./tools/**/*.nuspec'], ['nuget-pack']);
    
    gulp.watch(['./tools/**/*.*', '!./tools/**/*.nuspec'], function(event) {
         
        var filePath = path.relative( plugins.baseDir, event.path ); // obtem o caminho relativo do arquivo alterado em relação ao gulpfile.js
        var pluginDir = path.join( plugins.baseDir, filePath.split(path.sep)[0] ); 
        var nuspecGlob = path.join( pluginDir,'**','*.nuspec' );

        gulp.src(nuspecGlob)
            .pipe(nuget.bump({ range:'prerelease', identifier: 'dev' }))
            .pipe(gulp.dest(pluginDir));
    });
});
