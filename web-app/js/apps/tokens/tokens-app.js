var App = function () {
};

App.prototype = new $$.appTmpl;

App.prototype.onRender = function(config, item, div, blocks, saveHandler) {
	var renderConnection = function (db) {
		var grid = {
			id: item.id,
			rows: [{
				cols: [{
					text: '!! '+db.code,
					span: 4
				}]
			}]
		};
		$$.getTokens(db.code, function (err, list) {
			if (err) {
				return $$.showError(err);
			};
			$$.log('Tokens:', list);
			grid.rows.push({
				cols: [{
					text: '! Unapproved tokens:',
					span: 4
				}]
			});
			for (var i = 0; i < list.data.length; i++) {
				var item = list.data[i];
				if (item.status == 0) {
					// Approved
					grid.rows.push({
						cols: [{
							text: item.token
						}, {
							text: new Date(item.created).format('m/d H:MM')
						}, {
							text: 'Approve',
							token: item.token,
							approve: true,
							button: true
						}, {
							text: 'Remove',
							token: item.token,
							approve: false,
							align: 'r',
							button: true
						}]
					})
				};
			};
			grid.rows.push({
				cols: [{
					text: '! Approved tokens:',
					span: 4
				}]
			});
			for (var i = 0; i < list.data.length; i++) {
				var item = list.data[i];
				if (item.status != 0) {
					// Approved
					grid.rows.push({
						cols: [{
							text: item.token
						}, {
							text: new Date(item.created).format('m/d H:MM')
						}, {
							text: 'Remove',
							align: 'r',
							token: item.token,
							approve: false,
							span: 2,
							button: true
						}]
					})
				};
			};
			$$.renderGrid(grid, div, function (data, col, text) {
				var _handler = function (err) {
					$$.log('Updated', err);
					if (err) {
						return $$.showError(err);
					};
					$$.notifyUpdated(item);
				}.bind(this);
				if (data.type == 'button') {
					if (col.approve) {
						$$.approveToken(db.code, col.token, _handler);
					} else {
						if (window.confirm('Are you sure want to remove token?')) {
							$$.removeToken(db.code, col.token, _handler);
						};
					};
				};
			}.bind(this));
		}.bind(this));
	}.bind(this);
	var dbs = $$.getConnections();
	for (var i = 0; i < dbs.length; i++) {
		var db = dbs[i];
		renderConnection(db);
	};
	return null;
};

if (typeof(appID) == 'undefined') {
	$$.registerApplicationDev('tokens', new App());
} else {
	$$.registerApplication(appID, new App());
}