var IndexedDB = function() {
};

IndexedDB.prototype.open = function(name, version, handler, versionHandler) {
    version = version || 1;
    if (!window.indexedDB) {
        $$.log('IndexedDB not supported');
        return handler({message: 'Not supported'});
    };
    var request = window.indexedDB.open(name, version);
    request.onerror = function(evt) {
        $$.log('DB error:', evt);
        handler({message: 'Open error: '+evt.target.errorCode});
    }.bind(this);
    var dbReady = function (db) {
        db.onversionchange = function(evt) {
            $$.log('onversionchange', evt);
            db.close();
            if (versionHandler) {
                versionHandler();
            };
        };
        this.db = db;
        this.name = name;
        request.onerror = null;
        handler();
    }.bind(this);
    var upgrade = function(fromVersion, db, transaction) {
        $$.log('Upgrade from', fromVersion, 'to', version, db.version);
        for (var i = fromVersion+1; i<=version; i++) {
            this.upgrade(db, transaction, i);
        };
    }.bind(this);
    request.onsuccess = function(evt) {
        $$.log('DB opened without problems');
        dbReady(request.result);
    }.bind(this);
    request.onupgradeneeded = function (evt) {
        var db = request.result;
        $$.log('Upgrade needed', evt, version, db.transaction);
        upgrade(evt.oldVersion || 0, db, evt.target.transaction);
    };
    request.onblocked = function (evt) {
        $$.log('DB open blocked', evt);
        handler({message: 'DB blocked'});
    };
};

IndexedDB.prototype.upgrade = function(db, transaction, version) {
    $$.log('Do upgrade for', version);
};

IndexedDB.prototype.delete = function(handler) {
    if (!this.db) {
        // Not opened
        return handler({message: 'Not opened'});
    };
    try {
        this.db.close();
        this.db = null;
    } catch (e) {
        return handler({message: 'Not closed: '+e});
    };
    var request = window.indexedDB.deleteDatabase(this.name);
    request.onblocked = function (evt) {
        $$.log('DB delete blocked', evt);
        handler({message: 'DB blocked'});
    };
    request.onsuccess = function(evt) {
        $$.log('DB deleted:', evt);
        handler();
    }.bind(this);
};

IndexedDB.prototype.transaction = function(stores, type) {
    var arr = [];
    for (var i = 0; i < stores.length; i++) {
        arr.push(stores[i]);
    };
    return this.db.transaction(arr, type);
};

IndexedDB.prototype.fetch = function () {
    // Opens readonly transaction
    return this.transaction(arguments, 'readonly');
};

IndexedDB.prototype.update = function () {
    // Opens readwrite transaction
    return this.transaction(arguments, 'readwrite');
};

IndexedDB.prototype.execRequest = function(request, handler) {
    request.onsuccess = function (e) {
        handler(null, e.target.result);
    };
    request.onerror = function(e) {
        $$.log('execRequest', e);
        handler({message: 'Error: '+e.target.error.name});
    };
};

IndexedDB.prototype.execTransaction = function(t, handler) {
    t.oncomplete = function (e) {
        handler(null, e.target.result);
    };
    t.onerror = function(e) {
        $$.log('execTransaction', e);
        handler({message: 'Error: '+e.target.error.name});
    };
};

var $$ = {};

$$.log = function() {
    if (!window.console) { // No console
        return;
    };
    console.log.apply(console, arguments);
};

var ConnectionsDB = function () {
};
ConnectionsDB.prototype = new IndexedDB();

ConnectionsDB.prototype.upgrade = function(db, transaction, version) {
    switch (version) {
    case 1:
        var store = db.createObjectStore('connections', {keyPath: 'code'});
        return;
    case 2:
        var store = transaction.objectStore('connections');
        store.createIndex('code', 'code', {unique: true});
        return;
    }
};

var SitesManager = function (handler) {
    var db = new ConnectionsDB();
    db.open('connections', 2, function(err) {
        if (!err) {
            this.db = db;
        };
        return handler(err);
    }.bind(this));
}

