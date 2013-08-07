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
var dateFormat = function () {
	var token = /d{1,4}|m{1,4}|w{1,2}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
		timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+&#xdA;-Z]/g,
		pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
			return val;
		};

	// Regexes and supporting functions are cached through closure
	return function (date, mask, utc) {
		var dF = dateFormat;

		// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
		if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
			mask = date;
			date = undefined;
		}

		// Passing date through Date applies Date.parse, if necessary
		date = date ? new Date(date) : new Date;
		if (isNaN(date)) throw SyntaxError("invalid date");

		// Allow setting the utc argument via the mask
		if (mask.slice(0, 4) == "UTC:") {
			mask = mask.slice(4);
			utc = true;
		}

		var _ = utc ? "getUTC" : "get",
			d = date[_ + "Date"](),
			D = date[_ + "Day"](),
			// w = date[_ + "Week"](),
			m = date[_ + "Month"](),
			y = date[_ + "FullYear"](),
			H = date[_ + "Hours"](),
			M = date[_ + "Minutes"](),
			s = date[_ + "Seconds"](),
			L = date[_ + "Milliseconds"](),
			o = utc ? 0 : date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				// w:    w,
				// ww:   pad(w),
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

		return mask.replace(token, function ($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

// Internationalization strings
dateFormat.i18n = {
	dayNames: [
		"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
		"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	],
	monthNames: [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
	]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
	return dateFormat(this, mask, utc);
};

var FormController = function () {
	this.controls = {};
	this.originals = {};
}

FormController.prototype.add = function(name, element) {
	this.controls[name] = element;
};

FormController.prototype.set = function(name, value) {
	if (!this.controls[name]) {
		return false;
	};
	this.controls[name].value = value || '';
	this.originals[name] = value || '';
};

FormController.prototype.get = function(name) {
	if (!this.controls[name]) {
		return null;
	};
	return this.controls[name].value.trim();
};

FormController.prototype.changed = function() {
	for (var name in this.controls) {
		var value = this.get(name);
		if (value != this.originals[name]) {
			return true;
		};
	}
	return false;
};

var NotepadPanel = function (app) {
	this.app = app;
	this.div = app.findEl('#left_pane');
	var topButton = app.el('button', app.findEl('#top_controls'), {
		'class': 'item_button'
	});
	app.icon('books', topButton);
	this.visible = true;
	topButton.addEventListener('click', function (evt) {
		this.toggleVisible();
	}.bind(this));
	var button = app.el('button', app.findEl('#top_left_controls'), {
		'class': 'item_button'
	});
	app.icon('plus', button);
	button.addEventListener('click', function (evt) {
		app.createNewItem(null, null, 'notepad');
	}.bind(this));
	this.refresh(function (list) {
		if (list.length>0) {
			this.app.events.emit('select', {
				item: list[0]
			});
		};
	}.bind(this));
	app.events.on(['add', 'update', 'remove'], function (evt) {
		// $$.log('change', evt.type, evt.item);
		if (evt.item.parent == 'root') {
			this.refresh();
		};
	}.bind(this));
	app.events.on('next_notepad', function (evt) {
		if (this.notepads && this.notepads.length>0) {
			this.app.events.emit('select', {
				item: this.notepads[0]
			});
		};
	}.bind(this));
	app.events.on('select', function (evt) {
		// Item selected - update indicator
		if (evt.item.parent == 'root') {
			this.refreshIndicator(evt.item.id);
		} else { // Ordinary page selected
			this.refreshIndicator(evt.item.parent);
		};
	}.bind(this));
};

NotepadPanel.prototype.toggleVisible = function() {
	this.visible = !this.visible;
	if (this.visible) {
		// From hidden to visible
		document.body.classList.remove('left_hidden');
	} else {
		document.body.classList.add('left_hidden');
	}
	$$.log('Toggle', this.visible);
	this.app.events.emit('resize', {
	});
};

NotepadPanel.prototype.reparent = function(id, parent, handler) { // Reparents
	this.app.list({id: id}, function(err, data) { // Item found
		if (err || data.length == 0) { // Failed to found
			return handler(err || 'Not found');
		};
		var item = data[0];
		this.app.events.emit('remove', {
			item: item
		});
		item.parent = parent.id;
		this.app.updateItem(item, function(item) { // Updated
			return handler();
		});
	}.bind(this));
};

NotepadPanel.prototype.refresh = function(handler) {
	var contentDiv = this.app.findEl('#left_content', this.div);
	var selectedID = null;
	if (this.notepads && this.notepads[this.selectedIndex]) { // Have selected
		selectedID = this.notepads[this.selectedIndex].id;
	};
	this.app.list({parent: 'root', sort: 'title'}, function (err, list) {
		if (err) {
			return this.app.showError(err);
		};
		var renderItem = function (item, index) {
			var div = this.app.el('div', contentDiv, {
				'class': 'left_item card_title_text one_line text'
			});
			div.addEventListener('click', function (evt) {
				this.app.selectItem(item);
			}.bind(this));
			this.app.enableDrop(div, {
				'custom/item': function (other) {
					this.reparent(other.id, item, function(err) { // Updated
						if (err) { // Failed
							return this.app.showError(err);
						};
					}.bind(this));
					return false
				}.bind(this)
			});
			this.app.text(div, item.title);
		}.bind(this);
		this.app.text(contentDiv);
		for (var i = 0; i < list.length; i++) {
			var item = list[i];
			renderItem(item, i);
		};
		this.notepads = list;
		if (selectedID) { // Refresh indicator also
			this.refreshPageIndicator(selectedID);
		};
		if (handler) {
			handler(list);
		};
	}.bind(this));
};

NotepadPanel.prototype.refreshIndicator = function(id) { // Moves indicator
	if (!this.notepads) { // Not loaded yet
		return false;
	};
	if (this.pageIndicator) { // Was created before - remove
		this.pageIndicator.parentNode.removeChild(this.pageIndicator);
		this.pageIndicator = null;
	};
	this.selectedIndex = -1;
	var index = -1;
	for (var i = 0; i < this.notepads.length; i++) { // Search notepad by ID
		if (this.notepads[i].id == id) { // Found
			index = i;
			break;
		};
	};
	this.selectedIndex = index;
	if (-1 == index) { // Not found
		return false;
	};
	var contentDiv = this.app.findEl('#left_content', this.div);
	var div = contentDiv.childNodes[index];
	this.pageIndicator = this.app.el('div', div, {
		'class': 'notepad_indicator'
	});
	this.app.scrollToEl(div, contentDiv);
};

NotepadPanel.prototype.raiseNotepad = function(direction) {
	if (!this.notepads) {
		return;
	};
	var idx = this.selectedIndex;
	switch(direction) {
		case -1: // Back page
			if (idx <= 0) {
				return;
			};
			idx--;
			break;
		case 1: // Next page
			if (idx>=this.notepads.length-1) {
				return;
			};
			idx++;
			break;
		case -2: // Top page
			idx = 0;
			break;
		case 2: // Last page
			idx = this.notepads.length-1;
			break;
	}
	this.app.events.emit('select', {
		item: this.notepads[idx]
	});
};

var NotepadController = function (app, parent) {
	this.app = app;
	this.parent = parent;
	this.visible = [];
	this.selectedIndex = -1;
	this.pagesVisible = false;
	this.buildUI();
	this.events = new EventEmitter(this);
	app.events.on('resize', function (evt) {
		this.resize();
	}.bind(this));
	app.events.on(['add', 'update'], function (evt) {
		if (this.root && evt.item.parent == this.root.id) {
			// Refresh list
			this.refreshList(function () {
				this.refreshPageIndicator();
			}.bind(this));
		};
	}.bind(this));
	app.events.on('remove', function (evt) {
		if (!this.root) {
			return;
		};
		if (evt.item.parent == this.root.id) {
			// page from our notepad - refresh list
			this.refreshList(function () {
				this.refreshPageIndicator();
			}.bind(this));
		};
		if (evt.item.id == this.root.id) {
			// removed notepad - nothing to display
			this.app.events.emit('next_notepad', {
				item: this.root
			});
		};
	}.bind(this));
	this.events.on('remove', function (evt) {
		// When have to select another page
		this.refreshList(function (err, list) {
			if (err) {
				return;
			};
			var index = evt.index;
			if (index>=list.length) {
				index = list.length-1;
			};
			this.showPage(index, true);
		}.bind(this));
	}.bind(this));
};

NotepadController.prototype.buildUI = function(first_argument) {
	this.div = this.app.el('div', this.parent, {
		'class': 'controller_root controller_hidden text'
	});
	var topButtons = this.app.el('div', this.div, {
		'class': 'controller_panel one_line'
	});
	var button = this.app.el('button', topButtons, {
		'class': 'item_button card_no_edit'
	});
	this.app.icon('edit', button);
	button.addEventListener('click', function (evt) {
		this.editItem();
	}.bind(this));
	button = this.app.el('button', topButtons, {
		'class': 'item_button card_in_edit'
	});
	this.app.icon('checkmark1', button);
	button.addEventListener('click', function (evt) {
		this.sendMessage('save');
	}.bind(this));
	button = this.app.el('button', topButtons, {
		'class': 'item_button card_in_edit'
	});
	this.app.icon('close', button);
	button.addEventListener('click', function (evt) {
		this.sendMessage('cancel');
	}.bind(this));
	button = this.app.el('button', topButtons, {
		'class': 'item_button'
	});
	this.app.icon('plus', button);
	button.addEventListener('click', function (evt) {
		this.createNewItem();
	}.bind(this));
	button = this.app.el('button', topButtons, {
		'class': 'item_button'
	});
	this.app.icon('trash1', button);
	button.addEventListener('click', function (evt) {
		this.removeItem();
	}.bind(this));
	var wrapper = this.app.el('div', this.div, {
		'class': 'card'
	});
	this.cardDiv = wrapper;
	var titleDiv = this.app.el('div', wrapper, {
		'class': 'card_title one_line'
	});
	this.app.el('div', titleDiv, {
		'class': 'card_title_text card_no_edit'
	});
	this.app.el('input', titleDiv, {
		'class': 'card_editor card_title_text editor_title card_in_edit text',
		'type': 'text'
	});
	this.contentDiv = this.app.el('div', wrapper, {
		'class': 'controller_content scroll'
	});
	this.app.el('div', this.contentDiv, {
		'class': 'card_body_contents card_no_edit'
	});
	this.app.el('textarea', this.contentDiv, {
		'class': 'card_editor card_editor_area editor_body card_in_edit text'
	});
	var indicatorDiv = this.app.el('div', wrapper, {
		'class': 'card_page_indicator'
	});
	this.indicatorDiv = this.app.el('div', indicatorDiv, {
		'class': 'card_page_indicator_inner'
	});
	var tagsDiv = this.app.el('div', wrapper, {
		'class': 'one_line card_bottom'
	});
	this.pagesDiv = this.app.el('div', wrapper, {
		'class': 'controller_pages scroll'
	});
	this.app.el('span', tagsDiv, {
		'class': 'card_tags card_no_edit'
	});
	this.app.el('input', tagsDiv, {
		'class': 'card_editor editor_tags card_in_edit text',
		'type': 'text'
	});
	var bottomButtons = this.app.el('div', this.div, {
		'class': 'one_line controller_panel'
	});
	button = this.app.el('button', bottomButtons, {
		'class': 'item_button'
	});
	this.app.icon('document', button);
	button.addEventListener('click', function (evt) {
		this.togglePages();
	}.bind(this));
	button = this.app.el('button', bottomButtons, {
		'class': 'item_button'
	});
	this.app.icon('arrowleft', button);
	button.addEventListener('click', function (evt) {
		this.raisePage(-1);
	}.bind(this));
	button = this.app.el('button', bottomButtons, {
		'class': 'item_button'
	});
	this.app.icon('arrowright', button);
	button.addEventListener('click', function (evt) {
		this.raisePage(1);
	}.bind(this));
};

NotepadController.prototype.togglePages = function() {
	this.pagesVisible = !this.pagesVisible;
	if (this.pagesVisible) {
		this.pagesDiv.classList.add('controller_pages_visible');
		this.refreshPagesPane();
	} else {
		this.pagesDiv.classList.remove('controller_pages_visible');
	}
};

NotepadController.prototype.refreshPagesPane = function() {
	// Use pages
	this.app.text(this.pagesDiv);
	if (this.pages) {
		// Iterate over
		for (var i = 0; i < this.pages.length; i++) {
			var onItem = function (item, index, div) {
				div.addEventListener('click', function (evt) {
					this.showPage(index);
					this.togglePages();
				}.bind(this));
				this.app.enableDrag(div, {'custom/item': {id: item.id}, 'Text': item.id});
			}.bind(this);
			var item = this.pages[i];
			var div = this.app.el('div', this.pagesDiv, {
				'class': 'left_item card_title_text one_line'
			});
			this.app.text(div, item.title);
			onItem(item, i, div);
		};
	};
};

NotepadController.prototype.raisePage = function(direction) {
	if (!this.root) {
		return;
	};
	var idx = this.selectedIndex;
	switch(direction) {
		case -1: // Back page
			if (idx == 0) {
				return;
			};
			idx--;
			break;
		case 1: // Next page
			if (idx>=this.pages.length-1) {
				return;
			};
			idx++;
			break;
		case -2: // Top page
			idx = 0;
			break;
		case 2: // Last page
			idx = this.pages.length-1;
			break;
	}
	this.showPage(idx);
	this.refreshList(function () {
	});
};

NotepadController.prototype.editItem = function() {
	if (!this.root || this.sendMessage('locked') || this.visible.length == 0) {
		return;
	};
	this.visible[0]('edit');
};

NotepadController.prototype.sendMessage = function(message) {
	if (!this.root) {
		return;
	};
	for (var i = 0; i < this.visible.length; i++) {
		this.visible[i](message);
	};
};

NotepadController.prototype.keyHandler = function(e) { // Key handler
	this.visible[0]('key', e);
};

NotepadController.prototype.createNewItem = function() {
	if (!this.root) {
		return;
	};
	this.app.createNewItem(this.root);
};

NotepadController.prototype.removeItem = function() {
	if (!this.root) {
		return;
	};
	var type = 'page';
	if (this.selectedIndex == 0) {
		type = 'notepad and all it\'s pages';
	};
	var item = this.pages[this.selectedIndex];
	if (!window.confirm('Are you sure want to remove '+type+'?')) {
		return;
	};
	this.refreshList(function (err, list) {
		if (err) {
			return this.app.showError(err);
		};
		var target = [item];
		if (item.parent == 'root') {
			// Remove all
			target = list;
		};
		iterateOver(target, function (item, cb) {
			this.app.db(item).remove(item, function (err) {
				if (err) {
					return cb(err);
				};
				this.app.events.emit('remove', {
					item: item
				});
				cb(null);
			}.bind(this));
		}.bind(this), function (err) {
			if (err) {
				return this.app.showError(err);
			};
		}.bind(this));
	}.bind(this));
};

NotepadController.prototype.resize = function() {
	// Change zoom, if necessary
	if (!this.root) {
		return;
	};
	this.width = 20;
	this.height = 30;
	if (this.notepadConfig) { // Have config
		if (this.notepadConfig.width) { // Have width
			this.width = this.notepadConfig.width;
		};
		if (this.notepadConfig.height) { // Have height
			this.height = this.notepadConfig.height;
		};
	};
	var plusHeight = 9;
	var plusWidth = 1;
	var inEm = this.app.pxInEm(this.parent);
	var parentWidth = Math.floor(this.parent.offsetWidth / inEm);
	var parentHeight = Math.floor(this.parent.offsetHeight / inEm);
	if (this.width+plusWidth>parentWidth) {
		this.width = parentWidth-plusWidth;
	};
	if (this.height+plusHeight>parentHeight) {
		this.height = parentHeight-plusHeight;
	};
	this.cardDiv.style.width = ''+this.width+'em';
	this.contentDiv.style.height = ''+this.height+'em';
};

NotepadController.prototype.load = function(item) {
	// Called when it's time to load page
	// $$.log('Loading:', item);
	this.div.classList.remove('controller_hidden');
	if (this.sendMessage('locked')) {
		return false;
	};
	var root = {
		id: item.parent
	};
	if (root.id == 'root') {
		// I'm parent
		root.id = item.id;
	};
	this.app.list(root, function (err, data) {
		if (err || data.length == 0) {
			// Not found
			return this.app.showError('Not found');
		};
		this.root = data[0];
		this.app.events.emit('load', {
			root: this.root,
			controller: this
		});
		this.resize();
		// Set size of body
		this.refreshList(function (err, list) {
			if (err) {
				return this.app.showError(err);
			};
			var index = 0;
			if (item.parent == 'root') {
				// Auto-select
				if (list.length>1) {
					index = 1;
				};
			} else {
				// Locate item
				var idx = this.find(item.id);
				if (-1 != idx) {
					// Found
					index = idx;
				};
			};
			this.showPage(index);
		}.bind(this));
	}.bind(this))
};

NotepadController.prototype.showPage = function(index, force) {
	if (!this.root) {
		return;
	};
	if (this.sendMessage('locked') && !force) {
		$$.log('Ignoring show - inEdit');
		return;
	};
	// $$.log('Show page', index, this.pages.length);
	if (!this.pages || index<0 || index>=this.pages.length) {
		// Invalid
		$$.log('Ignoring invalid index/data', index, this.pages);
		return;
	};
	this.selectedIndex = index;
	for (var i = 0; i < this.visible.length; i++) {
		this.visible[i]('remove');
	};
	this.visible = [this.app.renderItem(this.pages[this.selectedIndex], this.div, {
		controller: this,
		index: index
	})];
	this.refreshPageIndicator();
};

NotepadController.prototype.refreshPageIndicator = function() {
	if (this.selectedIndex != -1 && this.pages && this.pages.length>this.selectedIndex) {
		this.indicatorDiv.style.top = ''+Math.round((this.selectedIndex/(this.pages.length-1))*100)+'%';
	};
};

NotepadController.prototype.find = function(id) {
	for (var i = 0; i < this.pages.length; i++) {
		if (this.pages[i].id == id) {
			// Found
			return i;
		};
	};
	return -1;
};

NotepadController.prototype.sort = function(list) { // Sort pages acc. to notepadConfig
	var sort = '+title';
	if (this.notepadConfig && this.notepadConfig.sort) { // Have custom sort
		sort = this.notepadConfig.sort; 
	};
	var dir = 1;
	if (sort.charAt(0) == '-') { // Reverse
		dir = -1;
		sort = sort.substr(1);
	};
	if (sort.charAt(0) == '+') { // Just ignore
		sort = sort.substr(1);
	};
	list.sort(function(a, b) { // Sort by title/created/updated
		var v1 = a.created;
		var v2 = b.created;
		if (sort == 'title') { // By title
			v1 = a.title;
			v2 = b.title;
		};
		if (sort == 'updated') { // By updated
			v1 = a.updated;
			v2 = b.updated;
		};
		if (v1>v2) {
			return dir;
		};
		if (v1<v2) {
			return -dir;
		};
		return 0;
	});
};

NotepadController.prototype.refreshList = function(handler) {
	// Refreshes list of all pages
	if (!this.root) {
		return;
	};
	this.app.list({id: this.root.id}, function (err, data) {
		if (err || data.length == 0) {
			// Not found
			return handler(err || 'Not found root');
		};
		var items = [data[0]];
		this.app.list({parent: this.root.id, sort: 'title'}, function (err, data) {
			if (err) {
				// Not found
				return handler();
			};
			this.sort(data);
			for (var i = 0; i < data.length; i++) { // Create pages
				var item = data[i];
				items.push(item);
			};
			this.pages = items;
			handler(null, items);
			if (this.pagesVisible) {
				this.refreshPagesPane();
			};
			// TODO: Refresh bookmarks
		}.bind(this));
	}.bind(this))

};

NotepadController.prototype.sendMessage = function(state) {
	for (var i = 0; i < this.visible.length; i++) {
		if (this.visible[i](state)) {
			return true;
		};
	};
	return false;
};

var App = function () {
	// $$.log('App started', this.pxInEm(document.body));
	this.titleCache = {};
	this.events = new EventEmitter(this);
	window.addEventListener('resize', function(e) {//Auto resize
		this.resize();
	}.bind(this));
	this.initConnection(function () {
		this.initUI(function () {
			this.resize();
		}.bind(this));
	}.bind(this));
	this.appCache = new AppCacheManager(function (err, newVersion) {
		// $$.log('App cache:', err, newVersion);
		if (err) {
			// return this.showError(err);
			return; // Offline?
		};
		if (newVersion) {
			// Show message about it
			this.showInfo('Reload page for new version', true);
		} else {
			this.showInfo('Latest version detected');
		}
	}.bind(this));
};

App.prototype.resize = function() {
	var inEm = this.pxInEm(document.body);
	var ems = Math.floor(document.body.offsetWidth / inEm);
	if (ems<50) {
		if (!this.narrow) {
			// First time
			this.narrow = true;
			document.body.classList.add('window_narrow');
			if (this.leftPanel.visible) {
				this.leftPanel.toggleVisible();
			};
		};
	} else {
		if (this.narrow) {
			// First time
			this.narrow = false;
			document.body.classList.remove('window_narrow');
			if (!this.leftPanel.visible) {
				this.leftPanel.toggleVisible();
			};
		};
	}
	this.events.emit('resize', {

	});
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
				documents.createIndex('type', 'type');
				return;
			case 3:
				var documents = t.objectStore('documents');
				documents.createIndex('parent', 'parent');
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
		var networkIndicator = this.renderIndicator(wrapper);
		networkIndicator(db.online? 'on': 'off');
		var pingIndicator = this.renderIndicator(wrapper);
		var dataIndicator = this.renderIndicator(wrapper);
		dataIndicator(db.changed? 'off': 'on');
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
		var button = this.el('button', wrapper, {
			'class': 'item_button item_button_text'
		});
		var buttonText = this.el('span', button, {
			'class': 'item_button_text_span'
		}, db.conn.code);
		var doSync = function () {
			button.disabled = true;
			this.text(buttonText, 'Sync...');
			db.sync(this.manager, function (err) {
				button.disabled = false;
				this.text(buttonText, db.conn.code);
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
			if (el.parentNode) {
				el.parentNode.removeChild(el);
			};
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

App.prototype.sendMessage = function(state) {
	var panel = this.panels[this.selectedPanel];
	if (panel && panel.sendMessage(state)) { // In requested state
		return true;
	};
	return false;
};

App.prototype.initUI = function(handler) {
	this.selected = null;
	this.panels = [];
	this.panels.push(new NotepadController(this, this.findEl('#right_pane')));
	this.selectedPanel = 0;
	this.narrow = false;
	this.refreshSyncControls();
	this.showInfo('Application loaded');
	this.leftPanel = new NotepadPanel(this);
	this.initLog();
	this.keyHandler();
	this.selectHandler();
	this.loadApplications();
	handler();
};

App.prototype.initLog = function() { // Overrides log function and prints log to log pane
	if (!this.manager.dev) { // Not in dev version
		return false; // No action necessary
	};
	var maxLines = 100;
	var logDiv = this.findEl('#log_pane');
	logDiv.addEventListener('click', function(evt) { // Click on log - hide pane
		toggleVisible();
		evt.stopPropagation();
	});
	var topButton = this.el('button', this.findEl('#top_controls'), {
		'class': 'item_button'
	});
	this.icon('put', topButton);
	this.logVisible = false;
	var toggleVisible = function() { // Shows/hides log pane
		this.logVisible = !this.logVisible;
		if (this.logVisible) { // Add class
			logDiv.classList.add('log_pane_visible');
		} else { // Remove class
			logDiv.classList.remove('log_pane_visible');
		};
	}.bind(this);
	topButton.addEventListener('click', function (evt) {
		toggleVisible();
	}.bind(this));
	var superLog = $$.log;
	var renderLog = function(args) { // Renders parameters
		var div = this.el('div', null, {
			'class': 'log_pane_line'
		});
		var renderItem = function(item) { // Renders one item
			var visible = false;
			var span = this.el('span', null, {
				'class': 'l'
			});
			var type = typeof(item);
			if (type == 'string') { // String
				span.classList.add('l_str');
				if (item.length>20) { // Clickable
					span.classList.add('l_click');
					var part = item.substr(0, 20)+"...";
					this.text(span, "'"+part+"'");
					span.addEventListener('click', function(evt) { // Toggle full string
						visible = !visible;
						this.text(span, "'"+(visible? item: part)+"'");
						evt.stopPropagation();
					}.bind(this));
					return span;
				};
				this.text(span, "'"+item+"'");
				return span;
			};
			if (type == 'number') { // String
				this.text(span, ""+item);
				span.classList.add('l_num');
				return span;
			};
			if (type == 'boolean') { // Boolean
				this.text(span, ""+item);
				span.classList.add('l_bool');
				return span;
			};
			if (type == 'undefined') { // Undefined
				this.text(span, 'undefined');
				span.classList.add('l_null');
				return span;
			};
			if (type == 'function') { // Function
				this.text(span, 'fun(...)');
				span.classList.add('l_fun');
				return span;
			};
			// From here - only objects
			if (item == null) { // Undefined
				this.text(span, 'null');
				span.classList.add('l_null');
				return span;
			};
			if (typeof(item.getMonth) === 'function') { // This is date
				this.text(span, item.format('yy-mm-dd HH:MM:ss'));
				span.classList.add('l_date');
				return span;
			};
			if (Array.isArray(item)) { // This is array
				this.el('span', span, {
					'class': 'l_arr_char'
				}, '[');
				this.el('span', span, {
					'class': 'l_dim'
				}, ''+item.length);
				span.classList.add('l_click');
				var wrapper = this.el('span', span, {
					'class': 'l_wrap',
				});
				for (var i = 0; i < item.length; i++) { // Render array item
					if (i>0) { // Add comma
						this.el('span', wrapper, {
							'class': 'l_arr_char'
						}, ',');
						this.el('span', wrapper, {}, ' ');
					};
					wrapper.appendChild(renderItem(item[i]));
				};
				span.addEventListener('click', function(evt) { // Toggle full string
					visible = !visible;
					wrapper.style.display = visible? 'inline': 'none';
					evt.stopPropagation();
				}.bind(this));
				this.el('span', span, {
					'class': 'l_arr_char'
				}, ']');
				return span;
			};
			// Plain object?
			this.el('span', span, {
				'class': 'l_obj_char'
			}, '{');
			span.classList.add('l_click');
			var dim = this.el('span', span, {
					'class': 'l_dim'
				});
			var wrapper = this.el('span', span, {
				'class': 'l_wrap',
			});
			span.addEventListener('click', function(evt) { // Toggle full string
				visible = !visible;
				wrapper.style.display = visible? 'inline': 'none';
				evt.stopPropagation();
			}.bind(this));
			var i = 0;
			for (var id in item) { // Render array item
				if (!item.hasOwnProperty(id)) { // Not own
					continue;
				};
				if (i>0) { // Add comma
					this.el('span', wrapper, {
						'class': 'l_obj_char'
					}, ',');
					this.el('span', wrapper, {}, ' ');
				};
				this.el('span', wrapper, {
					'class': 'l_obj_attr'
				}, id);
				this.el('span', wrapper, {
					'class': 'l_obj_char'
				}, ':');
				wrapper.appendChild(renderItem(item[id]));
				i++;
			};
			this.text(dim, ''+i);
			this.el('span', span, {
				'class': 'l_obj_char'
			}, '}');
			return span;
		}.bind(this);
		for (var i = 0; i < args.length; i++) { // Create one by one
			var item = args[0];
			// console.log('Log', 0, args[i], typeof(args[i]));
			div.appendChild(renderItem(args[i]));
			this.el('span', div, {}, ' ');
		};
		return div; // Ready to insert div element
	}.bind(this);
	$$.log = function() { // Override log
		var line = renderLog(arguments);
		var nl = logDiv.childNodes;
		while(nl && nl.length>=maxLines) {
			logDiv.removeChild(nl.item(0));
		}
		logDiv.appendChild(line);
		if (this.logVisible) { // If visible - scroll
			this.scrollToEl(line, logDiv);
		};
		return superLog.apply($$, arguments);
	}.bind(this);
};

App.prototype.selectHandler = function() {
	this.events.on('select', function (evt) {
		this.panels[0].load(evt.item);
		if (this.narrow && this.leftPanel.visible) {
			// Hide left panel
			this.leftPanel.toggleVisible();
		};
	}.bind(this));
};

App.prototype.keyHandler = function() {
	this.events.on('focus', function (evt) {
	}.bind(this));
	document.body.addEventListener('keydown', function (evt) {
		var stop = function () {
			evt.preventDefault();
			evt.stopPropagation();
			return false;
		}.bind(this);
		var panel = this.panels[this.selectedPanel];
		var code = evt.keyCode;
		var e = {
			code: code,
			ctrl: evt.ctrlKey || false,
			alt: evt.altKey || false,
			shift: evt.shiftKey || false
		};
		// $$.log('keyHandler', this.sendMessage('editing'), code);
		if (!this.sendMessage('editing')) {
			// Most key buttons work in browse mode
			if (code == 32) { // Space - edit
				panel.sendMessage('edit');
				return stop();
			};
			if (code == 33) { // PgUp - page -1
				if (e.shift) { // Notepad level
					this.leftPanel.raiseNotepad(-1);
				} else { // Page level
					panel.raisePage(-1);
				};
				return stop();
			};
			if (code == 34) { // PgDown - page +1
				if (e.shift) { // Notepad level
					this.leftPanel.raiseNotepad(1);
				} else { // Page level
					panel.raisePage(1);
				};
				return stop();
			};
			if (code == 36) { // Home - top page
				panel.raisePage(-2);
				return stop();
			};
			if (code == 35) { // End - last page
				panel.raisePage(2);
				return stop();
			};
			if (code == 37) e.key = 'left';
			if (code == 39) e.key = 'right';
			if (code == 38) e.key = 'up';
			if (code == 40) e.key = 'down';
			if (code == 13) e.key = 'enter';
			if (code == 45) e.key = 'insert';
			if (code == 46) e.key = 'delete';
			if (code == 81) e.key = 'q';
			if (code == 87) e.key = 'w';
			if (code == 69) e.key = 'e';
			if (code == 82) e.key = 'r';
			if (code == 84) e.key = 't';
			if (code == 89) e.key = 'y';
			if (code == 85) e.key = 'u';
			if (code == 73) e.key = 'i';
			if (code == 79) e.key = 'o';
			if (code == 80) e.key = 'p';
			if (code == 65) e.key = 'a';
			if (code == 83) e.key = 's';
			if (code == 68) e.key = 'd';
			if (code == 70) e.key = 'f';
			if (code == 71) e.key = 'g';
			if (code == 72) e.key = 'h';
			if (code == 74) e.key = 'j';
			if (code == 75) e.key = 'k';
			if (code == 76) e.key = 'l';
			if (code == 90) e.key = 'z';
			if (code == 88) e.key = 'x';
			if (code == 67) e.key = 'c';
			if (code == 86) e.key = 'v';
			if (code == 66) e.key = 'b';
			if (code == 78) e.key = 'n';
			if (code == 77) e.key = 'm';
			if (code == 188) e.key = ',';
			if (code == 190) e.key = '.';
			if (code == 191) e.key = '/';
			if (code == 9) e.key = 'tab';
			if (code == 8) e.key = 'backspace';
			// if (code == ) e.key = '';
			if (e.key) { // Item will process this
				panel.keyHandler(e);
				return stop();
			};
		} else {
			if (code == 27 || (e.ctrl && code == 81)) { // Escape or ctrl+Q - cancel edit
				panel.sendMessage('cancel');
				return stop();
			};
			if (code == 13 && e.ctrl) { // Save with ctrl+enter
				panel.sendMessage('save');
				return stop();
			};
		}
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
					evt.preventDefault();
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

App.prototype.createNewItem = function(parent, tags, type) {
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
		item.parent = 'root';
		item.conn = this.dbs[0].conn.code;
	};
	if (type) {
		item.type = type;
	};
	this.db(item).add(item, function (err) {
		if (err) {
			return this.showError(err);
		};
		this.events.emit('add', {
			item: item
		});
		// this.selectItem(parent);
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
		if ('title' == config.sort) {
			result.sort(function (a, b) {
				if(a.title<b.title) {
					return -1;
				}
				if(a.title>b.title) {
					return 1;
				}
				return a.created-b.created;
			});
		};
		handler(err, result);
	}.bind(this))
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

App.prototype.renderLink = function(parent, id, config) {
	// Renders link to item
	var div = this.el('div', parent, {
		'class': 'item_link'
	}, this.titleCache[id] || 'Loading...');
	if (id.startsWith('#')) {
		// Tag rendering
		div.classList.add('item_link_tag');
		this.text(div, id.substr(1), true);
		this.enableDrag(div, {'custom/item': {id: id}, 'Text': id});
		return;
	};
	var enableClick = function (item) {
		div.classList.add('item_link_ok');
		this.titleCache[id] = item.title || '<Untitled>';
		this.text(div, this.titleCache[id], true);
		div.title = item.title;
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
		// Title parser
		var reg = /^(!{1,3}) (.+)$/
		var m = text.match(reg);
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
		});
		this.text(span, text);
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
		inEdit = null;
	};
	var inEdit = null;
	var maxCells = 1;
	var renderCell = function (td, col, rowNum, colNum) {
		var wrapper = this.el('div', td, {
			'class': 'item_td_wrap'
		});
		if (col.button) {
			var button = this.el('button', wrapper, {
				'class': 'item_button item_td_button'
			});
			if (col.icon) {
				this.icon(col.icon, button)
			} else {
				button.classList.add('item_button_text');
				this.text(button, col.text);
			}
			button.addEventListener('click', function (evt) {
				select();
				handler({type: 'button'}, col);
			}.bind(this));
		} else if (col.select) { // Render dropdown menu
			var select = this.el('select', wrapper, {
				'class': 'item_select'
			});
		} else {
			// Other - render as text
			this.renderText(col.text || '', wrapper, function (type, text) {
				handler(type, col, text);
			});
		}
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
			// $$.log('renderEditor', maxCells);
			var etd = this.el('td', etr, {
				'colSpan': ''+maxCells,
				'class': 'item_td_editor'
			});
			var val = (col.value || '' == col.value) ? col.value: col.text;
			var originalValue = type == 'edit'? val: '';
			var etext = this.el('input', etd, {
				'type': 'text',
				'class': 'item_edit_text item_td_text_edit',
				'value':  originalValue
			});
			etext.addEventListener('keydown', function (evt) {
				if (evt.keyCode == 13) {
					// Finished
					inEdit = null; // Edit is finished
					handler({type: type}, col, etext.value);
					return false;
				};
				if (evt.keyCode == 27 || (evt.ctrlKey && evt.keyCode == 81)) {
					// Cancel
					var value = etext.value;
					if (originalValue != value && !window.confirm('Discard changes?')) {
						return false;
					};
					select();
					return false;
				};
			})
			etext.focus();
			etext.selectionStart = (originalValue || '').length;
			this.scrollToEl(etext, div.parentNode);
			inEdit = function (message) {
				if ('changed' == message) {
					var value = etext.value;
					// $$.log('Compare', originalValue, value, originalValue != value);
					return originalValue != value;
				};
				if ('resize' == message) { // Resized - scroll
					this.scrollToEl(etext, div.parentNode);
				};
			};
		}.bind(this);
		var select = function () {
			removeSelection();
			td.classList.add('item_td_edit_selected');
			if (floatPanel) {
				this.scrollToEl(floatPanel, div.parentNode);
			};
			config.controller('grid_focus', controller, {row: rowNum, col: colNum});
		}.bind(this);
		var floatPanel = null;
		if (col.edit || col.remove || col.add) {
			// Editable
			td.classList.add('item_td_edit');
			floatPanel = this.el('div', wrapper, {
				'class': 'td_float_panel'
			});
		};
		td.addEventListener('click', function (evt) {
			select();
			evt.stopPropagation();
		});
		if (col.add) {
			// Can edit with simple one-line text box
			var addButton = this.el('button', floatPanel, {
				'class': 'item_button'
			});
			this.icon('plus', addButton);
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
			});
			this.icon('edit', editButton);
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
		var doRemove = function() { // Ask and remove
			if (window.confirm('Delete line?')) { // User approved
				handler({type: 'remove'}, col);
				return true;
			};
			return false;
		}.bind(this);
		if (col.remove) {
			// Can edit with simple one-line text box
			var removeButton = this.el('button', floatPanel, {
				'class': 'item_button'
			});
			this.icon('trash1', removeButton);
			removeButton.addEventListener('click', function (evt) {
				doRemove();
				evt.stopPropagation();
			}.bind(this));
		};
		if (col.remove || col.move) {
			this.enableDrag(td, {
				'custom/line': {id: config.id, line: col}, 
				'text/plain': col.text || ''
			});
		};
		return function(message) { // Called from outside, for control
			if (message == 'select') { // Select
				return select();
			};
			if (message == 'add' && col.add) { // Can add
				renderEditor('add');
			};
			if (message == 'edit' && col.edit) { // Can edit
				renderEditor('edit');
			};
			if (message == 'delete' && col.remove) { // Can add
				doRemove();
			};
		}.bind(this);
	}.bind(this);
	var gridControl = [];
	for (var i = 0; i < config.rows.length; i++) {
		var row = config.rows[i];
		var tr = this.el('tr', table, {
			'class': 'item_tr'
		});
		var cells = 0;
		var rowControl = [];
		gridControl.push(rowControl);
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
			if (col.width) {
				td.style.width = col.width;
			};
			if (col.span>1) {
				td.colSpan = col.span;
				cells += col.span;
			} else {
				cells++;
			}
			rowControl.push(renderCell(td, col, i, j));
		};
		if (cells>maxCells) {
			maxCells = cells;
		};
	};
	var keyHandler = function(e, cursor) { // Key handler - movement, etc
		var rowControl = gridControl[cursor.row];
		if (rowControl && rowControl[cursor.col]) { // Cursor is valid - can do operations
			if (e.key == 'enter') { // Edit
				rowControl[cursor.col]('edit');	
				return;
			};
			if (e.key == 'insert' || e.key == 'i') { // Insert or i
				rowControl[cursor.col]('add');	
				return;
			};
			if (e.key == 'delete' || e.key == 'd') { // Delete
				rowControl[cursor.col]('delete');	
				return;
			};
		};
		if (cursor.row == -1) { // Last row
			cursor.row = gridControl.length-1;
		};
		if (cursor.row>=gridControl.length) { // Too big
			cursor.row = 0;
		};
		if (e.key == 'up' && 0 == cursor.row) { // Top row and up
			return false;
		};
		if (e.key == 'down' && cursor.row == gridControl.length - 1) { // Bottom row and down
			return false;
		};
		if (e.key == 'up') { // row--
			cursor.row--;
		};
		if (e.key == 'down') { // row++
			cursor.row++;
		};
		rowControl = gridControl[cursor.row];
		if (cursor.col>=rowControl.length) { // Too right
			cursor.col = 0;
		};
		if (cursor.col == -1) { // Reset to 0
			cursor.col = 0;
		};
		if (e.key == 'left') { // Left
			if (cursor.col>0) { // --
				cursor.col--;
			} else { // To right
				cursor.col = rowControl.length-1;
			};
		};
		if (e.key == 'right') { // Right
			if (cursor.col<rowControl.length-1) { // ++
				cursor.col++;
			} else { // To left
				cursor.col = 0;
			};
		};
		// $$.log('rowControl', rowControl[cursor.col], e.key, rowControl, cursor);
		rowControl[cursor.col]('select');
	};
	var controller = function (message, arg0, arg1) {
		// $$.log('Grid key', message, arg0, arg1);
		if (message == 'locked') {
			if (inEdit) {
				return inEdit('changed');
			};
			return false;
		};
		if (message == 'editing') {
			if (inEdit) {
				return true;
			};
			return false;
		};
		if (message == 'resize') {
			if (inEdit) {
				return inEdit('resize');
			};
			return false;
		};
		if (message == 'cancel') { // Cancel edit - now handled differently
			return true;
		};
		if (message == 'key') { // Key handler
			return keyHandler(arg0, arg1);
		};
	}.bind(this);
	return controller;
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
	if (handler) { // Have handler - call
		handler(blocks);
	};
	return blocks; // For those who doesn't use handler
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
	var titleDiv = this.findEl('.card_title_text', parent);
	if (item.parent != 'root') { // Not first page
		this.enableDrag(titleDiv, {'custom/item': item, 'Text': '[['+item.id+']]'});
	};
	var bodyDiv = this.findEl('.card_body_contents', parent);
	this.text(bodyDiv);
	var bottomDiv = this.findEl('.card_tags', parent);
	this.enableDrop(bottomDiv, {
		'custom/item': function (other) {
			// Dropped tag
			var tags = item.tags || [];
			if (tags.indexOf(other.id) == -1 && !inState('editing')) {
				tags.push(other.id);
				item.updated = new Date().getTime();
				item.tags = tags;
				this.updateItem(item, function () {
					render('Dropped');
				}.bind(this));
			};
			return false;
		}.bind(this)
	});
	this.text(bottomDiv);
	var inEdit = false;
	var editHandlers = [];
	var cursor = {grid: -1, row: -1, col: -1};
	var addGrid = function(cb) { // Adds grid to editHandlers, restores selection
		if (!cb) { // Invalid handler
			return false;
		};
		editHandlers.push(cb);
		return true;
	}.bind(this);
	var focusChanged = function(grid, pos) { // Called when focus is changed inside grid
		var index = editHandlers.indexOf(grid);
		cursor.grid = index;
		if (-1 == index) { // Not found
			return;
		};
		cursor.row = pos.row;
		cursor.col = pos.col;
	};
	var keyHandler = function(e) { // On key handler
		if (editHandlers.length == 0) { // No grids
			return false;
		};
		var gridOK = function() { // Checks whether cursor points to correct grid
			if (-1 == cursor.grid || cursor.grid>=editHandlers.length) { // Out of bounds
				if (e.key == 'up') { // Bottom one
					cursor.grid = editHandlers.length - 1;
				} else { // Top one
					cursor.grid = 0;
				};
				cursor.row = 0;
				cursor.col = 0;
				return false;
			};
			return true; // Within bounds
		};
		if (!gridOK()) { // Need to select grid
		};
		var keyResult = editHandlers[cursor.grid]('key', e, cursor);
		if (false == keyResult) { // Failed to process - switch to other grid
			if (e.key == 'up') { // Bottom one
				cursor.grid--;
				cursor.row = -1;
			} else { // Top one
				cursor.grid++;
				cursor.row = 0;
			};
			if (!gridOK()) { // Invalid grid
			};
			editHandlers[cursor.grid]('key', e, cursor);
		};
	};
	var inState = function (state) {
		// Returns true if item is locked
		if (inEdit) { // Own editor active
			if (state == 'editing') { // Directly from inEdit
				return true;
			};
			if (state == 'locked') {
				return form.changed();
			};
		};
		for (var i = 0; i < editHandlers.length; i++) {
			var handler = editHandlers[i];
			if (handler(state)) {
				return true;
			};
		};
		return false;
	}.bind(this);
	var render = function (reason) {
		// $$.log('Render...', reason);
		var blocksToGrid = function (blocks) {
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
		this.text(titleDiv, item.title || '<No title>', true);
		var tags = item.tags || [];
		this.text(bottomDiv);
		for (var i = 0; i < tags.length; i++) {
			var tag = tags[i];
			this.renderLink(bottomDiv, tag, {
			});
		};
		this.parseLines(item.body, function (blocks) {
			// By default, render grid with one row per line
			this.onEveryApplication(item, function (configs) {
				var _gridHandler = function (new_blocks, data) {
					// Rendered
					this.saveBlocks(blocks, function (text) {
						item.updated = new Date().getTime();
						item.body = text;
						if (data.type == 'add') { // Move cursor to next row
							cursor.row++;
						};
						this.updateItem(item, function () {
							//render('Grid updated');
						}.bind(this));
					}.bind(this));
				}.bind(this);
				// $$.log('Render', item.title, editHandlers.length, configs.length);
				this.text(bodyDiv); // Clear body
				editHandlers = [];
				for (var i = 0; i < configs.length; i++) {
					var conf = configs[i];
					var cb = this.execApp('onRender', conf, item, controller, _gridHandler);
					addGrid(cb);
				};
				if (configs.length == 0) {
					var grid = blocksToGrid(blocks);
					grid.controller = controller;
					var editHandler = this.gridHandler(blocks, grid, bodyDiv, _gridHandler);
					addGrid(editHandler);
				};
				keyHandler({});
			}.bind(this));
		}.bind(this));
	}.bind(this);
	var etitle = this.findEl('.editor_title', parent);
	var ebody = this.findEl('.editor_body', parent);
	var etags = this.findEl('.editor_tags', parent);
	var form = new FormController();
	form.add('title', etitle);
	form.add('body', ebody);
	form.add('tags', etags);
	var onFinishEdit = function () {
		if (!inEdit) { // Maybe grid editor
			for (var i = 0; i < editHandlers.length; i++) {
				var handler = editHandlers[i];
				if (handler(state)) {
					return true;
				};
			};
			return false;
		};
		if (form.changed() && !window.confirm('Discard changes?')) {
			return false;
		};
		finishEdit();
	}.bind(this);
	var finishEdit = function () {
		inEdit = false;
		parent.classList.remove('card_edit');
	}.bind(this);
	var onSave = function () {
		item.title = form.get('title');
		item.body = form.get('body');
		var tags = form.get('tags');
		if (tags) {
			item.tags = tags.split(' ');
		} else {
			delete item.tags;
		}
		item.updated = new Date().getTime();
		this.updateItem(item, function () {
			finishEdit();
			render('Saved');
		});
	}.bind(this);
	var edit = function () {
		inEdit = true;
		parent.classList.add('card_edit');
		form.set('body', item.body);
		form.set('title', item.title);
		form.set('tags', item.tags? item.tags.join(' '): '');
		ebody.focus();
	}.bind(this);
	var onUpdate = function (evt) {
		if (evt.item && evt.item.id == item.id) {
			item = evt.item;
			if (!inState('locked')) {
				render('Update event');
			};
		};
	}.bind(this);
	var onRemove = function (evt) {
		if (evt.item.id == item.id) {
			config.controller.events.emit('remove', {
				item: item,
				index: config.index
			});
		};
	}.bind(this);
	var onResize = function (evt) {
		for (var i = 0; i < editHandlers.length; i++) {
			var handler = editHandlers[i];
			handler('resize');
		};
	}.bind(this);
	var onFocus = function (focus, data) {
		// $$.log('item focus:', item, focus, data, config.panel);
		if (focus) {
			div.classList.add('card_focus');
		} else {
			div.classList.remove('card_focus');
		}
	}.bind(this);
	this.events.on('update', onUpdate);
	this.events.on('remove', onRemove);
	this.events.on('resize', onResize);
	finishEdit();
	var controller = function (type, arg0, arg1, arg2) {
		// $$.log('Came message:', type);
		if ('add_grid' == type) { // Render grid to editHandlers
			arg0.controller = controller;
			var cb = this.renderGrid(arg0, bodyDiv, arg1);
			addGrid(cb);
			return cb;
		};
		if ('grid_focus' == type) { // Called by renderGrid when focus is changed
			return focusChanged(arg0, arg1);
		};
		if ('div' == type) {
			return div;
		};
		if ('remove' == type) {
			// Unsubscribe
			this.events.off('update', onUpdate);
			this.events.off('remove', onRemove);
			this.events.off('resize', onResize);
		};
		if ('locked' == type || 'editing' == type) {
			return inState(type);
		};
		if ('focus' == type) {
			return onFocus(arg0, arg1);
		};
		if ('edit' == type) {
			return edit();
		};
		if ('cancel' == type) {
			return onFinishEdit();
		};
		if ('save' == type) {
			if (inState('editing')) {
				// Editor active
				return onSave();
			};
			return false;
		};
		if ('child' == type) {
			return this.createNewItem(item);
		};
		if ('key' == type) { // Key handler
			return keyHandler(arg0);
		};
	}.bind(this);
	render('Item render');
	return controller; // Use it for controll
};

App.prototype.findEl = function(query, where) {
	return (where || document.body).querySelectorAll(query).item(0);
};

App.prototype.pxInEm = function(el) {
	return Number(getComputedStyle(el, "").fontSize.match(/(\d*(\.\d*)?)px/)[1]);
};

App.prototype.addSoftSpace = function(text) {
	if (text) {
		var data = '';
		for (var i = 0; i < text.length; i++) {
			data += text[i]+String.fromCharCode(0x200B);
		};
		return data;
	};
	return text;
};

App.prototype.text = function(el, text, softspace) {
	var nl = el.childNodes;
	while(nl && nl.length>0) {
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
	setTimeout(function () {
		var p = parent || window;
		var findOffset = function (el, offs) {
			if (!el) {
				return offs;
			};
			offs.left += el.offsetLeft;
			offs.top += el.offsetTop;
			// $$.log('findOffset', el.offsetParent, p, offs.left, offs.top);
			if (el.offsetParent != p) {
				return findOffset(el.offsetParent, offs);
			};
			return offs;
		};
		var offsetRelative = findOffset(el, {left: 0, top: 0});
		// $$.log('scrollToEl', p.scrollTop+parent.offsetHeight, offsetRelative.top+el.offsetHeight, p.scrollTop, parent.offsetHeight);
		if (p.scrollTop+parent.offsetHeight<offsetRelative.top+el.offsetHeight) {
			el.scrollIntoView(true);
		};
		if (p.scrollTop>offsetRelative.top) {
			el.scrollIntoView(true);
		};
	}.bind(this), 10);
};

App.prototype.icon = function(icon, parent, config) {
	return this.el('span', parent, {
		'class': 'font_icon ic-system'+icon
	});
};

App.prototype.isAppDev = function(item) {
	return this.manager.dev;
};

App.prototype.addDevAppButton = function(item, blocks) {
	var button = this.el('button', this.findEl('#top_controls'), {
		'class': 'item_button item_button_text'
	});
	this.el('span', button, {
		'class': 'item_button_text_span'
	}, 'Dev: '+item.title);
	button.addEventListener('click', function (evt) {
		iterateOver(blocks, function (block, cb) {
			if (block.type == 'block' && (block.params[0] == 'js' || block.params[0] == 'css') && block.params[1]) {
				var req = new XMLHttpRequest();
				req.onreadystatechange = function(e) {
					if (req.readyState == 4) {
						if (200 != req.status) {
							cb('XHR error');
						} else {
							block.lines = req.responseText.split('\n');
							cb();
							$$.log('Resource loaded:', block.params[1]);
						}
					};
				};
				req.open('GET', 'js/apps/'+item.title.toLowerCase()+'/'+block.params[1]);
				req.send();
			} else {
				cb();
			}
		}.bind(this), function (err) {
			if (err) {
				return this.showError('Application not updated: '+err);
			};
			this.saveBlocks(blocks, function (text) {
				item.updated = new Date().getTime();
				item.body = text;
				this.updateItem(item, function () {
					this.showInfo('Application updated: '+item.title);
				}.bind(this));
			}.bind(this));
		}.bind(this));
	}.bind(this));
};

App.prototype.loadApplications = function() {
	var head = document.getElementsByTagName('head')[0];
	this.initAppAPI();
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
			if (this.isAppDev(item)) {
				this.addDevAppButton(item, blocks);
			};
			for (var i = 0; i < blocks.length; i++) {
				var block = blocks[i];
				if (block.type == 'block' && block.params[0] == 'js') {
					var el = document.createElement('script');
					el.setAttribute('type', 'text/javascript');
					if (this.isAppDev(item) && block.params[1]) {
						// Use src
						el.setAttribute('src', 'js/apps/'+item.title.toLowerCase()+'/'+block.params[1]);
						this.devApps[item.title.toLowerCase()] = item.id;
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
						el.setAttribute('href', 'js/apps/'+item.title.toLowerCase()+'/'+block.params[1]);
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

var AppTmpl = function () {};

AppTmpl.prototype.onRender = function(config, item, controller) {
	return null;
};

AppTmpl.prototype.getBlock = function(blocks, name, create) {
	for (var i = 0; i < blocks.length; i++) {
		var b = blocks[i];
		if (b.type == 'block' && b.params.length>0 && b.params[0] == name) {
			return b;
		};
	};
	if (create) { // Create empty
		var block = {lines: [], params: [name], type: 'block'};
		blocks.push(block);
		return block;
	};
	return null;
};

AppTmpl.prototype.parseLines = function(text, handler) { // Converts text to array of blocks
	return this.app.parseLines(text, handler);
};

AppTmpl.prototype.blockToConfig = function(block) {
	if (!block) {
		return {};
	};
	var result = {};
	for (var i = 0; i < block.lines.length; i++) {
		var line = block.lines[i];
		var idx = line.indexOf(':');
		if (-1 != idx) {
			var key = line.substr(0, idx).trim();
			var value = line.substr(idx+1).trim();
			result[key] = value;
		};
	};
	return result;
};

App.prototype.execApp = function(name, config) {
	var app = this.apps[config.app];
	if (!app) {
		$$.log('App not found:', config);
		return null;
	};
	var args = [config.config];
	for (var i = 2; i < arguments.length; i++) {
		args.push(arguments[i]);
	};
	return app[name].apply(app, args);
};

App.prototype.onEveryApplication = function(item, handler) {
	// Tries to load configs by tags and executes handler for every application
	var tags = item.tags || [];
	var configs = [];
	iterateOver(tags, function (tag, cb) {
		this.list({id: tag}, function (err, data) {
			if (err) {
				return cb(err);
			};
			if (data.length == 0) {
				return cb();
			};
			var	appForConfig = function (confItem) {
				if (confItem.tags && confItem.tags.indexOf('#app') != -1) {
					// Already application
					configs.push({
						app: confItem.id
					});
					cb();
					return;
				};
				this.parseLines(confItem.body, function (blocks) {
					configs.push({
						app: data[0].tags,
						config: blocks
					});
					cb();
				}.bind(this));
			}.bind(this);
			if (data[0].tags && data[0].tags.length>0) {
				// Have app
				appForConfig(data[0]);
			};
		}.bind(this));
	}.bind(this), function (err) {
		if (err) {
			return this.showError(err);
		};
		handler(configs);
	}.bind(this));
};

App.prototype.initAppAPI = function() {
	// Binds API to $$ object
	this.apps = {};
	this.devApps = {};
	$$.appTmpl = AppTmpl;
	$$.registerApplication = function (appID, instance) {
		this.apps[appID] = instance;
		instance.app = this;
		$$.log('Application registered:', appID);
	}.bind(this);
	$$.showError = this.showError.bind(this);
	$$.registerApplicationDev = function (name, instance) {
		var appID = this.devApps[name];
		if (appID) {
			$$.registerApplication(appID, instance);
		} else {
			$$.log('Dev. application not found:', name);
		}
	}.bind(this);
	$$.addGrid = function (config, controller, handler) {
		return controller('add_grid', config, handler);
	}.bind(this);
	$$.notifyUpdated = function (item, event) {
		if (!event) {
			event = {};
		};
		event.item = item;
		this.events.emit('update', event);
	}.bind(this);
	var getConnection = function (code) {
		for (var i = 0; i < this.dbs.length; i++) {
			var db = this.dbs[i];
			if (db.conn.code == code) {
				return db;
			};
		};
		return null;
	}.bind(this);
	$$.getConnections = function () {
		var result = [];
		for (var i = 0; i < this.dbs.length; i++) {
			var db = this.dbs[i];
			result.push(db.conn);
		};
		return result;
	}.bind(this);
	$$.getTokens = function (code, handler) {
		var db = getConnection(code);
		if (!db) {
			return handler('Invalid container');
		};
		return this.manager.getTokens(db.conn, handler);
	}.bind(this);
	$$.tokenStatus = function (code, token, status, handler) {
		var db = getConnection(code);
		if (!db) {
			return handler('Invalid container');
		};
		return this.manager.tokenStatus(db.conn, token, status, handler);
	}.bind(this);
	$$.removeToken = function (code, token, handler) {
		var db = getConnection(code);
		if (!db) {
			return handler('Invalid container');
		};
		return this.manager.removeToken(db.conn, token, handler);
	}.bind(this);
	$$.addSoftSpace = this.addSoftSpace.bind(this);
	$$.appEvents = function() { // Returns events of app
		return this.events;
	}.bind(this);
};

