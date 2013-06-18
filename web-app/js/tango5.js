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
	if (index>=this.lines.length || index<0) {
		// Out of range
		return null;
	};
	colors = [{from: 2, length: 2, color: 'var'}, {from: 5, length: 3, color: 'const'}];
	var boxPos = this.lines[index].search(/\[( |x)\]/i);
	if (boxPos != -1) {
		// Found
		colors.push({from: boxPos, length: 3, clickable: true, color: 'clickable'});
	};
	return {
		text: this.lines[index],
		colors: colors,
		edit: true,
		add: true,
		remove: true
	};
};

PlainTextController.prototype.edit = function(index, type, text) {
	// Called when user edited text
	if ('edit' == type) {
		// Change text
		this.lines[index] = text;
		return true;
	};
	if ('add' == type) {
		// Append after
		this.lines.splice(index+1, 0, text);
		return true;
	};
	if ('remove' == type) {
		// Remove at index
		this.lines.splice(index, 1);
		return true;
	};
};

var FixedListController = function (items) {
	this.items = items || [];
};

FixedListController.prototype = new WindowController();

FixedListController.prototype.size = function() {
	// Returns number of lines
	return this.items.length;
};

FixedListController.prototype.line = function(index) {
	// Returns information about current line (text, colors, parameters)
	if (index>=this.items.length || index<0) {
		// Out of range
		return null;
	};
	var clone = function (obj, skip) {
		var n = {};
		for (var id in obj) {
			if (skip && skip.indexOf(id) != -1) {
				// Found in skip
				continue;
			};
			n[id] = obj[id];
		}
		return n;
	}
	var item = this.items[index];
	var result = clone(item);
	return result;
};

