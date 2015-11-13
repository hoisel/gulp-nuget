var fs = require('fs-extra'),
	Transform = require('stream').Transform,
	util = require('util'),
	PluginError = require('gulp-util').PluginError,
	path = require('path'),
	log = require('./log'),
	packcmd = require('./pack-cmd');



function NugetPackStream(options) {
	if(!(this instanceof NugetPackStream)) {
		return new NugetPackStream(options);
	}

	this.options = options || {};
	this.options.objectMode = true;
	this.options.tempDirectory = options.tempDirectory || "./nuget-temp";
	

	if(!this.options.nuget) {
		throw new PluginError('gulp-nuget', 'nuget.exe file path missing from options');	
	}
	
	Transform.call(this, this.options);
}

util.inherits(NugetPackStream, Transform);



NugetPackStream.prototype._transform = function(file, encoding, next) {
	
	var self = this;
	
	var fileExtension = path.extname(file.path);
	
	if( fileExtension !== '.csproj' && 
		fileExtension !== '.nuspec'){
		throw new PluginError('gulp-nuget', 'only .csproj or .nuspec files allowed');
	}
	
	// save file path in the options
	self.options.filePath = path.resolve( file.path );
	
	// run nuget command
	packcmd.run(self.options, function( err, nugetPackage) {
		
		if(err){
		    log(err);
			
			throw new PluginError('gulp-nuget', err);
		}
		
		if(nugetPackage) {
			self.push(nugetPackage);
			next();
		}
	});
};



 NugetPackStream.prototype._flush = function(done) {
	var self = this;
	
	// clean temp directory after all packages be built and streammed
	fs.remove(self.options.tempDirectory, function(err) {
		if(err){
			log(err);
		}
	});
};

module.exports = function(options) {
	return new NugetPackStream(options);
};