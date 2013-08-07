var App = function () {
	$$.appEvents().on('load', function(evt) { // When notepad loaded
		return this.onLoad(evt);
	}.bind(this));
};

App.prototype = new $$.appTmpl;

App.prototype.onLoad = function(evt) { // Load and set config
	var blocks = this.parseLines(evt.root.body);
	var confBlock = this.blockToConfig(this.getBlock(blocks, 'config', true));
	evt.controller.notepadConfig = {
		width: parseInt(confBlock.width),
		height: parseInt(confBlock.height),
		sort: confBlock.sort
	};
};

App.prototype.onRender = function(config, item, controller, saveHandler) {
	var blocks = this.parseLines(item.body);
	var confBlock = this.blockToConfig(this.getBlock(blocks, 'config', true));
	return null;
};

if (typeof(appID) == 'undefined') {
	$$.registerApplicationDev('notepad', new App());
} else {
	$$.registerApplication(appID, new App());
}

