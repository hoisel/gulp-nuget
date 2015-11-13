var execFile = require('child_process').execFile,
	gutil = require('gulp-util'),
	log = require('./log'),
	File = require('vinyl'),
	fs = require('fs-extra'),
    mkdirp = require('mkdirp'),
	path = require('path');



function createArgs(options) {
	var args = ['pack', options.filePath];
	
	if(options.version) {
		args.push('-Version');
		args.push(options.version);
	}
	
	args.push('-OutputDirectory');
	args.push(options.tempDirectory);
	
	args.push('-NoPackageAnalysis');
	args.push('-NonInteractive');
	
	return args;
}


function getPackageFilePath(stdout) {
	var regexp = /'(.+\.nupkg)'/;

	if(!stdout) {
		return;
	}

	var matches = stdout.match(regexp);
	if(!matches.length || matches.length < 1) {
		return;
	}

	return matches[1];
}



function readPackage(filePath, callback) {
	fs.exists(filePath, function(exists) {
		if(!exists) {
			callback( 'Generated package could not be found!', null );
			return;
		}

		fs.readFile(filePath, function(err, data) {
			
			if(err){
				callback(err, null);
			}
			
			var nugetPackage = new File({
				base: path.dirname(filePath),
				path: filePath,
				contents: data
			});

			callback(null, nugetPackage);
		});
	});
}


function ensureOutputDirectoryExists(dirPath, callback ){
	mkdirp(dirPath, callback);
}



function run(options, callback) {
	
	var args = createArgs(options);
	
	ensureOutputDirectoryExists(options.tempDirectory, function(err){
		if(err) {
			throw new gutil.PluginError('gulp-nuget', err);
		}
	});
	
	
	execFile(options.nuget, args, function(err, stdout, stderr) {
		if(err) {
			throw new gutil.PluginError('gulp-nuget', err);
		}

		log(stdout);

		var filePath = getPackageFilePath(stdout);
		readPackage(filePath, callback);
	});
}

module.exports = {
	run: run
};