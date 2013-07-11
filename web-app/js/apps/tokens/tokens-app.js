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
			// $$.log('Tokens:', list);
			grid.rows.push({
				cols: [{
					text: '! Unapproved tokens:',
					span: 4
				}]
			});
			for (var i = 0; i < list.data.length; i++) {
				var itm = list.data[i];
				if (itm.status == 0) {
					// Approved
					grid.rows.push({
						cols: [{
							width: '100%',
							text: $$.addSoftSpace(itm.token),
						}, {
							align: 'r',
							text: new Date(itm.accessed).format('m/d H:MM')
						}, {
							icon: 'success',
							token: itm.token,
							approveToken: true,
							button: true
						}, {
							icon: 'trash1',
							token: itm.token,
							removeToken: true,
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
				var itm = list.data[i];
				if (itm.status != 0) {
					// Approved
					grid.rows.push({
						cols: [{
							width: '100%',
							text: $$.addSoftSpace(itm.token),
						}, {
							align: 'r',
							text: new Date(itm.accessed).format('m/d H:MM')
						}, {
							icon: 'error',
							token: itm.token,
							disableToken: true,
							button: true
						}, {
							icon: 'trash1',
							token: itm.token,
							removeToken: true,
							button: true
						}]
					})
				};
			};
			$$.renderGrid(grid, div, function (data, col, text) {
				var _handler = function (err) {
					// $$.log('Updated', err, item);
					if (err) {
						return $$.showError(err);
					};
					$$.notifyUpdated(item);
				}.bind(this);
				if (data.type == 'button') {
					if (col.approveToken) {
						$$.tokenStatus(db.code, col.token, 1, _handler);
					} else if (col.disableToken) {
						$$.tokenStatus(db.code, col.token, 0, _handler);
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