FixedListController.prototype.edit = function(index, type, text) {
	// Called when user edited text
	var item = this.items[index];
	if (item && item.edit && type == 'edit') {
		// Accept edit
		item.text = text;
		return true;
	};
	return false;
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

UIProvider.prototype.moveWindow = function(context, bounds) {
	// Moves window by bounds provided
};

UIProvider.prototype.windowSize = function(context) {
	// Calculates visible part of window, by context
};

UIProvider.prototype.clearWindow = function(ctx, config, handler) {
	// Removes all lines and creates new empty lines. Called at startup, resize
};

UIProvider.prototype.windowLines = function(ctx) {
	// Return number of lines currently shown
};

UIProvider.prototype.windowShowLine = function(ctx, index, line, handler) {
	// Renders line
};

UIProvider.prototype.windowEditLine = function(ctx, index, line, position) {
	// Starts editing of line and moves cursor to position
};

UIProvider.prototype.windowFinishEditLine = function(ctx, index) {
	// Finishes editing of line, returns text and position of cursor
};

UIProvider.prototype.windowLineVisible = function(ctx, index) {
	// Detects if line is visible by height inside window
};

UIProvider.prototype.windowEditorState = function(ctx, index) {
	// Returns entered state and cursor position, if available
};

var WindowProvider = function (config, layer, ui, handler) {
	// Will be the bridge UI provider and data controller. Frame will decide which window will receive events
	this.config = config;
	this.ui = ui;
	this.data = config.controller;
	this.data.events.on('change', function (evt) {
		// When data is changed
	}.bind(this));
	this.ctx = ui.createWindow(layer, config);
	this.ctx.events.on('click', function (evt) {
		return this.onClick(evt.index, evt.position);
	}.bind(this));
	this.ctx.events.on('change', function (evt) {
		return this.onChange(evt);
	}.bind(this));
	this.ctx.events.on('focus', function (evt) {
		return this.onFocus(evt.index, evt.position);
	}.bind(this));
	this.from = config.from || 0;
	this.selected = null;
	this.redrawLines('create', function () {
		if (config.selected>=0) {
			this.focus(config.selected - this.from, this.data.line(config.selected), config.position || 0);
		};
		handler();
	}.bind(this));
};

WindowProvider.prototype.colorize = function(text, colors) {
	// Splits colors into another array of atomic span configurations
	var points = [];
	for (var i = 0; i < text.length; i++) {
		points.push([]);
	};
	for (var i = 0; i < colors.length; i++) {
		var c = colors[i];
		if (!c.from && 0 != c.from) {
			continue;
		};
		for (var j = c.from; j < c.from+c.length && j<points.length; j++) {
			points[j].push(i);
		};
	};
	var processLevel = function (level, from, length, arr) {
		// Reads points, creates spans
		var findColorLength = function (from, len, index) {
			var result = 0;
			for (var i = from; i < len; i++) {
				var idx = points[i].length>level? points[i][level]: -1;
				if (idx != index) {
					// No points or color is different
					return result;
				};
				result++;
			};
			return result;
		};
		for (var i = from; i < from+length; i++) {
			var index = points[i].length>level? points[i][level]: -1;// Index of colors on this level or -1 for no color
			var len = findColorLength(i, from+length, index);
			if (index == -1 && i == from && len == length) {
				// No colored items on this level
				return;
			};
			var obj = {
				from: i,
				length: len,
				color: index != -1? colors[index]: null,
				children: []
			};
			arr.push(obj);
			if (index != -1) {
				// Have color
				processLevel(level+1, obj.from, obj.length, obj.children);
			};
			i = obj.from+obj.length-1;
		};
	};
	var spans = [];
	processLevel(0, 0, points.length, spans);
	return spans;
};

WindowProvider.prototype.ensureVisible = function(index) {
	// Ensures line is visible
	if (!this.ui.windowLineVisible(this.ctx, index)) {
		// Not visible
		// this.ui.log('Line no', index, this.from, 'not visible - moving');
		this.from = this.from+index;
		this.showLines('move focus');
		return 0;
	};
	return index;
};

WindowProvider.prototype.focus = function(index, line, position) {
	// Edit or select line
	if (!line) {
		return false;
	};
	// this.ui.log('focus', index, line, position);
	if (line.edit) {
		// Can edit
		this.ui.windowEditLine(this.ctx, index, line, position);
	} else {
		// Just select
		this.showLine(index, line, true);
	}
};

WindowProvider.prototype.onClick = function(index, position) {
	// Handle click
	var line = this.data.line(index+this.from);
	index = this.ensureVisible(index);
	this.focus(index, line, position);
};

WindowProvider.prototype.onFocus = function(index, position) {
	// Handle click
	// this.ui.log('Focus changed:', index, position);
	this.selected = {
		index: index+this.from,
		position: position
	}
};

WindowProvider.prototype.showLine = function(idx, line, focus) {
	// Prepares colors and shows line
	var colors = line.colors || [];
	var text = line.display || line.text;
	colors.splice(0, 0, {from: 0, length: text.length});
	line.colors = this.colorize(text, colors);
	line.focus = focus;
	this.ui.windowShowLine(this.ctx, idx, line);
};

WindowProvider.prototype.onChange = function(evt) {
	// Handle click
	var idx = evt.index;
	var index = evt.index+this.from;
	var line = this.data.line(index);
	if (line && line.edit) {
		// Can edit
		if (this.data.edit(index, 'edit', evt.text)) {
			// Edit accepted
			line = this.data.line(index);
			this.showLine(idx, line);
			idx = this.ensureVisible(idx);
			this.ui.windowEditLine(this.ctx, idx, line, evt.position);
		};
	};
};

WindowProvider.prototype.redrawLines = function(reason, handler) {
	// Remove all lines and create new empty lines
	this.ui.clearWindow(this.ctx, this.config, function () {
		this.showLines(reason, handler);
	}.bind(this));
};

WindowProvider.prototype.showLines = function(reason, handler) {
	// Fill lines started from this.from
	if (this.from>=this.data.size()) {
		this.from = this.data.size()-1;
	};
	if (this.from<0) {
		this.from = 0;
	};
	for (var i = 0; i < this.ui.windowLines(this.ctx); i++) {
		var line = this.data.line(i+this.from);
		if (!line) {
			line = {
				edit: false,
				text: '',
				colors: []
			};
		};
		this.showLine(i, line);
	};
	if (handler) {
		handler();
	};
};

WindowProvider.prototype.moveCursor = function(dir) {
	// Move cursor
	if (!this.selected) {
		// No selection
		this.selected = {index: this.from, position: 0};
	};
	var idx = this.selected.index;
	var line = this.data.line(idx);
	var cursor = this.ui.windowEditorState(this.ctx, idx - this.from);
	if (!cursor) {
		cursor = {
			position: this.selected.position,
			text: line.text
		};
	};
	var pos = cursor.position;
	if (dir == 'left') {
		if (pos != 0) {
			return;
		};
		var prevLine = this.data.line(idx-1);
		if (!prevLine || !prevLine.edit) {
			return;
		};
	};
	if (dir == 'right' && line) {
		if (pos != cursor.text.length) {
			return;
		};
		var nextLine = this.data.line(idx+1);
		if (!nextLine || !nextLine.edit) {
			return;
		};
	};
	this.ui.windowFinishEditLine(this.ctx, idx-this.from);
	var page = this.ui.windowLines(this.ctx);
	if (dir == 'up') {
		idx--;
	};
	if (dir == 'left') {
		idx--;
		var prevLine = this.data.line(idx);
		if (prevLine) {
			pos = prevLine.text.length;
		};
	};
	if (dir == 'down') {
		idx++;
	};
	if (dir == 'right') {
		idx++;
		pos = 0;
	};
	if (dir == 'pageup') {
		idx -= page;
	};
	if (dir == 'pagedown') {
		idx += page;
	};
	if (idx>=this.data.size()) {
		// Too big
		idx = this.data.size()-1;
		if (this.config.autoHeight) {
			this.from = 0;
		} else {
			this.from = idx; // Most simple
		}
		this.showLines('cursor');
	};
	if (idx<this.from) {
		// Moved to top
		if (this.config.autoHeight) {
			idx = 0;
		}
		this.from = idx; // Most simple
		this.showLines('cursor');
	};
	var lineIndex = idx - this.from; // lineIndex is local to page
	lineIndex = this.ensureVisible(lineIndex); // Line is visible
	this.focus(lineIndex, this.data.line(lineIndex+this.from), pos);
	return false;
};

WindowProvider.prototype.keyPress = function(evt) {
	// Called when key pressed
	// this.ui.log('keyPress', evt);	
	if (evt.key == 'up' || evt.key == 'down' || evt.key == 'pagedown' || evt.key == 'pageup' || evt.key == 'left' || evt.key == 'right') {
		return this.moveCursor(evt.key);
	};
	if (this.selected && evt.key == 'enter') {
		// New line
		this.splitLine();
		return false;
	};
	if (this.selected && evt.key == 'backspace') {
		return this.handleBackspace();
	};
	if (this.selected && evt.key == 'delete') {
		return this.handleDelete();
	};
};

WindowProvider.prototype.handleBackspace = function() {
	var line = this.data.line(this.selected.index);
	var prevLine = this.data.line(this.selected.index-1);
	var cursor = this.ui.windowEditorState(this.ctx, this.selected.index - this.from);
	if (cursor && 0 == cursor.position && line && prevLine && line.remove && prevLine.edit) {
		// All OK
		var pos = prevLine.text.length;
		if (this.data.edit(this.selected.index-1, 'edit', prevLine.text+cursor.text) && this.data.edit(this.selected.index, 'remove')) {
			this.ui.windowFinishEditLine(this.ctx, this.selected.index - this.from);
			var lineIndex = this.selected.index - 1 - this.from; // lineIndex is local to page
			if (lineIndex<0) {
				this.from = this.selected.index - 1;
				lineIndex = 0;
			};
			this.showLines('backspace');
			lineIndex = this.ensureVisible(lineIndex); // Line is visible
			this.ui.windowEditLine(this.ctx, lineIndex, this.data.line(lineIndex+this.from), pos);
			return false;
		};
	};
};

WindowProvider.prototype.handleDelete = function() {
	var line = this.data.line(this.selected.index);
	var nextLine = this.data.line(this.selected.index+1);
	var cursor = this.ui.windowEditorState(this.ctx, this.selected.index - this.from);
	if (cursor && cursor.text.length == cursor.position && line && nextLine && line.edit && nextLine.remove) {
		// All OK
		if (this.data.edit(this.selected.index, 'edit', cursor.text+nextLine.text) && this.data.edit(this.selected.index+1, 'remove')) {
			this.ui.windowFinishEditLine(this.ctx, this.selected.index - this.from);
			var lineIndex = this.selected.index - this.from; // lineIndex is local to page
			this.showLines('delete');
			lineIndex = this.ensureVisible(lineIndex); // Line is visible
			this.ui.windowEditLine(this.ctx, lineIndex, this.data.line(lineIndex+this.from), cursor.position);
			return false;
		};
	};
};

WindowProvider.prototype.splitLine = function() {
	var line = this.data.line(this.selected.index);
	if (line.edit && line.add) {
		// Editable and can add new line after
		var cursor = this.ui.windowFinishEditLine(this.ctx, this.selected.index - this.from);
		if (!cursor) {
			return;
		};
		var editText = cursor.text.substr(0, cursor.position);
		var addText = cursor.text.substr(cursor.position);
		if (this.data.edit(this.selected.index, 'edit', editText) && this.data.edit(this.selected.index, 'add', addText)) {
			this.showLines('enter');
			var lineIndex = this.selected.index+1 - this.from; // lineIndex is local to page
			lineIndex = this.ensureVisible(lineIndex); // Line is visible
			this.ui.windowEditLine(this.ctx, lineIndex, this.data.line(lineIndex+this.from), 0);
		};
	};
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

WindowFrame.prototype.keyPress = function(evt) {
	// Called when key pressed
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
	return [0, 0, this.ui.width(), this.ui.height()];
};

CenterWindowFrame.prototype.center = function() {
	var size = this.ui.windowSize(this.windowCtx.ctx);
	var height = this.windowConfig.height;
	if (!height) {
		height = size.height;
	};
	this.windowConfig.x = Math.floor((this.ui.width()-this.windowConfig.width)/2);
	this.windowConfig.y = Math.floor((this.ui.height()-height)/2);
	this.ui.moveWindow(this.windowCtx.ctx, [this.windowConfig.x, this.windowConfig.y, this.windowConfig.width, this.windowConfig]);
};

CenterWindowFrame.prototype.resize = function(width, height) {
	// Called when window is resized
	this.center();
};

CenterWindowFrame.prototype.bind = function(layer, ui) {
	// Called when frame is bound to layer
	this.layer = layer;
	this.ui = ui;
	if (this.windowConfig.width>ui.width()) {
		this.windowConfig.width = ui.width();
	};
	this.windowCtx = new WindowProvider(this.windowConfig, layer, ui, function () {
		// Window is displayed first time, size is clear
	});
	this.center();
};

CenterWindowFrame.prototype.keyPress = function(evt) {
	// Called when key pressed
	// TODO handle escape
	return this.windowCtx.keyPress(evt);
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
		for (var i = this.frames.length - 1; i >= 0; i--) {
			var frame = this.frames[i];
			frame.resize();
		};
	}.bind(this));
	this.ui.events.on('key', function (evt) {
		// When key pressed
		return this.onKeyPress(evt);
	}.bind(this));
};

