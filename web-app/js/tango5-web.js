(function(tango5){
var UIProvider = function () {
};

UIProvider.prototype = new tango5.UIProvider();

UIProvider.prototype.whenReady = function(handler) {
	document.addEventListener('DOMContentLoaded', function () {
		// Create one char div and check it's size
		this.setListeners();
		this.defaultTextDiv = this.el('div', document.body, {
			'class': 'default_text hidden_text_measure'
		}, 'X');
		var checkSize = function () {
			var height = this.defaultTextDiv.offsetHeight;
			if (height) {
				// Found
				return handler();
			};
			setTimeout(checkSize, 100);
		}.bind(this);
		setTimeout(checkSize, 200);
	}.bind(this));
};

UIProvider.prototype.setListeners = function() {
	// When body is ready, set listeners
	document.body.addEventListener('keydown', function (evt) {
		var handle = function (key) {
			var e = {
				ctrl: evt.ctrlKey,
				shift: evt.shiftKey,
				alt: evt.altKey,
				key: key
			};
			var result = this.events.emit('key', e);
			if (false == result) {
				// Stop
				evt.preventDefault();
				evt.stopPropagation();
				return false;
			};
		}.bind(this);
		// this.log('Button:', evt.keyCode);
		switch(evt.keyCode) {
			case 33: return handle('pageup');
			case 34: return handle('pagedown');
			case 38: return handle('up');
			case 40: return handle('down');
			case 37: return handle('left');
			case 39: return handle('right');
			case 27: return handle('esc');
			case 13: return handle('enter');
			case 8: return handle('backspace');
			case 46: return handle('delete');
			case 9: return handle('tab');
		}
	}.bind(this));
};

UIProvider.prototype.oneChar = function() {
	return {
		width: this.defaultTextDiv.offsetWidth,
		height: this.defaultTextDiv.offsetHeight
	}
};

UIProvider.prototype.width = function() {
	return Math.floor(window.innerWidth / this.oneChar().width);
};

UIProvider.prototype.height = function() {
	return Math.floor(window.innerHeight / this.oneChar().height);
};

UIProvider.prototype.log = function() {
	var params = [];
	for (var i = 0; i < arguments.length; i++) {
		params.push(arguments[i]);
	};
	console.log.apply(console, params);
};

UIProvider.prototype.addLayer = function() {
	// Creates new layer on top, returns context
	var div = this.el('div', document.body, {
		'class': 'ui_layer'
	});
	return {
		div: div
	};
};

UIProvider.prototype.moveWindow = function(context, bounds) {
	var oneChar = this.oneChar();
	this.log('moveWindow', context, oneChar, bounds);
	var px = function (val) {
		return ""+val+"px";
	}
	context.div.style.left = px((bounds[0] || 0)*oneChar.width);
	context.div.style.top = px((bounds[1] || 0)*oneChar.height);
	context.div.style.width = px((bounds[2] || 0)*oneChar.width);
	context.div.style.height = px((bounds[3] || 0)*oneChar.height);
};

UIProvider.prototype.createWindow = function(layer, config) {
	// Creates new window, returns context
	var div = this.el('div', layer.div, {
		'class': 'window default_text'
	});
	if (config.frame) {
		div.classList.add('window_frame');
	};
	var contentsDiv = this.el('div', div, {
		'class': 'window_contents'
	});
	var ctx = {
		div: div,
		contentsDiv: contentsDiv,
		events: new tango5.EventEmitter()
	};
	this.moveWindow(ctx, [config.x, config.y, config.width, config.height]);
	return ctx;
};

UIProvider.prototype.clearWindow = function(ctx, minStyle, handler) {
	// Removes all lines and creates new empty lines. Called at startup, resize
	this.text(ctx.contentsDiv);
	var lines = 0;
	var	render = function (index) {
		var line = this.el('div', ctx.contentsDiv, {
			'class': 'window_line default_text'
		});
		if (minStyle) {
			// Also add minStyle
			line.classList.add(minStyle);
		};
		var span = this.el('div', line, {
			'class': 'window_line_content'
		});
		line.addEventListener('click', function (evt) {
			// Start or continue edit
			var position = this.getCursorPos(span);
			// this.log('Click on line:', index, position);
			ctx.events.emit('click', {
				index: index,
				position: position
			});
		}.bind(this));
	}.bind(this);
	while(ctx.contentsDiv.offsetHeight<ctx.div.offsetHeight || lines == 0) {
		render(lines);
		lines++;
	}
	this.log('Lines created:', lines);
	ctx.lines = lines;
	handler();
};

UIProvider.prototype.windowLines = function(ctx) {
	return ctx.lines || 0;
};

UIProvider.prototype.getCursorPos = function (div) {
	var selection = window.getSelection();
	if (selection.rangeCount == 0) {
		return 0;
	};
	var range = selection.getRangeAt(0);
	var treeWalker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, function (node) {
		var nodeRange = document.createRange();
		nodeRange.selectNodeContents(node);
		if (nodeRange.compareBoundaryPoints(Range.END_TO_END, range) < 1) {
			return NodeFilter.FILTER_ACCEPT;
		} else {
			return NodeFilter.FILTER_REJECT;
		}
	}, false);
	var charCount = 0;
	while (treeWalker.nextNode()) {
		charCount += treeWalker.currentNode.length;
	}
	if (range.startContainer.nodeType == 3) {
		charCount += range.startOffset;
	};
	return charCount;
};

UIProvider.prototype.windowShowLine = function(ctx, index, line, handler) {
	// Renders line
	var lineDiv = ctx.contentsDiv.childNodes[index];
	if (!lineDiv) {
		// Invalid
		return;
	};
	var span = lineDiv.childNodes[0];
	this.text(span);
	var text = line.display || line.text;
	var enableClick = function (color, sp) {
		// Handles click
		sp.addEventListener('click', function (evt) {
			ctx.events.emit('clickable', {
				index: index,
				color: color
			});
			evt.stopPropagation();
			return false;
		});
	}.bind(this);
	var processColors = function (arr, parent) {
		// Creates spans based on colors
		if (!arr) {
			// No data
			return;
		};
		for (var i = 0; i < arr.length; i++) {
			var item = arr[i];
			var sp = this.el('span', parent, {
			});
			if (item.color && item.color.color) {
				sp.classList.add('theme_'+item.color.color);
			};
			if (item.color && item.color.clickable) {
				sp.classList.add('window_line_clickable');
				enableClick(item.color, sp);
			};
			if (item.children.length == 0) {
				this.text(sp, text.substr(item.from, item.length));
			} else {
				processColors(item.children, sp);
			}
		};
	}.bind(this);
	processColors(line.colors, span);
	if (handler) {
		handler();
	};
};

UIProvider.prototype.windowLineVisible = function(ctx, index) {
	// Detects if line is visible by height inside window
	ctx.div.scrollTop = 0;
	if (index<0) {
		return false;
	};
	var lineDiv = ctx.contentsDiv.childNodes[index];
	if (!lineDiv) {
		// Invalid
		return false;
	};
	// this.log('Visible?', ctx.div.offsetHeight, lineDiv.offsetHeight+lineDiv.offsetTop, ctx.div.scrollTop, ctx.contentsDiv.scrollTop);
	if (lineDiv.offsetHeight+lineDiv.offsetTop>ctx.div.offsetHeight) {
		// Outside of contentsDiv visible area
		return false;
	};
	return true	;
};

UIProvider.prototype.windowEditLine = function(ctx, index, line, position) {
	// Render text-area
	var lineDiv = ctx.contentsDiv.childNodes[index];
	if (!lineDiv || !line) {
		// Invalid
		return;
	};
	if (lineDiv.dataset.edit) {
		// Already in edit - ignore or move cursor?
		this.events.emit('focus', {
			index: index,
			position: position
		});
		return false;
	};
	// this.log('Edit', index, line, position, line.text.length);
	lineDiv.dataset.edit = 'edit';
	var textarea = this.el('textarea', lineDiv, {
		'class': 'window_line_edit default_text'
	});
	textarea.value = line.text;
	lineDiv.classList.add('window_line_in_edit');
	textarea.focus();
	textarea.selectionStart = position || 0;
	textarea.addEventListener('blur', function (evt) {
		ctx.events.emit('focus', {
			index: index,
			position: textarea.selectionEnd
		});
		this.windowFinishEditLine(ctx, index);
	}.bind(this));
	textarea.addEventListener('input', function (evt) {
		// Data changed - report changes
		ctx.events.emit('change', {
			text: textarea.value,
			index: index,
			position: textarea.selectionEnd
		});
		ctx.events.emit('focus', {
			index: index,
			position: textarea.selectionEnd
		});
	}.bind(this));
	ctx.events.emit('focus', {
		index: index,
		position: position
	});
};

UIProvider.prototype.windowEditorState = function(ctx, index) {
	// Returns entered state and cursor position, if available
	var lineDiv = ctx.contentsDiv.childNodes[index];
	if (!lineDiv) {
		// Invalid
		return null;
	};
	if (!lineDiv.dataset.edit) {
		// Not in edit
		return null;
	};
	var textarea = lineDiv.childNodes[1];
	var cursor = textarea.selectionEnd;
	var text = textarea.value;
	return {position: cursor, text: text};
};

UIProvider.prototype.windowFinishEditLine = function(ctx, index) {
	// Finishes editing of line, returns text and position of cursor
	var lineDiv = ctx.contentsDiv.childNodes[index];
	if (!lineDiv) {
		// Invalid
		return null;
	};
	if (!lineDiv.dataset.edit) {
		// Not in edit
		return null;
	};
	delete lineDiv.dataset.edit;
	lineDiv.classList.remove('window_line_in_edit');
	var textarea = lineDiv.childNodes[1];
	var cursor = textarea.selectionEnd;
	var text = textarea.value;
	lineDiv.removeChild(textarea);
	return {position: cursor, text: text};
};

UIProvider.prototype.text = function(el, text, softspace) {
	var nl = el.childNodes;
	while(nl.length>0) {
		el.removeChild(nl.item(0));
	}
	if (text) {
		for (var i = 0; i < text.length; i++) {
			if (text.charAt(i) == ' ') {
				// Space
				el.innerHTML += '&nbsp;';
			} else {
				el.innerHTML += text.charAt(i);
			}
		};
		// el.appendChild(document.createTextNode(data));
	};
};

UIProvider.prototype.el = function(name, parent, attr, text) {
    var el = document.createElement(name);
    if (parent) { // Have parent
        parent.appendChild(el);
    };
    if (attr) {
        for (var id in attr) {
            var value = attr[id];
            if (value && typeof(value) == 'string') {
                el.setAttribute(id, value);
            };
        };
    }
    if (text) {
        // Add text content
        el.appendChild(document.createTextNode(text));
    }
    return el;
};

tango5.PlatformUIProvider = UIProvider;
})(tango5);