document.addEventListener('DOMContentLoaded', function () {
	var app = new App();
});

if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str){
        return this.slice(0, str.length) == str;
    };
};

if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function (str){
        return this.slice(-str.length) == str;
    };
};

var EventEmitter = function(emitter) {//Creates new event emitter
    this.events = {};
    this.emitter = emitter;
};

EventEmitter.prototype.on = function(type, handler, top) {//Adds new handler
    if (!type || !handler) {//Invalid params
        return false;
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
            return false;
        };
    };
    if (top) {
        arr.splice(0, 0, handler);
    } else {
        arr.push(handler);
    }
    return true;
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

var App = function () {
	// $$.log('App started', this.pxInEm(document.body));
	this.wideLayout = {
		id: '#root_pane',
		auto: false,
		children: [
			{id: '#top_pane', stretch: false},
			{
				id: '#main_pane', 
				stretch: true, 
				horizontal: true,
				children: [{id: '#left_pane', stretch: true}, {id: '#right_pane', stretch: true}]
			}]
	};
	this.narrowLayout = {
		id: '#root_pane',
		auto: false,
		height: 'auto',
		children: [
			{id: '#top_pane', stretch: false},
			{
				id: '#main_pane', 
				stretch: true, 
				horizontal: false,
				children: [{id: '#left_pane', stretch: true}, {id: '#right_pane', stretch: true}]
			}]
	};
	this.events = new EventEmitter(this);
	this.layoutType = '';
    window.addEventListener('resize', function(e) {//Auto resize
        this.resize();
    }.bind(this));
	setTimeout(function () {
		this.resize();
	}.bind(this), 10);
	this.initConnection(function () {
		this.initUI();
	}.bind(this));
	this.appCache = new AppCacheManager(function (err, newVersion) {
		$$.log('App cache:', err, newVersion);
		if (newVersion) {
			// Show message about it
			this.showInfo('Reload page for new version', true);
		};
	}.bind(this));
};

App.prototype.resize = function() {
	var inEm = this.pxInEm(document.body);
	var ems = Math.floor(document.body.offsetWidth / inEm);
	var newLayout = 'wide';
	if (ems<30) {
		newLayout = 'narrow';
	};
	if (this.layoutType != newLayout) {
		document.body.className = 'layout_'+newLayout;
		this.layout = new Layout(newLayout == 'wide'? this.wideLayout: this.narrowLayout);
		this.layoutType = newLayout;
	};
	this.layout.resize();
};

App.prototype.initConnection = function(handler) {
    this.dbs = [];
    this.manager = new SitesManager(function(err) {
        if (err) {
            return $$.log('Error:', err);
            return this.showError(err, true);
        }
        var id = this.manager.defaultConnection();
        $$.log('ID:', id);
        if(!id) {
            this.showError('Container not defined', true);
            return;
        }
        this.manager.initConnection(id, function (err, conn) {
            if (err) {
                this.showError(err, true);
                return;
            };
            $$.log('Connection is done', err, id, conn);
            this.initDB(conn, function (err, db) {
            	handler();
            }.bind(this));
        }.bind(this));
    }.bind(this));	
};

App.prototype.onDocChange = function(type, doc) {
	this.events.emit(type, {
		item: doc
	});
};

App.prototype.onPending = function(start) {
	// $$.log('Pending changed:', start);
	var el = this.findEl('#pending_message');
	if (start) {
		this.text(el, 'Please wait, sync is in progress...');
		el.className = 'blink';
	} else {
		el.classList.remove('blink');
	}
};

App.prototype.initDB = function(conn, handler) {
    var db = new DocumentsManager(conn, function (err) {
        if (err) {
            this.showError(err, true);
            return;
        };
        $$.log('Ready to show UI');
        db.onDocumentSyncChange = this.onDocChange.bind(this);
        db.onPending = this.onPending.bind(this);
        db.autoSyncInterval = 60;
        this.dbs.push(db);
        if (handler) {
            handler(null, db);
        };
    }.bind(this), {
        version: 3,
        upgrade: function (db, t, version) {
            switch (version) {
            case 1:
                var documents = t.objectStore('documents');
                documents.createIndex('title', 'title');
                return;
            case 2:
                var documents = t.objectStore('documents');
                documents.createIndex('tags', 'tags', {multiEntry: true});
                documents.createIndex('archived', 'archived');
                return;
            case 3:
                var documents = t.objectStore('documents');
                documents.createIndex('parent', 'parent');
                documents.createIndex('starred', 'starred');
                return;
            }
        }.bind(this)
    });	
};

App.prototype.db = function(item) {
	for (var i = 0; i < this.dbs.length; i++) {
		var db = this.dbs[i];
		if (item.conn == db.conn.code) {
			return db;
		};
	};
	return this.dbs[0]; // Default
};

App.prototype.renderIndicator = function(parent) {
	var span = this.el('div', parent, {
		'class': 'indicator'
	});
	return function (type) {
		span.classList.remove('indicator_ok');
		span.classList.remove('indicator_err');
		if (type == 'on') {
			span.classList.add('indicator_ok');
		};
		if (type == 'off') {
			span.classList.add('indicator_err');
		};
	};
};