SitesManager.prototype.defaultConnection = function() {
    var reg = /(.*\/)([a-z0-9]+)\.wiki\.html($|#)/i;
    var m = window.location.toString().match(reg);
    if(!m) {
        var id = window.prompt('Please enter Container URL:');
        if (!id) {
            return null;
        };
        m = id.match(reg);
        if (m) {
            return {url: m[1], code: m[2]};
        }
        return null;
    } else {
        var id = m[2];
        return {url: '/', code: id};
    }
};

SitesManager.prototype.rest = function(conn, path, obj, handler, config) {
    var url = conn.url+path;
    var req = new XMLHttpRequest();
    req.onreadystatechange = function(e) {
        if (req.readyState == 4) {
            if (200 != req.status) {
                return handler('HTTP error: '+req.status);
            };
            try {
                var json = JSON.parse(req.responseText);
                if (json.error) {
                    return handler(json.error);
                }
                return handler(null, json);
            } catch (e) {
                $$.log('Rest:', e);
                return handler('Rest error: '+e);
            }
        };
    };
    req.open('POST', url);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify(obj));
};

SitesManager.prototype.siteExist = function(conn, code, handler) {
    this.rest(conn, 'rest/site/get', {code: code}, handler);
};

SitesManager.prototype.newSite = function(conn, code, handler) {
    this.rest(conn, 'rest/site/create', {code: code}, handler);
};

SitesManager.prototype.getConnection = function(code, handler) {
    var t = this.db.fetch('connections');
    this.db.execRequest(t.objectStore('connections').index('code').get(code), function (err, cursor) {
        $$.log('Cursor', err, cursor);
        if (err) {
            return handler(err);
        };
        if (cursor) {
            handler(null, cursor);
        } else {
            handler(null, null);
        }
    });
};

SitesManager.prototype._addConnection = function(conn, handler) {
    var t = this.db.update('connections');
    this.db.execTransaction(t, handler);
    try {
        t.objectStore('connections').add(conn);
    } catch (e) {
        handler('DB Error: '+e);
    }
};

SitesManager.prototype.initConnection = function(conn, handler) {
    this.getConnection(conn.code, function (err, result) {
        $$.log('getConnection', err, result);
        if (err) {
            return handler(err);
        };
        if (!result) {
            // Try to load/create
            this.siteExist(conn, conn.code, function (err, data) {
                $$.log('Site:', err, data);
                if (err) {
                    return handler(err);
                };
                if (!data.found) {
                    // Create new 
                    if (!window.confirm('Do you want to create new Container?')) {
                        return handler('Cancelled by User');
                    }
                    this.newSite(conn, conn.code, function (err, data) {
                        $$.log('New site:', err, data);
                        if (err) {
                            return handler(err);
                        };
                        var newData = {
                            code: conn.code,
                            url: conn.url,
                            managed: true,
                            token: data.token,
                            client: data.client
                        };
                        this._addConnection(newData, function (err) {
                            $$.log('_addConnection', err);
                            handler(err, newData);
                        });
                        // Add
                    }.bind(this));
                } else {
                    // Need new token
                }
            }.bind(this));
        } else {
            // Exist
            return handler(null, result);
        }
    }.bind(this));
};

var manager = new SitesManager(function(err) {
    if (err) {
        return $$.log('Error:', err);
    }
    var id = manager.defaultConnection();
    $$.log('ID:', id);
    if(!id) {
        return;
    }
    manager.initConnection(id, function (err) {
        
    });
    // manager.siteExist(id, id.code, function (err, data) {
    //     $$.log('Site:', err, data);
    // }.bind(this));
}.bind(manager));

/*
var db = new ConnectionsDB();
db.open('connections', 2, function(err) {
    $$.log('DB open result:', err);
    if (err) {
        return;
    };
    var t = db.update('connections');
    db.execTransaction(t, function (err) {
        $$.log('transaction: ', err);
    });
    var store = t.objectStore('connections');
    db.execRequest(store.index('code').openCursor(), function (err, cursor) {
        $$.log('Cursor', err, cursor);
        if (cursor) {
            $$.log('connections', cursor.value);
            cursor.value.name = 'a99';
            store.put(cursor.value);
            cursor.continue();
        };
    });
    // .add({code: 'abxasdasdasd', url: '/', managed: true, token: 'xxx', color: '#ffaaaa'});
    setTimeout(function () {
        // db.delete(function (err) {
        //     $$.log('DB delete result:', err);
        // });
    }, 0);
});
*/