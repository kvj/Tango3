var App = function () {
};

App.prototype = new $$.appTmpl;

App.prototype.onRender = function(config, item, div, blocks, saveHandler) {
	// $$.log('Render calendar', item.title);
	var grid = {
		id: item.id,
		rows: []
	};
	if (!this.getBlock(blocks, 'config')) {
		return null;
	};
	if (blocks.length == 1) {
		blocks.push({
			type: 'text',
			lines: []
		});
	};
	var reg = /^(\d{1,2}):(.*)$/
	var getTextByDay = function  (day) {
		var lines = blocks[1].lines;
		for (var i = 0; i < lines.length; i++) {
			var l = lines[i];
			var m = l.match(reg);
			if (m) {
				if (parseInt(m[1]) == day) {
					return m[2] || '';
				};
			};
		};
		return '';
	};
	var setTextByDay = function (day, text) {
		var lines = blocks[1].lines;
		for (var i = 0; i < lines.length; i++) {
			var l = lines[i];
			var m = l.match(reg);
			if (m) {
				if (parseInt(m[1]) == day) {
					lines[i] = ''+day+':'+text;
					return;
				};
			};
		};
		lines.push(''+day+':'+text);
	};
	var appConf = this.blockToConfig(this.getBlock(config, 'config'));
	var itemConf = this.blockToConfig(this.getBlock(blocks, 'config'));
	var days = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
	var starts = days.indexOf(appConf.starts);
	if (-1 == starts) {
		starts = 0;
	};
	var r = [];
	for (var i = 0; i < days.length; i++) {
		var d = days[(i+starts) % 7];
		r.push({
			text: '! '+d,
			width: '14%'
		});
	};
	var dt = new Date();
	dt.setDate(1);
	if (itemConf.year) {
		dt.setYear(parseInt(itemConf.year));
	};
	if (itemConf.month) {
		dt.setMonth(parseInt(itemConf.month)-1);
	};
	var thisMonth = dt.getMonth();
	while(dt.getDay() != starts) {
		dt.setDate(dt.getDate()-1);
	}
	grid.rows.push({
		cols: r
	});
	for (var i = 0; i < 6; i++) {
		r = [];
		for (var j = 0; j < 7; j++) {
			var month = dt.getMonth();
			var d = dt.getDate();
			if (month == thisMonth) {
				var c = {
					text: ''+d+getTextByDay(d),
					edit: true,
					day: d,
					value: getTextByDay(d)
				};
				r.push(c);
			} else {
				var c = {
					text: ''
				};
				r.push(c);
			}
			dt.setDate(dt.getDate()+1);
		};
		grid.rows.push({
			cols: r
		});
		var month = dt.getMonth();
		if (month != thisMonth) {
			break;
		};
	};
	return $$.renderGrid(grid, div, function (data, col, text) {
		if (data.type == 'edit') {
			setTextByDay(col.day, text);
			return saveHandler();
		};
		if (data.type == 'drop') {
			setTextByDay(col.day, getTextByDay(col.day)+'[['+data.id+']]');
			return saveHandler();
		};
	}.bind(this));
};


// Dev. code
if (typeof(appID) == 'undefined') {
	$$.registerApplicationDev('calendar', new App());
} else {
	$$.registerApplication(appID, new App());
}