App.prototype.refreshSyncControls = function() {
	var div = this.findEl('#sync_buttons');
	this.text(div);
	var buttonForSync = function (db) {
		var wrapper = this.el('div', div, {
			'class': 'sync_block'
		});
		db.onPingState = function (err, data) {
			$$.log('Ping state:', err, data);
			if (err) {
				pingIndicator('off');
				this.showError(err);
			} else {
				if (data) {
					pingIndicator('');
				} else {
					pingIndicator('on');
				}
			}
		}.bind(this);
		db.onNetworkChange = function (online) {
			networkIndicator(online? 'on': 'off');
		}.bind(this);
		db.onChangeChanged = function (changed) {
			// Called when modification is executed
			dataIndicator(changed? 'off': 'on');
		}
		db.startPing({
			slow: 1800
		}, this.manager, function () {
		}.bind(this));
		var networkIndicator = this.renderIndicator(wrapper);
		networkIndicator(db.online? 'on': 'off');
		var pingIndicator = this.renderIndicator(wrapper);
		var dataIndicator = this.renderIndicator(wrapper);
		dataIndicator(db.changed? 'off': 'on');
		var button = this.el('button', wrapper, {
			'class': 'item_button'
		}, db.conn.code);
		var doSync = function () {
			button.disabled = true;
			this.text(button, 'Sync...');
			db.sync(this.manager, function (err) {
				button.disabled = false;
				this.text(button, db.conn.code);
				if (err) {
					this.showError(err);
				} else {
					this.showInfo('Sync done: '+db.conn.code);					
				}
			}.bind(this));
		}.bind(this);
		button.addEventListener('click', function (evt) {
			doSync();
		}.bind(this));
		db.onAutoSync = function () {
			doSync();
		}.bind(this);
	}.bind(this);
	for (var i = 0; i < this.dbs.length; i++) {
		var db = this.dbs[i];
		buttonForSync(db);
	};
};

App.prototype.showMessage = function(config) {
	var place = this.findEl('#messages_list');
	var el = this.el('div', place, {
		'class': 'message'
	}, config.message || '<Undefined>');
	if (config.type) {
		el.classList.add('message_'+config.type);
	};
	var remove = function () {
		el.classList.add('fade');
		setTimeout(function () {
			el.parentNode.removeChild(el);
		}, 1000);
	}
	el.addEventListener('click', function (evt) {
		remove();
		evt.stopPropagation();
	});
	if (!config.timeout) {
		config.timeout = 1500;
	};
	if (-1 != config.timeout) {
		setTimeout(function () {
			remove();
		}, config.timeout);
	};
};

App.prototype.showInfo = function(message, persist) {
	this.showMessage({
		timeout: persist? -1: 0,
		message: message
	});
};

App.prototype.showError = function(message, persist) {
	$$.log('Reported error:', message);
	// alert('Error: '+message);
	this.showMessage({
		message: message,
		timeout: persist? -1: 0,
		type: 'error'
	});
};

var FreePanel = function (app, div) {
	this.app = app;
	this.div = div;
	this.items = [];
	this.renders = [];
	this.div.addEventListener('click', function (evt) {
		// Reset selection
		app.selectItem(null);
		// this.showItems();
	}.bind(this));
	app.enableDrop(div, {
		'custom/item': function (other) {
			$$.log('Dropped on free panel:', other);
			app.events.emit('pin', {
				item: other
			});
			return false;
		}.bind(this)
	});
	app.events.on('select', function (evt) {
		this.selectItem(evt.item);
	}.bind(this));
	app.events.on('pin', function (evt) {
		if (this.addItem(evt.item)) {
			this.showItems(evt.item);
		};
	}.bind(this));
	app.events.on('unpin', function (evt) {
		if (this.removeItem(evt.item)) {
			this.showItems(evt.item);
		};
	}.bind(this));
	this.loadStarred();
};

FreePanel.prototype.selectItem = function(item) {
	this.showItems(item);
};

FreePanel.prototype.loadStarred = function() {
	// Loads all starred items to panel
	this.app.list({starred: 1}, function (err, list) {
		if (err) {
			return this.app.showError(err);
		};
		this.items = list;
		this.showItems();
	}.bind(this));
};

FreePanel.prototype.showItems = function(selected) {
	this.app.refreshPane(this.div, this.renders, this.items, {
		selected: selected? selected.id: null,
		unpin: true
	});
};

FreePanel.prototype.addItem = function(other) {
	for (var i = 0; i < this.items.length; i++) {
		var item = this.items[i];
		if (item.id == other.id) {
			return false;
		};
	};
	this.items.push(other);
	return true;
};

FreePanel.prototype.removeItem = function(other) {
	for (var i = 0; i < this.items.length; i++) {
		var item = this.items[i];
		if (item.id == other.id) {
			this.items.splice(i, 1);
			return true;
		};
	};
	return false;
};

