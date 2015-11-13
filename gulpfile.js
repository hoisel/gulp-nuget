var gulp = require('gulp'),
	del = require('del'),
    path = require('path'),
    xmlpoke = require("gulp-xmlpoke"),
    semver = require('semver'),
    tap = require('gulp-tap'),
    cache = require('gulp-cached'),
	nuget = require('./index.js');

var nugetPath = './tools/nuget.exe';
 
var plugins = {
    baseDir:'./tools/plugins',
    lastVersions:{},
    numVersionsToPreserve: 3, 
    VERSION_PATTERN: /(\d\.\d\.\d(-dev\d{1,4})+)/,
    packagesDir: './packages'    
};


gulp.task('nuget-pack', ['clear'], function () {
    
   gulp.src('./tools/plugins/**/*.nuspec')
       .pipe(cache('nuspecs'))
       .pipe(nuget.pack({ nuget: nugetPath }))
       .pipe(tap(function(file){
           saveAsLastVersion(file);
       }))
       .pipe(gulp.dest(plugins.packagesDir));
});


gulp.task('clear', function () {
    return gulp.src('./packages/*.nupkg')
               .pipe(tap(function(file){
                   deleteOlderVersions( file, plugins.numVersionsToPreserve );
               }));
});




function deleteOlderVersions(file, numVersionsToPreserve){
   
    var version = getVersionInfo(file);
    var lastVersions = plugins.lastVersions[version.file];
    
    if(!lastVersions || lastVersions.length === 0){
         return del(file.path, { force: true }); 
    }
    else if( lastVersions.length === numVersionsToPreserve ){
        var minVersion = lastVersions[0];
        
        if(semver.lte(version.number, minVersion.number)){
            console.log('apagando:', version.file, version.number, '<', minVersion.number); 
            del(file.path, { force: true });
        } 
    }
    
    
    // var version = getVersionInfo(file);
    // var lastVersion = plugins.lastVersions[version.file];
    // 
    // if(!lastVersion){
    //      del(file.path, { force: true }); 
    // }
    // 
    // if( version && lastVersion && semver.lt(version.number, lastVersion.number) ){    
    //     console.log('apagando:', version.number, '<', lastVersion.number); 
    //     del(file.path, { force: true });
    // }
}


function saveAsLastVersion(file) {
    var version = getVersionInfo(file);
    
    var versions =  plugins.lastVersions[version.file] || [];
    
    if(versions.length >= plugins.numVersionsToPreserve){
        versions.shift(); // remove older
    }
    
    versions.push(version);

    plugins.lastVersions[version.file] = versions;
}


function getVersionInfo(file){
    
    if(!file){ return null;}
    
    var fileName = path.basename(file.path);
    var version = fileName.match(plugins.VERSION_PATTERN)[1];
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
            .pipe(xmlpoke({
                replacements : [{
                    namespaces : {"xmlns" : "http://schemas.microsoft.com/packaging/2010/07/nuspec.xsd"},
                    xpath : "//xmlns:version", 
                    value : function(node) {          
                        // replace .(dot) because nuget incompatibility. Ref: https://docs.nuget.org/create/versioning
                        return semver.inc(node.firstChild.data.replace('dev','dev.'),  'prerelease', 'dev').replace('dev.','dev'); 
                    }
                }]
            }))
            //.pipe(bump({ range:'prerelease', identifier: 'dev' }))
            .pipe(gulp.dest(pluginDir));
    });
});
