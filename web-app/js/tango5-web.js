(function(tango5){
var UIProvider = function () {
};

UIProvider.prototype = new tango5.UIProvider();

UIProvider.prototype.whenReady = function(handler) {
	document.addEventListener('DOMContentLoaded', function () {
		// Create one char div and check it's size
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
		div: div
	};
	this.moveWindow(ctx, [config.x, config.y, config.width, config.height]);
	return ctx;
};

UIProvider.prototype.text = function(el, text, softspace) {
	var nl = el.childNodes;
	while(nl.length>0) {
		el.removeChild(nl.item(0));
	}
	if (text) {
		var data = text;
		if (softspace) {
			data = this.addSoftSpace(text);
		};
		el.appendChild(document.createTextNode(data));
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