var BrowserPanel = function (app, div) {
	this.app = app;
	this.div = div;
	this.items = [];
	this.div.addEventListener('dblclick', function (evt) {
		// Add new item to currently selected item
		window.getSelection().removeAllRanges();
		app.createNewItem(this.selected);
		evt.preventDefault();
		evt.stopPropagation();
		return false;
	}.bind(this));
	app.enableDrop(div, {
		'custom/item': function (other) {
			$$.log('Dropped on browser panel:', other);
			app.reparent(this.selected, other, function (err) {
				if (err) {
					return this.showError(err);
				};
				this.selectItem(this.selected);
			}.bind(this));
			return false;
		}
	});
	app.events.on('select', function (evt) {
		this.selectItem(evt.item);
	}.bind(this));
	app.events.on('update', function (evt) {
		if (true) {
			var id = this.selected? this.selected.id : 'null';
			if (id == evt.fromparent || id == evt.toparent) {
				this.selectItem(this.selected);
			};
		};
	}.bind(this));
};

BrowserPanel.prototype.selectItem = function(item) {
	// When item is selected in left pane - load items to right pane
	// parent: item? item.id: 'null'
	var allItems = [];
	var items = [];
	if (item && item.parent) {
		allItems.push({id: item.parent}); // First is parent of current item
	};
	if (item) {
		allItems.push({id: item.id}); // Add itself
	};
	allItems.push({parent: item? item.id: 'null'});
	iterateOver(allItems, function (conf, cb) {
		this.app.list(conf, function (err, list) {
			// Selected right panel
			if (err) {
				return cb(err);
			};
			for (var i = 0; i < list.length; i++) {
				items.push(list[i]);
			};
			cb(null);
		}.bind(this));
	}.bind(this), function (err) {
		// $$.log('selectItem', item, err, items);
		if (err) {
			return app.showError(err);
		};
		this.selected = item;
		this.app.refreshPane(this.div, this.items, items, {
			selected: item? item.id: null,
			edit: true,
			scroll: true,
			pin: true
		});		
	}.bind(this));
};

App.prototype.initUI = function() {
	this.selected = null;
	this.freePanel = new FreePanel(this, this.findEl('#left_pane'));
	this.browser = new BrowserPanel(this, this.findEl('#right_pane'));
	this.browser.selectItem(null);
	this.refreshSyncControls();
	this.showInfo('Application loaded');
	this.loadApplications();
	var button = this.el('button', this.findEl('#top_controls'), {
		'class': 'item_button'
	}, 'Top');
	button.addEventListener('click', function (evt) {
		this.browser.selectItem(null);
	}.bind(this));
};

App.prototype.enableDrop = function(div, types) {
	var hasType = function (evt, t) {
		for (var i = 0; i < evt.dataTransfer.types.length; i++) {
			var type = evt.dataTransfer.types[i];
			if (t == type) {
				return true;
			};
		};
		return false;
	};
	div.addEventListener('dragover', function (evt) {
		for (var t in types) {
			// $$.log('dragover', t, hasType(evt, t), evt.dataTransfer.types);
			if (hasType(evt, t)) {
				evt.preventDefault();
				return false;
			};
		};
	}.bind(this));
	div.addEventListener('drop', function  (evt) {
		for (var t in types) {
			// $$.log('Drop', t, hasType(evt, t));
			if (hasType(evt, t)) {
				var value = evt.dataTransfer.getData(t);
				if (t.substr(0, 7) == 'custom/') {
					value = JSON.parse(value);
				};
				if (types[t](value, t) == false) {
					evt.stopPropagation();
				};
			};
		};
	})
};

App.prototype.enableDrag = function(div, types) {
	div.draggable = true;
	div.addEventListener('dragstart', function (evt) {
		for (var id in types) {
			var value = types[id];
			if (id.substr(0, 7) == 'custom/') {
				value = JSON.stringify(value);
			};
			// $$.log('Set drag type:', id, value, id.substr(0, 7));
			evt.dataTransfer.setData(id, value);
		}
		evt.stopPropagation();
	});
};

App.prototype.selectItem = function(item) {
	this.events.emit('select', {
		item: item
	});
};

App.prototype.createNewItem = function(parent, tags) {
	var title = window.prompt('Enter title:');
	if (!title) {
		return;
	};
	var item = {
		title: title,
		created: new Date().getTime(),
		updated: new Date().getTime(),
	};
	if (tags) {
		item.tags = tags;
	};
	if (parent) {
		item.parent = parent.id;
		item.conn = parent.conn;
	} else {
		// Root item
		item.parent = 'null';
		item.conn = this.dbs[0].conn.code;
	};
	this.db(item).add(item, function (err) {
		if (err) {
			return this.showError(err);
		};
		this.events.emit('add', {
			item: item
		});
		this.selectItem(parent);
	}.bind(this));
};

App.prototype.list = function(config, handler) {
	// Searches documents
	var result = [];
	iterateOver(this.dbs, function (db, cb) {
		var store = db.startQuery();
		var req = null;
		if (config.id) {
			req = store.get(config.id);
		};
		if (config.all) {
			req = store.openCursor();
		};
		if (config.tag) {
			req = store.index('tags').openCursor(config.tag);
		};
		if (config.parent) {
			req = store.index('parent').openCursor(config.parent);
		};
		if (config.starred) {
			req = store.index('starred').openCursor(IDBKeyRange.lowerBound(config.starred, false));
		};
		if (!req) {
			$$.log('Aborted list: no condition', config);
			return cb('List failed');
		};
		db.list(req, function (err, list) {
			if (err) {
				return cb(err);
			};
			for (var i = 0; i < list.length; i++) {
				result.push(list[i]);
			};
			cb(null);
		}.bind(this));
	}.bind(this), function (err) {
		handler(err, result);
	}.bind(this))
};

