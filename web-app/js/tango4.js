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
	}.bind(this), 0);
	this.initConnection(function () {
		this.initUI();
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
            return this.showError(err);
        }
        var id = this.manager.defaultConnection();
        $$.log('ID:', id);
        if(!id) {
            this.showError('Container not defined');
            return;
        }
        this.manager.initConnection(id, function (err, conn) {
            if (err) {
                this.showError(err);
                return;
            };
            $$.log('Connection is done', err, id, conn);
            this.initDB(conn, function (err, db) {
            	handler();
            }.bind(this));
        }.bind(this));
    }.bind(this));	
};

App.prototype.initDB = function(conn, handler) {
    var db = new DocumentsManager(conn, function (err) {
        if (err) {
            this.showError(err);
            return;
        };
        $$.log('Ready to show UI');
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

App.prototype.refreshSyncControls = function() {
	var div = this.findEl('#sync_buttons');
	this.text(div);
	var buttonForSync = function (db) {
		var button = this.el('button', div, {
			'class': 'item_button'
		}, db.conn.code);
		button.addEventListener('click', function (evt) {
			button.disabled = true;
			this.text(button, 'Sync...');
			db.sync(this.manager, function (err) {
				button.disabled = false;
				this.text(button, db.conn.code);
				if (err) {
					this.showError(err);
				};
			}.bind(this));
		}.bind(this));
	}.bind(this);
	for (var i = 0; i < this.dbs.length; i++) {
		var db = this.dbs[i];
		buttonForSync(db);
	};
};

App.prototype.showError = function(message) {
	$$.log('Reported error:', message);
	alert('Error: '+message);
};

var FreePanel = function (app, div) {
	this.app = app;
	this.div = div;
	this.items = [];
	this.renders = [];
	this.div.addEventListener('click', function (evt) {
		// Reset selection
		app.selectItem(null);
	}.bind(this));
	app.enableDrop(div, {
		'custom/item': function (other) {
			$$.log('Dropped on free panel:', other);
			if (this.addItem(other)) {
				this.app.refreshPane(this.div, this.renders, this.items);
			};
			return false;
		}.bind(this)
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
					this.showError(err);
				};
			}.bind(this));
			return false;
		}
	});
	app.events.on('select', function (evt) {
		this.selectItem(evt.item);
	}.bind(this));
	app.events.on('update', function (evt) {
		if (true) {
			if ((!this.selected && !evt.item) || (this.selected && evt.item && evt.item.id == this.selected.id)) {
				// Current item updated
				this.selectItem(evt.item);
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
			selected: item? item.id: null
		});		
	}.bind(this));
};

App.prototype.initUI = function() {
	this.selected = null;
	this.freePanel = new FreePanel(this, this.findEl('#left_pane'));
	this.browser = new BrowserPanel(this, this.findEl('#right_pane'));
	this.browser.selectItem(null);
	this.refreshSyncControls();
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
			item: item,
			parent: parent
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
			req = store.index('tags').get(config.tag);
		};
		if (config.parent) {
			req = store.index('parent').openCursor(config.parent);
		};
		if (config.starred) {
			req = store.index('starred').openCursor(config.starred);
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
		if (!item) {
			child.parent = 'null';
		} else {
			child.parent = item.id;
		};
		this.updateItem(child, function () {
			this.events.emit('update', {
				item: item
			});
		}.bind(this));
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
		item.handler('remove');
		var div = item.handler('div');
		if (div) {
			parent.removeChild(div);
		};
	};
};

App.prototype.updateItem = function(item, handler) {
	this.db(item).update(item, function (err) {
		if (err) {
			this.showError(err);
		};
		this.events.emit('update', {
			item: item
		});
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

App.prototype.renderText = function(text, div, handler) {
	var span = this.el('span', div, {
	}, text);
	handler();
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
	};
	var maxCells = 1;
	var renderCell = function (td, col, rowNum, colNum) {
		this.renderText(col.text || '', td, function () {
			// No action
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
					handler(type, col, etext.value);
					return false;
				};
				if (evt.keyCode == 27) {
					// Cancel
					select();
					return false;
				};
			})
			etext.focus();
		}.bind(this);
		var select = function () {
			removeSelection();
			td.classList.add('item_td_edit_selected');
		}.bind(this);
		var floatPanel = null;
		if (col.edit || col.remove || col.add) {
			// Editable
			td.classList.add('item_td_edit');
			floatPanel = this.el('div', td, {
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
		};
		if (col.remove) {
			// Can edit with simple one-line text box
			var removeButton = this.el('button', floatPanel, {
				'class': 'item_button'
			}, 'Remove');
			removeButton.addEventListener('click', function (evt) {
				handler('remove', col);
				evt.stopPropagation();
			}.bind(this));
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
	return this.renderGrid(grid, div, function (type, col, text) {
		// Update
		var block = blocks[col.b];
		if (type == 'add') {
			block.lines.splice(col.l+1, 0, text);
		};
		if (type == 'remove') {
			block.lines.splice(col.l, 1);
		};
		if (type == 'edit') {
			block.lines[col.l] = text;
		};
		handler(blocks, type);
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
	var titleTextDiv = this.el('div', titleDiv, {
		'class': 'card_title_text'
	});
	var bodyDiv = this.el('div', wrapper, {
		'class': 'card_body'
	});
	if (item.id == config.selected) {
		// Render selected item
		var floatPanel = this.el('div', bodyDiv, {
			'class': 'card_float_panel'
		});
		var editButton = this.el('button', floatPanel, {
			'class': 'item_button'
		}, 'Edit');
		editButton.addEventListener('click', function (evt) {
			if (!inEdit) {
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
	var bodyContentsDiv = this.el('div', bodyDiv, {
		'class': 'card_body_contents'
	});
	var bottomDiv = this.el('div', wrapper, {
		'class': 'card_bottom'
	});
	var inEdit = false;
	var render = function () {
		var blocksToText = function (blocks) {
			var grid = {
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
		this.text(titleTextDiv, item.title || '<No title>');
		this.text(bodyContentsDiv);
		this.parseLines(item.body, function (blocks) {
			// By default, render grid with one row per line
			var grid = blocksToText(blocks);
			this.gridHandler(blocks, grid, bodyContentsDiv, function () {
				// Rendered
				this.saveBlocks(blocks, function (text) {
					item.updated = new Date().getTime();
					item.body = text;
					this.updateItem(item, function () {
						render();
					}.bind(this));
				}.bind(this));
			}.bind(this));
		}.bind(this));
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
		if (!inEdit) {
			this.selectItem(item);
		};
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
			render();
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
	}.bind(this);
};

App.prototype.refreshPane = function(parent, array, data, config) {
	var conf = config || {};
	this.removeItems(parent, array);
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

App.prototype.text = function(el, text) {
	var nl = el.childNodes;
	while(nl.length>0) {
		el.removeChild(nl.item(0));
	}
	if (text) {
		el.appendChild(document.createTextNode(text));
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

