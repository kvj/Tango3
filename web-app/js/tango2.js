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
        $$.log('execTransaction Error', e);
        handler({message: 'Error: '+e.target.error.name});
    };
};

IndexedDB.prototype.cancelTransaction = function(t) {
    t.oncomplete = t.onerror = null;
};

IndexedDB.prototype.cancelRequest = function(t) {
    t.onsuccess = t.onerror = null;
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

var DocumentsDB = function () {
};
DocumentsDB.prototype = new IndexedDB();

DocumentsDB.prototype.upgrade = function(db, t, version) {
    // config.upgrade will receive version 1, 2, 3 excluding own upgrades
    var configUpgrade = function (version) {
        if (this.appConfig.upgrade) {
            this.appConfig.upgrade(db, t, version);
        };
    }.bind(this);
    var ownUpgrade = function () {
        switch (version) {
        case 1:
            var history = db.createObjectStore('history', {keyPath: 'id'});
            history.createIndex('version', 'version', {unique: true});
            history.createIndex('tstamp', 'tstamp');
            var documents = db.createObjectStore('documents', {keyPath: 'id'});
            documents.createIndex('conn', 'conn');
            return;
        case 5:
            var history = t.objectStore('history');
            history.createIndex('order', 'order');
            return;
        }
    };
    // 1 2 3 4 5
    // X     X
    var own = [1, 5];
    for (var i = 0; i < own.length; i++) {
        if (version == own[i]) {
            return ownUpgrade();
        };
        if (version<own[i]) {
            return configUpgrade(version-i+1);
        };
    };
    return configUpgrade(version-own.length);
};

var DocumentsManager = function (conn, handler, config) {
    this.conn = conn;
    this.config = config || {};
    this._id = 0;
    this.pending = [];
    this.insync = false;
    this.changed = false;
    this.autoSyncInterval = 0;
    var ownVersion = 2;
    var db = new DocumentsDB();
    db.appConfig = this.config;
    db.open('db_'+conn.code, ownVersion + (this.config.version || 0), function(err) {
        if (!err) {
            this.db = db;
            this.initBrowserHandlers();
        };
        handler(err);
    }.bind(this));
};

DocumentsManager.prototype.onNetworkChange = function(online) {
    // body...
};

DocumentsManager.prototype.onVisibilityChange = function(visible) {
    // body...
};

DocumentsManager.prototype.initBrowserHandlers = function() {
    this.changeHandler = function () {};
    this.online = true;
    // $$.log('Browser:', navigator.onLine, document.hidden, document.webkitHidden);
    if (typeof(navigator.onLine) != 'undefined') {
        this.online = navigator.onLine || false;
        window.addEventListener('online', function (evt) {
            this.online = true;
            this.onNetworkChange(this.online);
        }.bind(this));
        window.addEventListener('offline', function (evt) {
            this.online = false;
            this.onNetworkChange(this.online);
        }.bind(this));
    };
    var isHidden = function () {
        if (typeof(document.hidden) != 'undefined') {
            return document.hidden;
        };
        return document.webkitHidden;
    };
    this.hidden = false;
    // $$.log('hidden', typeof(isHidden()));
    if (typeof(isHidden()) != 'undefined') {
        this.hidden = isHidden();
        var handler = function (evt) {
            this.hidden = isHidden();
            // $$.log('visibilitychange', this.hidden);
            this.onVisibilityChange(!this.hidden);
        }.bind(this);
        document.addEventListener('visibilitychange', handler);
        document.addEventListener('webkitvisibilitychange', handler);
    };
    this.onNetworkChange(this.online);
    this.onVisibilityChange(!this.hidden);
};

DocumentsManager.prototype.onDocumentSyncChange = function(type, doc) {
    // Clients can override and update what's on the screen
};

DocumentsManager.prototype.onPingState = function(err, data) {
    // body...
};

DocumentsManager.prototype.startPing = function(config, manager, handler) {
    var fastPing = (config.fast || 60)*1000;
    var slowPing = (config.slow || 600)*1000;
    var stopPing = function () {
        if (this.pingID) {
            clearTimeout(this.pingID);
            this.pingID = null;
        };
    }.bind(this);
    stopPing();
    var isSlow = function () {
        if (!this.online || this.hidden) {
            return true;
        };
        return false;
    }.bind(this);
    this.changeHandler = function (message) {
        if (message == 'sync') {
            // Sync done
            stopPing();
            this.onPingState(null, false); // No new data
            schedulePing(); // Re-schedule
        };
    }.bind(this);
    var schedulePing = function () {
        this.pingID = setTimeout(function () {
            this.pingID = null;
            return runPing();
        }.bind(this), isSlow()? slowPing: fastPing);
    }.bind(this);
    var runPing = function () {
        if (!this.online) {
            this.onPingState('Offline');
            schedulePing();
            return;
        }
        this.ping(manager, function (err, data) {
            if (err) {
                this.onPingState(err);
            } else {
                this.onPingState(null, data.data);
                if (data.data) {
                    // Have data
                    handler();
                };
            };
            schedulePing();
        }.bind(this));
        // $$.log('Scheduling ping:', isSlow());
    }.bind(this);
    runPing();
};

DocumentsManager.prototype.ping = function(manager, handler) {
    var marker = this.conn.marker;
    if (this.insync) {
        return handler(null, {data: false});
    };
    manager.ping(this.conn, marker, function (err, data) {
        handler(err, data);
    }.bind(this));
};

DocumentsManager.prototype.sync = function(manager, handler) {
    if (this.insync) {
        return handler(); // Already in sync
    };
    this.insync = true;
    var finish = function (err) {
        // setTimeout(function () {
        this.insync = false;
        if (!err) {
            this.setChanged(false);
            this.changeHandler('sync'); // Sync done - re-schedule ping
        };
        this.resumePending();
        $$.log('Sync finish:', err);
        // Finishes sync with error
        return handler(err);
        // }.bind(this), 10000);
    }.bind(this);
    var prepareOwnHistory = function (from) {
        // Fetches history from DB as a list, by marker
        // $$.log('prepareOwnHistory', from);
        var t = this.db.fetch('history', 'documents');
        var fetchFrom = function (cond) {
            $$.log('fetchFrom', cond);
            // Does actual fetch
            this.list(t.objectStore('history').index('order').openCursor(cond), function (err, list) {
                $$.log('List:', list, err);
                if (err) {
                    return finish(err);
                };
                compressHistory(list, {max: 10000}, {
                    document: function (id, handler) {
                        this.db.execRequest(t.objectStore('documents').get(id), function(err, res) {
                            if (err) {
                                return handler(err);
                            };
                            if (res) {
                                return handler(null, JSON.stringify(res));
                            };
                            return handler();
                        });
                    }.bind(this)
                }, function (err, result) {
                    sendHistory(result);
                });
            }.bind(this));
        }.bind(this);
        var req = t.objectStore('history').get(from || '');
        this.db.execRequest(req, function (err, result) {
            if (err) {
                return finish(err);
            };
            if (result) {
                // Found
                fetchFrom(IDBKeyRange.lowerBound(result.order, true));
            } else {
                // Not found - first item in history
                req = t.objectStore('history').index('tstamp').openCursor();
                this.db.execRequest(req, function (err, result) {
                    // body...
                    if (err) {
                        return finish(err);
                    };
                    if (!result) {
                        // No data in history?
                        return fetchFrom('');
                    };
                    fetchFrom(IDBKeyRange.lowerBound(result.value.order, false));
                }.bind(this));
            };
        }.bind(this));
    }.bind(this);
    var sendHistory = function (history) {
        // $$.log('sendHistory', history);
        var data = {data: history};
        manager.sendHistory(this.conn, data, function (err, data) {
            // $$.log('sendHistory result:', err, data);
            if (err) {
                return finish(err);
            };
            if (history.length>0) {
                // Have data
                prepareOwnHistory(history[history.length-1].id);
            } else {
                receiveHistory(this.conn.marker);
            }
        }.bind(this));
        // Compress and sends history to server
    }.bind(this);
    var saveHistory = function (data) {
        // Opens transaction, saves documents and history
        var t = this.db.update('history', 'documents');
        var saveMarker = function (marker) {
            // savesMarker in db
            // $$.log('Saving marker:', marker);
            this.conn.marker = marker;
            manager.updateConnection(this.conn, function (err) {
                if (err) {
                    return finish(err);
                };
                receiveHistory(marker);
            }.bind(this))
            
        }.bind(this);
        var nextItem = function (index) {
            if (index>=data.data.length) {
                // Finish
                if (data.data.length == 0) {
                    // No data = sync done
                    return finish(null);
                };
                return saveMarker(data.data[data.data.length-1].id); // Last history ID
            };
            item = data.data[index];
            $$.log('Save', item);
            var doc = item.doc;
            var updateDoc = function (err) {
                // Modify document
                var opType = '';
                var opDoc = {};
                var onDone = function  (err) {
                    if (err) {
                        return finish(err);
                    };
                    this.onDocumentSyncChange(opType, opDoc);
                    nextItem(index+1);
                }.bind(this);
                if (item.operation == 2) {
                    // Remove document
                    opType = 'remove';
                    $$.log('Remove', item);
                    opDoc = {id: item.doc_id};
                    return this.db.execRequest(t.objectStore('documents').delete(item.doc_id), onDone);
                };
                if (doc) {
                    opType = 'update';
                    opDoc = JSON.parse(doc);
                    $$.log('Update', item, doc);
                    // Have document
                    this.db.execRequest(t.objectStore('documents').put(opDoc), onDone);
                } else {
                    // No action
                    onDone(null);
                }
            }.bind(this);
            this.db.execRequest(t.objectStore('history').get(item.id), function (err, h) {
                if (err) {
                    return finish(err);
                };
                // Existing history item or not?
                if (h) {
                    // Update tstamp
                    h.tstamp = item.tstamp;
                    this.db.execRequest(t.objectStore('history').put(h), updateDoc);
                } else {
                    // Insert new
                    if (item.doc) {
                        delete item.doc;
                    };
                    item.order = this.id(); // This is to make sure we have correct order of future history items
                    this.db.execRequest(t.objectStore('history').add(item), updateDoc);
                }
            }.bind(this));
        }.bind(this);
        if (data.clean) {
            // Cleanup DB
            this.db.execRequest(t.objectStore('documents').clear(), function (err) {
                // Cleared
                if (err) {
                    return finish(err);
                };
                this.db.execRequest(t.objectStore('history').clear(), function (err) {
                    // Cleared
                    if (err) {
                        return finish(err);
                    };
                    nextItem(0);
                }.bind(this));
            }.bind(this));
        } else {
            // Just incremental update
            nextItem(0);
        }
    }.bind(this);
    var receiveHistory = function (from) {
        // Receives history and applies changes to own DB, saves marker
        $$.log('Receiving history from:', from);
        manager.receiveHistory(this.conn, {from: from}, function (err, data) {
            if (err) {
                return finish(err);
            };
            $$.log('Received:', data);
            saveHistory(data);
        }.bind(this));
    }.bind(this);
    prepareOwnHistory(this.conn.marker);
};

DocumentsManager.prototype.id = function() {
    var id = new Date().getTime();
    while (id <= this._id) {
        id = this._id+1;
    }
    this._id = id;
    return id;
};

DocumentsManager.prototype.onPending = function(start) {
    // By default, no action, will be resumed after sync
};

DocumentsManager.prototype.resumePending = function() {
    // Resumes pending operations
    if (this.pending.length == 0) {
        return false;
    };
    this.onPending(false);
    for (var i = 0; i < this.pending.length; i++) {
        var obj = this.pending[i];
        try {
            this[obj.type].apply(this, obj.args);
        } catch (e) {
            $$.log('Error in pending:', e);
        }
    };
    this.pending = [];
};

DocumentsManager.prototype.beforeEdit = function(type, doc, handler) {
    // Checks if it's OK to edit
    // var cb = handler || function () {};
    // if (!this.conn.marker) {
    //     // Not syncronized
    //     cb('Not synchronized');
    //     return false;
    // };
    if (this.insync) {
        // In sync, have to save to pending
        if (this.pending.length == 0) {
            this.onPending(true);
        };
        var obj = {
            type: type,
            args: []
        };
        for (var i = 1; i < arguments.length; i++) {
            obj.args.push(arguments[i]);
        };
        this.pending.push(obj);
        return false;
    };
    return true;
};

DocumentsManager.prototype.startQuery = function() {
    return this.db.fetch('documents').objectStore('documents');
};

DocumentsManager.prototype.list = function(req, handler) {
    var result = [];
    this.db.execRequest(req, function (err, cursor) {
        if (err) {
            return handler(err);
        };
        if (cursor) {
            result.push(cursor.value || cursor);
            if (cursor.continue) {
                return cursor.continue();
            };
        };
        handler(null, result);
    });
};

DocumentsManager.prototype.onChangeChanged = function(changed) {
    // Called when changed modified
};

DocumentsManager.prototype.onAutoSync = function(changed) {
    // Called when changed auto-sync is triggered
};

DocumentsManager.prototype.setChanged = function(changed) {
    if ((this.changed && !changed) || (!this.changed && changed)) {
        this.onChangeChanged(changed);
    };
    this.changed = changed || false;
    if (this.autoSyncID) {
        clearTimeout(this.autoSyncID);
        this.autoSyncID = null;
    };
    if (this.changed && this.autoSyncInterval>0) {
        // Changed and autoSyncInterval is set
        this.autoSyncID = setTimeout(function () {
            if (this.changed && !this.insync && this.autoSyncInterval>0) {
                // Sync still needed
                this.onAutoSync();
            };
        }.bind(this), this.autoSyncInterval*1000);
    };
};

DocumentsManager.prototype.add = function(doc, handler) {
    var cb = handler || function () {};
    if (!this.beforeEdit('add', doc, handler)) {
        return;
    };
    $$.log('Add doc:', doc);
    var t = this.db.update('documents', 'history');
    this.db.execTransaction(t, function (err) {
        // Add done
        $$.log('Add doc finish:', err, doc);
        if (!err) {
            this.setChanged(true);
        };
        cb(err, doc, history);
    }.bind(this));
    try {
        doc.id = this.conn.client+this.id();
        doc.version = doc.id;
        doc.conn = this.conn.code;
        t.objectStore('documents').add(doc);
        var history = {
            id: this.conn.client+this.id(),
            client: this.conn.client,
            version: doc.version,
            operation: 0, // Add
            tstamp: this.id(),
            order: this.id(),
            doc_id: doc.id
        };
        t.objectStore('history').add(history);
    } catch (e) {
        this.db.cancelTransaction(t);
        cb('Error: '+e);
    }
};

DocumentsManager.prototype.update = function(doc, handler) {
    var cb = handler || function () {};
    if (!this.beforeEdit('update', doc, handler)) {
        return;
    };
    $$.log('Update doc:', doc);
    var t = this.db.update('documents', 'history');
    this.db.execTransaction(t, function (err) {
        // Add done
        $$.log('Update doc finish:', err, doc);
        if (!err) {
            this.setChanged(true);
        };
        cb(err, doc, history);
    }.bind(this));
    try {
        var old_version = doc.version;
        doc.version = this.conn.client+this.id();
        t.objectStore('documents').put(doc);
        var history = {
            id: this.conn.client+this.id(),
            client: this.conn.client,
            version: doc.version,
            from_version: old_version,
            operation: 1, // Update
            tstamp: this.id(),
            order: this.id(),
            doc_id: doc.id
        };
        t.objectStore('history').add(history);
    } catch (e) {
        $$.log('Error update:', e);
        this.db.cancelTransaction(t);
        cb('Error: '+e);
    }
};

DocumentsManager.prototype.remove = function(doc, handler) {
    var cb = handler || function () {};
    if (!this.beforeEdit('remove', doc, handler)) {
        return;
    };
    $$.log('Remove doc:', doc);
    var t = this.db.update('documents', 'history');
    this.db.execTransaction(t, function (err) {
        // Add done
        $$.log('Remove doc finish:', err, doc);
        if (!err) {
            this.setChanged(true);
        };
        cb(err, doc, history);
    }.bind(this));
    try {
        var old_version = doc.version;
        t.objectStore('documents').delete(doc.id);
        var history = {
            id: this.conn.client+this.id(),
            client: this.conn.client,
            version: this.conn.client+this.id(),
            from_version: old_version,
            operation: 2, // Remove
            order: this.id(),
            tstamp: this.id(),
            doc_id: doc.id
        };
        t.objectStore('history').add(history);
    } catch (e) {
        this.db.cancelTransaction(t);
        cb('Error: '+e);
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
    var reg = /(.*\/)([a-z0-9]+)\.wiki\.html($|#|\?)/i;
    this.dev = false;
    if (window.location.toString().indexOf('?dev=2') != -1) {
        this.dev = true;
    };
    var m = window.location.toString().match(reg);
    if(!m || m[2] == 'user') {
        var path = window.localStorage['default_conn'];
        if (path) {
            m = path.match(reg);
            if (m) {
                return {url: m[1], code: m[2]};
            }
        };
        var id = window.prompt('Please enter Container URL:');
        if (!id) {
            return null;
        };
        m = id.match(reg);
        if (m) {
            return {url: m[1], code: m[2], path: id};
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
                $$.log('Rest error:', req);
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

SitesManager.prototype.getTokens = function(conn, handler) {
    this.rest(conn, 'rest/site/tokens/get', {token: conn.token}, handler);
};

SitesManager.prototype.removeToken = function(conn, code, handler) {
    this.rest(conn, 'rest/site/tokens/remove', {code: code, token: conn.token}, handler);
};

SitesManager.prototype.approveToken = function(conn, code, handler) {
    this.rest(conn, 'rest/site/tokens/approve', {code: code, token: conn.token}, handler);
};

SitesManager.prototype.newSite = function(conn, code, handler) {
    this.rest(conn, 'rest/site/create', {code: code}, handler);
};

SitesManager.prototype.newName = function(conn, code, handler) {
    this.rest(conn, 'rest/name/create', {code: code}, handler);
};

SitesManager.prototype.sendHistory = function(conn, data, handler) {
    data.token = conn.token;
    this.rest(conn, 'rest/in', data, handler);
};

SitesManager.prototype.receiveHistory = function(conn, ctx, handler) {
    ctx.token = conn.token;
    this.rest(conn, 'rest/out', ctx, handler);
};

SitesManager.prototype.ping = function(conn, marker, handler) {
    var data = {
        token: conn.token,
        from: marker || ''
    };
    this.rest(conn, 'rest/ping', data, handler);
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

SitesManager.prototype.updateConnection = function(conn, handler) {
    var t = this.db.update('connections');
    this.db.execTransaction(t, handler);
    try {
        t.objectStore('connections').put(conn);
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
                var newData = {
                    code: conn.code,
                    url: conn.url,
                    managed: true,
                    token: data.token,
                    client: data.client
                };
                var addConnectionDone = function (err) {
                    $$.log('_addConnection', err);
                    if (!err && conn.path) {
                        // Created, but user entrered URL
                        window.localStorage['default_conn'] = conn.path;
                    };
                    handler(err, newData);
                }.bind(this);
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
                        newData.token = data.token;
                        newData.client = data.client;
                        this._addConnection(newData, addConnectionDone);
                        // Add
                    }.bind(this));
                } else {
                    // Need new token
                    this.newName(conn, conn.code, function (err, data) {
                        $$.log('New name:', err, data);
                        if (err) {
                            return handler(err);
                        };
                        newData.token = data.token;
                        newData.client = data.client;
                        this._addConnection(newData, addConnectionDone);
                        // Add
                    }.bind(this));
                }
            }.bind(this));
        } else {
            // Exist
            return handler(null, result);
        }
    }.bind(this));
};

var AppCacheManager = function (handler) {
    if (!window.applicationCache) {
        $$.log('No applicationCache found');
        return;
    };
//    $$.log('applicationCache:', window.applicationCache);
    window.applicationCache.addEventListener('noupdate', function (evt) {
        $$.log('No update actually');
        handler(null, false);
    }.bind(this));
    window.applicationCache.addEventListener('cached', function (evt) {
        $$.log('Application cached first time');
        handler(null, false);
    }.bind(this));
    window.applicationCache.addEventListener('updateready', function (evt) {
        $$.log('Update is ready');
        window.applicationCache.swapCache();
        handler(null, true);
    }.bind(this));
    window.applicationCache.addEventListener('error', function (evt) {
        $$.log('Failed to download update', evt);
        handler('Error caching application');
    }.bind(this));
};

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