App.prototype.reparent = function(item, child, handler) {
	// Changes parent of child to item
	$$.log('reparent start:', item, child);
	var doReparent = function () {
		var oldp = child.parent;
		if (!item) {
			child.parent = 'null';
		} else {
			child.parent = item.id;
		};
		this.updateItem(child, function () {
		}.bind(this), {
			toparent: child.parent,
			fromparent: oldp
		});
	}.bind(this);
	if (!item) {
		doReparent();
	} else {
		this.itemParents(item, function (err, parents) {
			$$.log('reparent', item, child, parents, err);
			if (err) {
				return handler(err);
			};
			for (var i = 0; i < parents.length; i++) {
				if (child.id == parents[i].id) {
					// Child is one of the parents
					return handler('Broken tree');
				};
			};
			doReparent();
		})
	};
};

App.prototype.removeItems = function(parent, array) {
	for (var i = 0; i < array.length; i++) {
		var item = array[i];
		if (item.handler('locked')) {
			return false;
		};
	};
	for (var i = 0; i < array.length; i++) {
		var item = array[i];
		item.handler('remove');
	};
	this.text(parent);
	return true;
};

App.prototype.updateItem = function(item, handler, event) {
	this.db(item).update(item, function (err) {
		if (err) {
			this.showError(err);
		};
		if (!event) {
			event = {};
		};
		event.item = item;
		this.events.emit('update', event);
		handler(item);
	}.bind(this));
};

App.prototype.itemParents = function(item, handler) {
	var result = [];
	if (!item) {
		return handler(null, result);
	};
	result.push(item);
	var exec = function (item) {
		this.list({id: item.parent}, function (err, list) {
			$$.log('Parent for:', item, list);
			if (err) {
				return handler(err);
			};
			if (list.length == 0) {
				// Not found
				return handler(null, result);
			};
			result.push(list[0]);
			exec(list[0]);
		})
	}.bind(this);
	exec(item);
};

App.prototype.itemRecursive = function(item, cb, handler) {
	// $$.log('itemRecursive', item);
	// Recursively executes cb and finally handler
	var iterate = function (item, _handler) {
		this.list({parent: item.id}, function (err, list) {
			// $$.log('children', err, list, item);
			if (err) {
				return _handler(err);
			};
			iterateOver(list, function (item, _cb) {
				iterate(item, _cb);
			}, function (err) {
				// $$.log('iterate done', err, item);
				if (err) {
					return _handler(err);
				};
				// Do operation
				cb(item, this.db(item), function (err) {
					if (err) {
						return _handler(err);
					};
					_handler(null);
				});
			}.bind(this));
		}.bind(this));
	}.bind(this);
	iterate(item, function (err) {
		handler(err);
	});
};

App.prototype.renderLink = function(parent, id, config) {
	// Renders link to item
	var div = this.el('div', parent, {
		'class': 'item_link'
	}, '...');
	if (id.startsWith('#')) {
		// Tag rendering
		div.classList.add('item_link_tag');
		this.text(div, id.substr(1), true);
		this.enableDrag(div, {'custom/item': {id: id}, 'Text': id});
		return;
	};
	var enableClick = function (item) {
		div.classList.add('item_link_ok');
		this.text(div, item.title || '<Untitled>', true);
		div.addEventListener('click', function (evt) {
			this.selectItem(item);
			evt.stopPropagation();
			return false;
		}.bind(this));
		this.enableDrag(div, {'custom/item': item, 'Text': '[['+item.id+']]'});
	}.bind(this);
	this.list({id: id}, function (err, list) {
		if (err || list.length == 0) {
			this.showError(err || 'Not found');
			div.classList.add('item_link_err');
			this.text(div, 'Error!', true);
			return;
		};
		enableClick(list[0]);
	}.bind(this));

};

