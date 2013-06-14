(function(){
var EventEmitter = function(emitter) {//Creates new event emitter
    this.events = {};
    this.emitter = emitter;
};

EventEmitter.prototype.on = function(type, handler, top) {//Adds new handler
    if (!type || !handler) {//Invalid params
        return null;
    };
    var arr = [];
    if (!this.events[type]) {//Add empty array
        this.events[type] = arr;
    } else {//Get array
        arr = this.events[type];
    };
    for (var i = 0; i < arr.length; i++) {//Check for duplicate
        if (arr[i] == handler || (arr[i].marker && arr[i].marker == handler.marker)) {//Already here
            arr[i] = handler;
            return arr[i];
        };
    };
    if (top) {
        arr.splice(0, 0, handler);
    } else {
        arr.push(handler);
    }
    return handler;
};

EventEmitter.prototype.off = function(type, handler) {//Removes handler
    if (!type) {//Stop
        return false;
    };
    var arr = this.events[type];
    if (!arr) {//Stop
        return false;
    };
    if (!handler) {//Remove all handlers
        this.events[type] = [];
        return true;
    };
    for (var i = 0; i < arr.length; i++) {//Look for handler
        if (arr[i] == handler || (arr[i].marker && arr[i].marker == handler.marker)) {//Found - splice
            arr.splice(i, 1);
            i--;
        };
    };
    return true;
};

EventEmitter.prototype.emit = function(type, evt, obj) {//Calls handlers
    if (!type) {//Stop
        return false;
    };
    if (!evt) {//Create empty
        evt = {};
    };
    if (!evt.type) {//Add type
        evt.type = type;
    };
    if (!evt.target) {//Add target
        evt.target = obj || this.emitter || this;
    };
    var arr = this.events[type] || [];
    var prevented = false;
    evt.stop = function () {
        prevented = true;
    };
    var arrClone = arr.slice(0);
    for (var i = 0; i < arrClone.length; i++) {//Call handler one by one
        // try {
            var result = arrClone[i].call(evt.target, evt);
            if (result == false) {//Stop executing
                return false;
            };
            if (prevented) {
                return result;
            };
        // } catch (e) {//Handler error
        //     log('Error in handler:', e);
        // }
    };
    return true;
};

var WindowController = function () {
	// Will provide data for window and accept modifications
	// Developers will override this
	this.events = new EventEmitter(); // Controller will report data change events
};

WindowController.prototype.size = function() {
	// Returns number of lines
};

WindowController.prototype.line = function(index) {
	// Returns information about current line (text, colors, parameters)
};

WindowController.prototype.edit = function(index, type, text) {
	// Called when user edited text
};

var PlainTextController = function () {	
};
PlainTextController.prototype = new WindowController();

PlainTextController.prototype.load = function(lines) {
	this.lines = lines;
};

PlainTextController.prototype.size = function() {
	// Returns number of lines
	return this.lines.length;
};

PlainTextController.prototype.line = function(index) {
	// Returns information about current line (text, colors, parameters)
	return {
		text: this.lines[index],
		colors: [],
		edit: true
	};
};

PlainTextController.prototype.edit = function(index, type, text) {
	// Called when user edited text
};

var UIProvider = function () {
	// Will draw frames, windows, emit click, scroll, key events
	// Developers will override this for every supported terminal
	this.events = new EventEmitter(); // Will report events from UI
};

UIProvider.prototype.whenReady = function(handler) {
	// Called when UI is ready
};

UIProvider.prototype.width = function() {
	// Returns width in characters
};

UIProvider.prototype.height = function() {
	// Return screen height in characters
};

UIProvider.prototype.log = function() {
	// Dumps log
};

UIProvider.prototype.addLayer = function() {
	// Creates new layer on top, returns context
	return {};
};

UIProvider.prototype.createWindow = function(layer, config) {
	// Creates new window, returns context
	return {};
};

var WindowProvider = function (config, layer, ui) {
	// Will be the bridge UI provider and data controller. Frame will decide which window will receive events
	this.config = config;
	this.ui = ui;
	this.data = config.controller;
	this.data.events.on('change', function (evt) {
		// When data is changed
	}.bind(this));
	this.ctx = ui.createWindow(layer, config);
};

var WindowFrame = function () {
	// Describes one frame, a combination of windows
	// Will be few implementations: one for window on center, another for context window under cursor, one more for window grid with split
	this.events = new EventEmitter(); // Will report focus, remove events
};

WindowFrame.prototype.bind = function(layer, ui) {
	// Called when frame is bound to layer
};

WindowFrame.prototype.visible = function() {
	// Returns true when frame is visible
	return true;
};

WindowFrame.prototype.bounds = function() {
	// Returns 4 coordinates - left, top, width, height of frame
	return [0, 0, 0, 0];
};

WindowFrame.prototype.resize = function(width, height) {
	// Called when window is resized
};

var CenterWindowFrame = function (config) {
	// Will show one window on top
	this.windowConfig = config;
};

CenterWindowFrame.prototype = new WindowFrame();

CenterWindowFrame.prototype.visible = function() {
	// Returns true when frame is visible
	return true;
};

CenterWindowFrame.prototype.bounds = function() {
	// Returns 4 coordinates - left, top, width, height of frame
	return [0, 0, 0, 0];
};

CenterWindowFrame.prototype.center = function() {
	this.windowConfig.x = Math.floor((this.ui.width()-this.windowConfig.width)/2);
	this.windowConfig.y = Math.floor((this.ui.height()-this.windowConfig.height)/2);
};

CenterWindowFrame.prototype.resize = function(width, height) {
	// Called when window is resized
	this.center();
};

CenterWindowFrame.prototype.bind = function(layer, ui) {
	// Called when frame is bound to layer
	this.layer = layer;
	this.ui = ui;
	this.center();
	this.windowCtx = new WindowProvider(this.windowConfig, layer, ui);
};

var	WindowFrameManager = function () {
	// Key component, created by application. Will manage collection of frames, listen to UI events and translate them to frames and windows
	this.frames = [];
};

WindowFrameManager.prototype.addFrame = function(frame) {
	var layer = this.ui.addLayer();
	this.frames.push(frame);
	frame.bind(layer, this.ui);
};

WindowFrameManager.prototype.setUIProvider = function(provider) {
	this.ui = provider;
	this.ui.events.on('resize', function (evt) {
		// When UI resized
	}.bind(this));
};

window.tango5 = {
	WindowController: WindowController,
	UIProvider: UIProvider,
	WindowFrame: WindowFrame,
	WindowFrameManager: WindowFrameManager,
	CenterWindowFrame: CenterWindowFrame,
	PlainTextController: PlainTextController
};

})();