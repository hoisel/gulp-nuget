var Transform = require('stream').Transform,
	util = require('util'),
	PluginError = require('gulp-util').PluginError,
	path = require('path'),
	log = require('./log'),

    gulp = require('gulp'),
    xmlpoke = require("gulp-xmlpoke"),
    semver = require('semver');


function NugetBumpStream(options) {
	if(!(this instanceof NugetBumpStream)) {
		return new NugetBumpStream(options);
	}

	options.identifier = options.identifier || 'dev';
	options.range  = options.range || 'prerelease';
	
	this.options = options || {};
	this.options.objectMode = true;
	this.options.identifier = options.identifier;
	this.options.identifierSemver = options.identifier + '.';
	this.options.range = options.range;
	
	Transform.call(this, this.options);
}

util.inherits(NugetBumpStream, Transform);



NugetBumpStream.prototype._transform = function(file, encoding, next) {
	
	var self = this;
	
	var fileExtension = path.extname(file.path);
	
	if( fileExtension !== '.nuspec'){
		throw new PluginError('gulp-nuget', 'only.nuspec files allowed');
	}
	
	
	if (file.isBuffer()) {

		var stream = xmlpoke({
			replacements : [{
				namespaces : {"xmlns" : "http://schemas.microsoft.com/packaging/2010/07/nuspec.xsd"},
				xpath : "//xmlns:version", 
				value : function(node) {          
					// replace .(dot) because nuget incompatibility. Ref: https://docs.nuget.org/create/versioning
					// return semver.inc(node.firstChild.data.replace('dev','dev.'),  'prerelease', 'dev').replace('dev.','dev');
					
					var olderVersionNuget = node.firstChild.data;
					var olderVersionSemVer = olderVersionNuget.replace(self.options.identifier, self.options.identifierSemver);
					var newVersionSemVer = semver.inc( olderVersionSemVer, self.options.range, self.options.identifier);  
					var newVersionNuget = newVersionSemVer.replace(self.options.identifierSemver, self.options.identifier);
					
					return newVersionNuget; // escreve no nuspec usando notação que o nuget entende
				}
			}]
		});
	
		stream.once('data', function(newFile) {
			self.push(newFile)
			next();
		})
	
		stream.write(file);
	}
};

module.exports = function(options) {
	return new NugetBumpStream(options);
};