App.prototype.renderText = function(text, div, handler) {
	var parsers = [];
	parsers.push(function (text, div) {
		// Checkbox parser
		var reg = /(.*?)\[(X| )\] (.+?)($|(\[(X| )\]))/
		var m = text.match(reg);
		// $$.log('Checkbox:', text, m);
		if (!m) {
			return false;
		};
		this.renderText(m[1], div, handler);
		var checkbox = this.el('input', div, {
			'type': 'checkbox',
			'class': 'item_td_checkbox',
			'checked': m[2] == 'X'? 'checked': null
		});
		var right = text.substr(m[1].length+4);
		checkbox.addEventListener('click', function (evt) {
			var checked = checkbox.checked? true: false;
			var text = m[1] + (checked? '[X] ': '[ ] ')+right;
			// $$.log('Handler', text);
			handler({type: 'edit'}, text);
			evt.stopPropagation();
			return false;
		})
		this.renderText(right, div, handler);
		return true;
	}.bind(this));
	parsers.push(function (text, div) {
		// Link parser
		var reg = /(.*?)\[\[([#?a-z0-9]+)\]\](.*)/
		var m = text.match(reg);
		// $$.log('Checkbox:', text, m);
		if (!m) {
			return false;
		};
		this.renderText(m[1], div, handler);
		this.renderLink(div, m[2], {
		});
		this.renderText(m[3], div, handler);
		return true;
	}.bind(this));
	parsers.push(function (text, div) {
		// Link parser
		var reg = /^(!{1,3}) (.+)$/
		var m = text.match(reg);
		// $$.log('Checkbox:', text, m);
		if (!m) {
			return false;
		};
		var span = this.el('span', div, {
			'class': 'item_title_'+m[1].length
		});
		this.renderText(m[2], span, handler);
		return true;
	}.bind(this));
	var parsed = false;
	for (var i = 0; i < parsers.length; i++) {
		var p = parsers[i];
		if (p(text, div)) {
			parsed = true;
			break;
		}
	};
	if (!parsed) {
		// Just plain text
		var span = this.el('span', div, {
		}, text);
	};
};

App.prototype.renderGrid = function(config, div, handler) {
	var table = this.el('table', div, {
		'class': 'item_table'
	});
	var removeSelection = function () {
		var nl = table.querySelectorAll('.item_td_edit_selected');
		for (var i = 0; i < nl.length; i++) {
			nl[i].classList.remove('item_td_edit_selected');
		};
		var nl = table.querySelectorAll('.item_tr_editor');
		for (var i = 0; i < nl.length; i++) {
			nl[i].parentNode.removeChild(nl[i]);
		};
		inEdit = false;
	};
	var inEdit = false;
	var maxCells = 1;
	var renderCell = function (td, col, rowNum, colNum) {
		var wrapper = this.el('div', td, {
			'class': 'item_td_wrap'
		});
		this.renderText(col.text || '', wrapper, function (type, text) {
			handler(type, col, text);
		});
		var renderEditor = function (type) {
			removeSelection();
			var tr = td.parentNode;
			var etr = this.el('tr', null, {
				'class': 'item_tr_editor'
			});
			if (tr.nextSibling) {
				tr.parentNode.insertBefore(etr, tr.nextSibling);
			} else {
				// Last tr
				tr.parentNode.appendChild(etr);
			}
			var etd = this.el('td', etr, {
				colspan: maxCells,
				'class': 'item_td_editor'
			});
			var etext = this.el('input', etd, {
				'type': 'text',
				'class': 'item_edit_text item_td_text_edit',
				'value': type == 'edit'? col.text: '' 
			});
			etext.addEventListener('keydown', function (evt) {
				if (evt.keyCode == 13) {
					// Finished
					inEdit = false; // Edit is finished
					handler({type: type}, col, etext.value);
					return false;
				};
				if (evt.keyCode == 27) {
					// Cancel
					select();
					return false;
				};
			})
			etext.focus();
			inEdit = true;
		}.bind(this);
		var select = function () {
			removeSelection();
			td.classList.add('item_td_edit_selected');
		}.bind(this);
		var floatPanel = null;
		if (col.edit || col.remove || col.add) {
			// Editable
			td.classList.add('item_td_edit');
			floatPanel = this.el('div', wrapper, {
				'class': 'td_float_panel'
			});
			td.addEventListener('click', function (evt) {
				select();
				evt.stopPropagation();
			});
		};
		if (col.add) {
			// Can edit with simple one-line text box
			var addButton = this.el('button', floatPanel, {
				'class': 'item_button'
			}, 'Add');
			addButton.addEventListener('click', function (evt) {
				renderEditor('add');
				evt.stopPropagation();
			}.bind(this));
			this.enableDrop(td, {
				'custom/line': function (other) {
					$$.log('Dropped line:', other);
					handler({type: 'drop', id: other.id, line: other.line}, col);
					return false;
				}.bind(this)
			});
		};
		if (col.edit) {
			// Can edit with simple one-line text box
			var editButton = this.el('button', floatPanel, {
				'class': 'item_button'
			}, 'Edit');
			editButton.addEventListener('click', function (evt) {
				renderEditor('edit');
				evt.stopPropagation();
			}.bind(this));
			td.addEventListener('dblclick', function (evt) {
				window.getSelection().removeAllRanges();
				renderEditor('edit');
				evt.preventDefault();
				evt.stopPropagation();
			});
			this.enableDrop(td, {
				'custom/item': function (other) {
					$$.log('Dropped item on line:', other);
					handler({type: 'drop', id: other.id}, col);
					return false;
				}.bind(this)
			});
		};
		if (col.remove) {
			// Can edit with simple one-line text box
			var removeButton = this.el('button', floatPanel, {
				'class': 'item_button'
			}, 'Remove');
			removeButton.addEventListener('click', function (evt) {
				handler({type: 'remove'}, col);
				evt.stopPropagation();
			}.bind(this));
			this.enableDrag(td, {
				'custom/line': {id: config.id, line: col}, 
				'text/plain': col.text || ''
			});
		};
	}.bind(this);
	for (var i = 0; i < config.rows.length; i++) {
		var row = config.rows[i];
		var tr = this.el('tr', table, {
			'class': 'item_tr'
		});
		var cells = 0;
		for (var j = 0; j < row.cols.length; j++) {
			var col = row.cols[j];
			var cl = 'item_td';
			if (col.align == 'r') {
				cl += ' align_r';
			};
			if (col.align == 'c') {
				cl += ' align_c';
			};
			var td = this.el('td', tr, {
				'class': cl
			});
			if (col.span>1) {
				td.colspan = col.span;
				cells += col.span;
			} else {
				cells++;
			}
			renderCell(td, col, i, j);
		};
		if (cells>maxCells) {
			maxCells = cells;
		};
	};
	return function (message) {
		if (message == 'locked') {
			return inEdit;
		};
	}.bind(this);
};

App.prototype.saveBlocks = function(blocks, handler) {
	var result = '';
	var index = 0;
	iterateOver(blocks, function (block, cb) {
		// Save block
		if (block.type == 'block') {
			if (index>0) {
				result += '\n';
			};
			result += '#begin';
			if (block.params && block.params.length>0) {
				result += ' ';
				result += block.params.join(' ');
			};
			index++;
		};
		for (var j = 0; j < block.lines.length; j++) {
			var line = block.lines[j]
			if (index>0) {
				result += '\n';
			};
			result += line;
			index++;
		};
		if (block.type == 'block') {
			result += '\n#end';
			index++;
		};
		cb(null);
	}.bind(this), function () {
		handler(result);
	});
};

App.prototype.parseLines = function(text, handler) {
	// Parses lines into array of parts (text blocks or #begin #end blocks)
	var block = null;
	var blocks = [];
	var lines = (text || '').split('\n');
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		if (line.startsWith('#begin') && (!block || block.type != 'block')) {
			// New block
			if (block) {
				blocks.push(block);
			};
			var params = line.split(' ');
			params.shift();
			block = {
				type: 'block',
				params: params,
				lines: []
			};
			continue;
		};
		if (line.trim() == '#end' && (block && block.type == 'block')) {
			// End of block
			blocks.push(block);
			block = null;
			continue;
		};
		// Just line
		if (!block) {
			block = {
				type: 'text',
				lines: []
			};
		};
		block.lines.push(line);
	};
	if (block) {
		blocks.push(block);
	};
	return handler(blocks);
};

App.prototype.gridHandler = function(blocks, grid, div, handler) {
	// Manages grid modifications
	return this.renderGrid(grid, div, function (data, col, text) {
		// Update
		var block = blocks[col.b];
		if (data.type == 'add') {
			block.lines.splice(col.l+1, 0, text);
		};
		if (data.type == 'remove') {
			block.lines.splice(col.l, 1);
		};
		if (data.type == 'edit') {
			block.lines[col.l] = text;
		};
		if (data.type == 'drop') {
			if (data.line) {
				// Dropped line
				if (!block.lines[col.l]) {
					// Empty line - replace
					block.lines[col.l] = data.line.text || '';
				} else {
					block.lines.splice(col.l+1, 0, data.line.text || '');
				}
				if (data.id == grid.id) {
					// Same item - remove line
					var index = data.line.l;
					if (data.line.b == col.b && data.line.l>col.l) {
						// Same block and line on bottom - be careful
						index++;
					};
					blocks[data.line.b].lines.splice(index, 1);
				};
			} else {
				// Dropped item
				block.lines[col.l] += '[['+data.id+']]';
			}
		};
		handler(blocks, data);
	}.bind(this));
};

App.prototype.renderItem = function(item, parent, config) {
	var div = this.el('div', parent, {
		'class': 'card'
	});
	var wrapper = this.el('div', div, {
		'class': 'card_show'
	});
	var titleDiv = this.el('div', wrapper, {
		'class': 'card_title'
	});
	this.enableDrag(titleDiv, {'custom/item': item, 'Text': '[['+item.id+']]'});
	this.enableDrop(titleDiv, {
		'custom/item': function (other) {
			$$.log('Dropped:', other);
			this.reparent(item, other, function (err) {
				if (err) {
					this.showError(err);
				};
			}.bind(this));
			return false
		}.bind(this)
	});
	var starAnchor = this.el('a', titleDiv, {
		'href': '#'
	});
	starAnchor.addEventListener('click', function (evt) {
		if (item.starred) {
			delete item.starred;
		} else {
			item.starred = 1;
		}
		item.updated = new Date().getTime();
		this.updateItem(item, function () {
			renderStar();
		});
		evt.stopPropagation();
		evt.preventDefault();
		return false;
	}.bind(this));
	var renderStar = function () {
		if (item.starred) {
			starAnchor.className = 'star starOn';
			this.text(starAnchor, '★');
		} else {
			starAnchor.className = 'star starOff';
			this.text(starAnchor, '☆');
		}
	}.bind(this);
	renderStar();
	var titleTextDiv = this.el('span', titleDiv, {
		'class': 'card_title_text'
	});
	var bodyDiv = this.el('div', wrapper, {
		'class': 'card_body'
	});
	if (item.id == config.selected) {
		// Render selected item
		var floatPanel = this.el('div', wrapper, {
			'class': 'card_float_panel'
		});
		if (config.edit) {
			var editButton = this.el('button', floatPanel, {
				'class': 'item_button'
			}, 'Edit');
			editButton.addEventListener('click', function (evt) {
				if (!isInEdit()) {
					edit();
				};
			}.bind(this));
			var addButton = this.el('button', floatPanel, {
				'class': 'item_button'
			}, 'Add');
			addButton.addEventListener('click', function (evt) {
				this.createNewItem(item);
			}.bind(this));
		};
		if (config.pin) {
			// Remove from free panel
			var button = this.el('button', floatPanel, {
				'class': 'item_button'
			}, 'Pin');
			button.addEventListener('click', function (evt) {
				this.events.emit('pin', {
					item: item
				});
			}.bind(this));
		};
		if (config.unpin) {
			// Remove from free panel
			var button = this.el('button', floatPanel, {
				'class': 'item_button'
			}, 'Unpin');
			button.addEventListener('click', function (evt) {
				this.events.emit('unpin', {
					item: item
				});
			}.bind(this));
		};
		if (config.scroll) {
			// Scroll to element
			this.scrollToEl(div);
		};
	};
	var bodyContentsDiv = this.el('div', bodyDiv, {
		'class': 'card_body_contents'
	});
	var bottomDiv = this.el('div', wrapper, {
		'class': 'card_bottom'
	});
	this.enableDrop(bottomDiv, {
		'custom/item': function (other) {
			// Dropped tag
			var tags = item.tags || [];
			if (tags.indexOf(other.id) == -1 && !isInEdit()) {
				tags.push(other.id);
				item.updated = new Date().getTime();
				item.tags = tags;
				this.updateItem(item, function () {
					render();
				}.bind(this));
			};
			return false;
		}.bind(this)
	});
	var tagsDiv = this.el('div', bottomDiv, {
		'class': 'card_tags'
	});
	var inEdit = false;
	var editHandlers = [];
	var isInEdit = function () {
		// Returns true if item is locked
		if (inEdit) {
			return true;
		};
		for (var i = 0; i < editHandlers.length; i++) {
			var handler = editHandlers[i];
			if (handler('locked')) {
				return true;
			};
		};
		return false;
	}.bind(this);
	var render = function () {
		editHandlers = [];
		var blocksToText = function (blocks) {
			var grid = {
				id: item.id,
				rows: []
			};
			for (var i = 0; i < blocks.length; i++) {
				var block = blocks[i];
				if (block.type == 'text') {
					for (var j = 0; j < block.lines.length; j++) {
						var line = block.lines[j];
						grid.rows.push({
							cols: [{
								text: line,
								add: true,
								edit: true,
								remove: true,
								b: i,
								l: j
							}]
						});
					};
				};
			};
			return grid;
		};
		this.text(titleTextDiv, item.title || '<No title>', true);
		this.text(bodyContentsDiv);
		var tags = item.tags || [];
		this.text(tagsDiv);
		for (var i = 0; i < tags.length; i++) {
			var tag = tags[i];
			this.renderLink(tagsDiv, tag, {
			});
		};
		this.parseLines(item.body, function (blocks) {
			// By default, render grid with one row per line
			var grid = blocksToText(blocks);
			var editHandler = this.gridHandler(blocks, grid, bodyContentsDiv, function () {
				// Rendered
				this.saveBlocks(blocks, function (text) {
					if (isInEdit()) {
						return;
					};
					item.updated = new Date().getTime();
					item.body = text;
					this.updateItem(item, function () {
						render();
					}.bind(this));
				}.bind(this));
			}.bind(this));
			editHandlers.push(editHandler);
		}.bind(this));
		renderStar();
	}.bind(this);
	render();
	var edit = function () {
		inEdit = true;
		wrapper.style.display = 'none';
		var ewrapper = this.el('div', div, {
			'class': 'card_edit'
		});
		var ebuttons = this.el('div', ewrapper, {
			'class': 'card_edit_buttons'
		});
		var etitle = this.el('input', ewrapper, {
			'type': 'text',
			'class': 'item_edit_text card_title_text',
			'value': item.title || '' 
		});
		var ebody = this.el('textarea', ewrapper, {
			'class': 'item_edit_area'
		});
        ebody.focus();
		ebody.value = item.body || '';
		var etags = this.el('input', ewrapper, {
			'type': 'text',
			'class': 'item_edit_text',
			'value': item.tags? item.tags.join(' '): ''
		});
		var save = this.el('button', ebuttons, {
			'class': 'item_button'
		}, 'Save');
		save.addEventListener('click', function (evt) {
			onSave();
		});
		var remove = this.el('button', ebuttons, {
			'class': 'item_button'
		}, 'Remove');
		remove.addEventListener('click', function (evt) {
			onRemove();
		});
		var cancel = this.el('button', ebuttons, {
			'class': 'item_button'
		}, 'Cancel');
		var onKeyPress = function (evt) {
			if (evt.ctrlKey && evt.keyCode == 13) {
				// Save
				onSave();
				return false;
			};
			if (evt.keyCode == 27) {
				// Esc
				onFinishEdit();
				return false;
			};
		}.bind(this);
		etitle.addEventListener('keydown', onKeyPress);
		etags.addEventListener('keydown', onKeyPress);
		ebody.addEventListener('keydown', onKeyPress);
		var onFinishEdit = function () {
			inEdit = false;
			div.removeChild(ewrapper);
			wrapper.style.display = 'block';
		}.bind(this);
		var onRemove = function () {
			if (window.confirm('Are you sure want to remove item and it\'s children?')) {
				this.itemRecursive(item, function (item, db, cb) {
					// Remove
					db.remove(item, function (err) {
						if (err) {
							return cb(err);
						};
						this.events.emit('remove', {
							item: item
						});
						cb(null);
					}.bind(this));
				}.bind(this), function (err) {
					if (err) {
						this.showError(err);
					};
					this.selectItem(this.selected);
				}.bind(this))
			};
		}.bind(this);
		var onSave = function () {
			item.title = etitle.value.trim();
			item.body = ebody.value;
			var tags = etags.value.trim();
			if (tags) {
				item.tags = tags.split(' ');
			} else {
				delete item.tags;
			}
			item.updated = new Date().getTime();
			this.updateItem(item, function () {
				render();
				onFinishEdit();
			});
		}.bind(this);
		cancel.addEventListener('click', function (evt) {
			onFinishEdit();
		}.bind(this));
	}.bind(this);
	bodyDiv.addEventListener('dblclick', function (evt) {
		window.getSelection().removeAllRanges();
		if (!inEdit) {
			edit();
		};
		evt.preventDefault();
		evt.stopPropagation();
		return false;
	});
	titleDiv.addEventListener('click', function (evt) {
		this.selectItem(item);
		evt.preventDefault();
		evt.stopPropagation();
		return false;
	}.bind(this));
	div.addEventListener('click', function (evt) {
		evt.stopPropagation();
		return false;
	}.bind(this));
	var onUpdate = function (evt) {
		if (evt.item && evt.item.id == item.id) {
			item = evt.item;
			if (!isInEdit()) {
				render();
			};
		};
	}.bind(this);
	this.events.on('update', onUpdate);
	return function (type) {
		if ('div' == type) {
			return div;
		};
		if ('remove' == type) {
			// Unsubscribe
			this.events.off('update', onUpdate);
		};
		if ('locked' == type) {
			return isInEdit();
		};
	}.bind(this);
};

App.prototype.refreshPane = function(parent, array, data, config) {
	var conf = config || {};
	if (!this.removeItems(parent, array)) {
		// Locked
		return false;
	}
	array.splice(0, array.length);
	for (var i = 0; i < data.length; i++) {
		var item = data[i];
		array.push({item: item, handler: this.renderItem(item, parent, conf)});
	};
	this.el('div', parent, {
		'class': 'clear'
	});
};

App.prototype.findEl = function(query, where) {
	return (where || document.body).querySelectorAll(query).item(0);
};

App.prototype.pxInEm = function(el) {
	return Number(getComputedStyle(el, "").fontSize.match(/(\d*(\.\d*)?)px/)[1]);
};

App.prototype.text = function(el, text, softspace) {
	var nl = el.childNodes;
	while(nl.length>0) {
		el.removeChild(nl.item(0));
	}
	if (text) {
		var data = text;
		if (softspace) {
			// Add soft break
			data = '';
			for (var i = 0; i < text.length; i++) {
				data += text[i]+String.fromCharCode(0x200B);
			};
		};
		el.appendChild(document.createTextNode(data));
	};
};

App.prototype.el = function(name, parent, attr, text) {
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
}

App.prototype.scrollToEl = function (el, parent) {
    if (!el) {
        return;
    };
    var p = parent || window;
    var sto = el.offsetTop-10;
    setTimeout(function () {
    	p.scrollTo(p.scrollX, sto);
    }.bind(this), 10);
};

App.prototype.isAppDev = function(item) {
	return false;
};

App.prototype.loadApplications = function() {
    var head = document.getElementsByTagName('head')[0];
	this.apps = {};
	this.appDev = true;
	var getBlockText = function (block) {
		var result = '\n';
		for (var i = 0; i < block.lines.length; i++) {
			var l = block.lines[i];
			result += l+'\n';
		};
		return result;
	}
	var loadApp = function (item) {
		// Loading application
		this.parseLines(item.body, function (blocks) {
			$$.log('Load app:', item, blocks);
			for (var i = 0; i < blocks.length; i++) {
				var block = blocks[i];
				if (block.type == 'block' && block.params[0] == 'js') {
					var el = document.createElement('script');
					el.setAttribute('type', 'text/javascript');
					if (this.isAppDev(item) && block.params[1]) {
						// Use src
						el.setAttribute('src', 'apps/'+item.title.toLowerCase()+'/'+block.params[1]);
					} else { // Default
						el.appendChild(document.createTextNode('(function($$, appID) {'+getBlockText(block)+'}).call(this, $$, "'+item.id+'");'));
					}
					head.appendChild(el);
				};
				if (block.type == 'block' && block.params[0] == 'css') {
            		var el;
					if (this.isAppDev(item) && block.params[1]) {
						// Use src
						el = document.createElement('link');
						el.setAttribute('rel', 'stylesheet');
						el.setAttribute('href', 'apps/'+item.title.toLowerCase()+'/'+block.params[1]);
					} else { // Default
						el = document.createElement('style');
						el.setAttribute('type', 'text/css');
						el.appendChild(document.createTextNode(getBlockText(block)));
					}
					head.appendChild(el);
				};
			};
		}.bind(this));
	}.bind(this);
	// Loads applications by tag
	this.list({tag: '#app'}, function (err, list) {
		if (err) {
			return this.showError(err);
		};
		for (var i = 0; i < list.length; i++) {
			loadApp(list[i]);
		};
	}.bind(this));
};