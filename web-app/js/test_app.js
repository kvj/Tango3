document.addEventListener('DOMContentLoaded', function (evt) {
    $$.log('Loaded');
    var app = new App();
});

$$.log('Load', document);

var App = function () {
    this.manager = new SitesManager(function(err) {
        if (err) {
            return $$.log('Error:', err);
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
            this.initConnection(conn);
        }.bind(this));
        // manager.siteExist(id, id.code, function (err, data) {
        //     $$.log('Site:', err, data);
        // }.bind(this));
    }.bind(this));
};

App.prototype.initConnection = function(conn) {
    this.db = new DocumentsManager(conn, function (err) {
        if (err) {
            this.showError(err);
            return;
        };
        $$.log('Ready to show UI');
        this.showUI();
    }.bind(this), {
        version: 1,
        upgrade: function (db, t, version) {
            switch (version) {
            case 1:
                var documents = t.objectStore('documents');
                documents.createIndex('title', 'title');
                return;
            }
        }.bind(this)
    });
};

App.prototype.showError = function(message) {
    window.alert('Error was: '+message);
};

App.prototype.showUI = function() {
    var div = document.createElement('div');
    document.body.appendChild(div);
    var table = document.createElement('table');
    div.appendChild(table);
    this.tbody = document.createElement('tbody');
    table.appendChild(this.tbody);
    var addText = document.createElement('input');
    addText.setAttribute('type', 'text');
    div.appendChild(addText);
    var addButton = document.createElement('input');
    addButton.setAttribute('type', 'button');
    addButton.setAttribute('value', 'Add');
    addButton.addEventListener('click', function  (evt) {
        var text = addText.value;
        if (text) {
            $$.log('Add text', text);
            this.db.add({title: text}, function (err, doc) {
                $$.log('Added:', err, doc);
                if (err) {
                    return this.showError(err);
                };
                this.showItems();
            }.bind(this));
        };
    }.bind(this));
    div.appendChild(addButton);
    var syncButton = document.createElement('input');
    syncButton.setAttribute('type', 'button');
    syncButton.setAttribute('value', 'Sync');
    syncButton.addEventListener('click', function  (evt) {
        this.db.sync(this.manager, function (err) {
            
        });
    }.bind(this));
    div.appendChild(syncButton);
    this.showItems();
};

App.prototype.showItems = function() {
    var store = this.db.startQuery();
    this.db.list(store.openCursor(), function (err, result) {
        $$.log('Items', err, result);
        if (err) {
            return this.showError(err);
        };
        var nl = this.tbody.childNodes;
        while (nl.length>0) {
            this.tbody.removeChild(nl[0]);
        };
        var editItem = function (doc, tr) {
            var td;
            td = document.createElement('td');
            tr.appendChild(td);
            var editText = document.createElement('input');
            editText.setAttribute('type', 'text');
            editText.value = doc.title;
            td.appendChild(editText);
            td = document.createElement('td');
            tr.appendChild(td);
            var editButton = document.createElement('input');
            editButton.setAttribute('type', 'button');
            editButton.setAttribute('value', 'Edit');
            editButton.addEventListener('click', function  (evt) {
                var text = editText.value;
                $$.log('Edit text', text);
                doc.title = text;
                this.db.update(doc, function (err, doc) {
                    $$.log('Updated:', err, doc);
                    if (err) {
                        return this.showError(err);
                    };
                    this.showItems();
                }.bind(this));
            }.bind(this));
            td.appendChild(editButton);
            td = document.createElement('td');
            tr.appendChild(td);
            var removeButton = document.createElement('input');
            removeButton.setAttribute('type', 'button');
            removeButton.setAttribute('value', 'Remove');
            removeButton.addEventListener('click', function  (evt) {
                $$.log('Remove', doc);
                this.db.remove(doc, function (err, doc) {
                    $$.log('Removed:', err, doc);
                    if (err) {
                        return this.showError(err);
                    };
                    this.showItems();
                }.bind(this));
            }.bind(this));
            td.appendChild(removeButton);
        }.bind(this);
        for (var i = 0; i < result.length; i++) {
            var doc = result[i];
            var tr = document.createElement('tr');
            this.tbody.appendChild(tr);
            editItem(doc, tr);
        };
    }.bind(this));
};