WindowFrameManager.prototype.onKeyPress = function(evt) {
	// Pass buttons to every frame
	for (var i = this.frames.length - 1; i >= 0; i--) {
		var frame = this.frames[i];
		var result = frame.keyPress(evt);
		if (false == result) {
			return false;
		};
		if (true != result) {
			// Not set to true
			break;
		};
	};
};

var WindowFactory = function () {
	// Will hold functions for creating windows and dialogs, window fragments
};

WindowFactory.prototype.lineTextEditor = function(value, hint) {
	var result = {
		text: value,
		edit: true,
		single: 'middle'
	};
	return result;
};

WindowFactory.prototype.lineCaption = function(value, align, style, colors) {
	return {
		text: value,
		align: align || 'left'
	};
};

WindowFactory.prototype.lineButtons = function(captions, handler) {
	var colors = [];
	var text = '';
	for (var i = 0; i < captions.length; i++) {
		if (i>0) {
			text += ' ';
		};
		var start = text.length;
		text += '['+captions[i]+']';
		colors.push({
			from: start,
			length: captions[i].length+2,
			color: 'clickable',
			clickable: true
		});
	};
	return {
		align: 'center',
		colors: colors,
		text: text
	};
};

window.tango5 = {
	WindowController: WindowController,
	UIProvider: UIProvider,
	WindowFrame: WindowFrame,
	WindowFrameManager: WindowFrameManager,
	CenterWindowFrame: CenterWindowFrame,
	PlainTextController: PlainTextController,
	FixedListController: FixedListController,
	windowFactory: new WindowFactory(),
	EventEmitter: EventEmitter
};

})();