(function() {
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
    var Item = function () {
    };

    Item.prototype.unixToDate = function(text) {
        if (!text) return null;
        try {
            var unix = parseInt(text, 10);
            if (unix > 0) {
                return new Date(unix);
            }
        } catch (e) {
        }
        return null;
    }

    Item.prototype.init = function(element, storage) {
        // this.storage = storage;
        this.origin = element;
        this.title = element.title;
        this.tags = element.tags || [];
        this.text = element.text;
        this.file = element.file || null;
        this.created = element.created;
        this.edited = element.updated;
    };
    Item.prototype._init = function(element, storage) {
        this.storage = storage;
        this.title = element.getAttribute('data-title');
        var tagsStr = element.getAttribute('data-tags');
        this.setTags(tagsStr);
        var text = '';
        var nl = element.childNodes;
        for (var i = 0; i<nl.length; i++) {
            var text = nl[i].textContent;
        }
        this.text = text;
        this.file = element.getAttribute('data-file');
        this.created = this.unixToDate(element.getAttribute('data-created'));
        this.edited = this.unixToDate(element.getAttribute('data-edited'));
    };
    Item.prototype.setTags = function (tagsStr) {
        this.tags = this.storage.parseTags(tagsStr);
    };
    Item.prototype.splitText = function (text, delim, options) {
        if (!text || !delim) {
            return [];
        };
        var from = 0;
        var result = [];
        while (from<text.length) {
            while (text.indexOf(delim, from) == from) {
                // Skip delim at begin
                from += delim.length;
            };
            var end = text.indexOf(delim, from); // Next
            if (end == -1) {
                end = text.length;
            };
            if (options && options.onnext) {
                end = options.onnext(from, end);
            };
            if (from < end) {
                var part = text.substring(from, end);
                if (options && options.onvalue) {
                    part = options.onvalue(part);
                }
                result.push(part);
            }
            from = end;
        };
        return result;
    };
    Item.prototype.skipPair = function (text, start, pairBegin, pairEnd) {
        var from = start + pairBegin.length;
        var deep = 1;
        while (deep>0) {
            var beginPos = text.indexOf(pairBegin, from);
            var endPos = text.indexOf(pairEnd, from);
            if (beginPos == -1 && endPos == -1) {
                // Nothing found - error
                return -1;
            };
            if (beginPos != -1) {
                // Have one more begin
                if (endPos == -1 || endPos>beginPos) {
                    // begin before end
                    from = beginPos + pairBegin.length;
                    deep++;
                    continue;
                }
            };
            if (endPos != -1) {
                if (beginPos == -1 || endPos<beginPos) {
                    // end before begin
                    from = endPos + pairEnd.length;
                    deep--;
                    if (deep == 0) {
                        return from;
                    }
                    continue;
                }
            };
        };
        return -1;
    };
    var Storage = function() {
    };
    Storage.prototype.eventEmitter = EventEmitter;
    Storage.prototype.itemPrototype = Item;
    Storage.prototype.log = function() {
        if (!this.dev) {
            return;
        }
        if (!window.console) { // No console
            return;
        };
        console.log.apply(console, arguments);
    };
    Storage.prototype.parseTags = function (tagsStr) {
        if (!tagsStr) {
            return [];
        };
        return Item.prototype.splitText(tagsStr, ' ', {
            onnext: function (from, end) {
                if (tagsStr.substr(from, 1) == '[') {
                    // Multiword tag
                    var endTag = Item.prototype.skipPair(tagsStr, from, '[', ']');
                    if (-1 != endTag) {
                        return endTag;
                    }
                }
                return end;
            }.bind(this),
            onvalue: function (text) {
                while (text.charAt(0) == '[' && text.charAt(text.length-1) == ']' && -1 == text.indexOf(' ')) {
                    text = text.substr(1, text.length-2);
                }
                return text;
            }
        });
    };
    var head = document.getElementsByTagName('head')[0];
    Storage.prototype.init = function() {
        this._init();
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
                this.initConnection(conn, function (err, db) {
                    // Done
                    // this._import(db, function () {
                    //     // body...
                    // });
                    this.start();
                }.bind(this));
            }.bind(this));
        }.bind(this));
    };
    Storage.prototype._import = function(db, handler) {
        // Loads all documents
        var items = this._find({});
        $$.log('Items to import:', items, db, new Date());
        iterateOver(items, function (item, cb) {
            item.conn = db.conn.code;
            item.created = item.created? item.created.getTime(): new Date().getTime();
            item.updated = item.edited? item.edited.getTime(): new Date().getTime();
            delete item.storage;
            delete item.edited;
            if (!item.file) {
                delete item.file;
            };
            db.add(item, function (err) {
                cb(err);
            });
        }.bind(this), function (err) {
            $$.log('Import done:', new Date());
            // body...
        }.bind(this));
    };
    Storage.prototype.initConnection = function(conn, handler) {
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
            version: 2,
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
                }
            }.bind(this)
        });
    };

    Storage.prototype.showError = function(message) {
        window.alert('Error was: '+message);
    };
    Storage.prototype._init = function() {
        this.skipPair = Item.prototype.skipPair;
        document.body.onbeforeunload = function(event) {
            return this.unload(event);
        }.bind(this);
        this.events = new this.eventEmitter();
        this.dev = true;
        this.dirty = false;
        if (window.location.search && window.location.search.indexOf('dev=1') != -1) {
            this.dev = true;
        }
        this.pluginsLoading = 0;
        this.pluginsLoaded = {};
        this.storageEl = document.querySelectorAll('storage')[0]; // First storage
    };
    Storage.prototype.start = function() {
        // Loads systemPlugin and systemStyle
        this.find({
            tags: 'systemPlugin'
        }, function(item) {
            $$.log('Plugin:', item.title);
            this.pluginsLoading++;
            var el = document.createElement('script');
            if (item.file && this.dev) {
                // Use src
                el.setAttribute('src', 'dev/'+item.file);
            } else { // Default
                el.appendChild(document.createTextNode('(function($$) {'+item.text+'}).call(this, $$);'));
            }
            head.appendChild(el);
        }.bind(this));
        setTimeout(function() {
            if (this.pluginsLoading>0) {
                alert('Error loading plugins, taking too long');
            }
        }.bind(this), 15000);
        this.find({
            tags: 'systemStyle'
        }, function(item) {
//                        this.log('Style:', item.title, item.text);
            var el;
            if (item.file && this.dev) {
                el = document.createElement('link');
                el.setAttribute('rel', 'stylesheet');
                el.setAttribute('href', 'dev/'+item.file);
            } else {
                el = document.createElement('style');
                el.setAttribute('type', 'text/css');
                el.appendChild(document.createTextNode(item.text));
            };
            head.appendChild(el);
        }.bind(this));
    };
    Storage.prototype.pluginLoaded = function(name) {
        setTimeout(function() {
            if (name && !this.pluginLoaded[name]) {
                this.pluginLoaded[name] = true;
                this.pluginsLoading--;
                if (this.pluginsLoading == 0) {
                    this.events.emit('start');
                }
            };
        }.bind(this), 0);
    };
    Storage.prototype.unload = function(event) {
        if(this.dirty) {
            return 'There are unsaved changed. Close page?';
        }
        return null;
    }
    Storage.prototype.setDirty = function (dirty) {
        if (!this.dirty && dirty) {
            // Became dirty
            this.dirty = true;
            this.events.emit('dirty');
        } else if (this.dirty && !dirty) {
            // Saved
            this.dirty = false;
            this.events.emit('saved');
        }
    }
    
    Storage.prototype.find = function(config, each, handler) {
        var cb = handler || function () {};
        var result = [];
        var tags = config.tags || [];
        if (typeof(tags) == 'string') {
            tags = [tags];
        }
        var ondb = function (db, handler) {
            // $$.log('Fetch from', db);
            var t = db.startQuery('documents');
            var req = null;
            if (config.title) {
                req = t.index('title').openCursor(config.title);
            } else {
                if (tags.length>0) {
                    req = t.index('tags').openCursor(tags[0]);
                } else {
                    req = t.openCursor();
                }
            }
            db.list(req, function (err, nl) {
                // $$.log('Fetch result:', err, nl, config, each);
                if (err) {
                    return handler(err);
                };
                for (var i = 0; i<nl.length; i++) {
                    var item = new this.itemPrototype();
                    if (config.filter) {
                        if (!config.filter(nl[i])) {
                            continue;
                        }
                    }
                    item.init(nl[i], this);
                    // $$.log('Item', item);
                    var skip = false;
                    for (var j = 0; j<tags.length; j++) {
                        if (item.tags.indexOf(tags[j]) == -1) {
                            // Not found tag
                            // $$.log('Tag not found:', tags[j]);
                            skip = true;
                            continue;
                        }
                    };
                    if (config.filterOut && !skip) {
                        if (!config.filterOut(item, nl[i])) {
                            continue;
                        }
                    }
                    if (skip) {
                        continue;
                    };
                    if (each && !config.sort) { // Each mode
                        each(item, nl[i], i, nl.length);
                    } else { // Put into result
                        result.push(item);
                    }
                    if (config.sort) {
                        result = result.sort(config.sort);
                    }
                };
                handler(null);
            }.bind(this));
        }.bind(this);
        iterateOver(this.dbs, ondb, function (err) {
            if (err) {
                return cb([]);
            };
            cb(result);
        });
    };

    Storage.prototype._find = function(config, each) {
        var selector = 'item';
        if (config.title) {
            // Filter by title
            selector += '[data-title="'+config.title+'"]'
        };
        var tags = [];
        if (config.tags) {
            tags = config.tags;
            if (typeof(tags) == 'string') {
                tags = [tags];
            }
            for (var i = 0; i<tags.length; i++) {
                var tag = tags[i].trim();
                if (tag.indexOf(' ')>0 && tag.charAt(0) != '[') {
                    tag = '['+tag+']';
                }
                selector += '[data-tags*="'+tag+'"]';
            }
        }
//                    this.log('Search:', selector);
        var nl = this.storageEl.querySelectorAll(selector);
//                    this.log('Found:', nl);
        var result = [];
        for (var i = 0; i<nl.length; i++) {
            var item = new this.itemPrototype();
            if (config.filter) {
                if (!config.filter(nl[i])) {
                    continue;
                }
            }
            item._init(nl[i], this);
            var skip = false;
            for (var j = 0; j<tags.length; j++) {
                if (item.tags.indexOf(tags[j]) == -1) {
                    // Not found tag
                    skip = true;
                    continue;
                }
            };
            if (config.filterOut && !skip) {
                if (!config.filterOut(item, nl[i])) {
                    continue;
                }
            }
            if (skip) {
                continue;
            };
            if (each && !config.sort) { // Each mode
                each(item, nl[i], i, nl.length);
            } else { // Put into result
                result.push(item);
            }
            if (config.sort) {
                result = result.sort(config.sort);
            }
        };
        return result;
    };
    Storage.prototype.remove = function(title) {
        this.find({title: title}, function(_item, _el) {
            this.storageEl.removeChild(_el);
            this.events.emit('change', {remove: true, title: title, item: _item});
        }.bind(this));
        this.setDirty(true);
    };
    Storage.prototype.update = function(title, newtitle, content, tags) {
//                    this.log('Update', title, newtitle, content, tags, typeof(newtitle), typeof(content), typeof(tags));
        var err = function (error) {
            this.events.emit('updated', {err: error});
            return error;
        }.bind(this);
        if (!title) {
            // No title, couldnt find
            return err('No title');
        }
        var event = {
            title: title
        };
        var el = null;
        var item = null;
        this.find({title: title}, function(_item, _el) {
            el = _el;
            item = _item;
        });
        if (!item || !el) {
            // Not found, create new
            if (!newtitle || !newtitle.trim()) {
                return err('No new title');
            };
            this.find({title: newtitle}, function(_item, _el) {
                el = _el;
                item = _item;
            });

            if (el) {
                if(!confirm('Item with same name exist. Overwrite?')) {
                    return err('Cancelled by user');
                }
            } else {
                event.add = true;
                el = document.createElement('item');
                el.setAttribute('data-created', new Date().getTime());
                this.storageEl.appendChild(el);
                el.setAttribute('data-title', title);
                item = new this.itemPrototype();
                item.init(el, this);
            }
        };
        if (!event.add) {
            event.edit = true;
            event.tags = item.tags;
        };
        // Update
        if (newtitle && newtitle.trim()) {
            if (newtitle != title) {
                var oldEl = null;
                this.find({title: newtitle}, function(_item, _el) {
                    oldEl = _el;
                });
                if (oldEl) {
                    if(!confirm('Item with same name exist. Overwrite?')) {
                        return err('Cancelled by user');
                    } else {
                        // Remove oldEl
                        oldEl.parentNode.removeChild(oldEl);
                    }
                }
            }
            el.setAttribute('data-title', newtitle);
            item.title = newtitle;
        };
        el.setAttribute('data-edited', new Date().getTime());
        if (typeof(content) == 'string') {
            el.innerHTML = '';
//                        $$.log('Create content: ', document);
            el.appendChild(document.createComment(content));
            item.text = content;
        };
        if (typeof(tags) == 'string') {
            item.setTags(tags);
            el.setAttribute('data-tags', item.tags.join(' '));
        } else {
            if (Array.isArray(tags)) {
                item.tags = tags;
                el.setAttribute('data-tags', item.tags.join(' '));
            }
        }
        event.item = item;
        this.events.emit('change', event);
        this.setDirty(true);
        return err();
    };
    Storage.prototype.save = function (config, handler) {
        if (!window.tango1SaveConfig) {
            if (handler) handler ('Not supported');
            return;
        }
        var cfg = window.tango1SaveConfig;
        var ns = 'http://www.w3.org/1999/xhtml';
        var doc = document.implementation.createDocument(ns, "html", document.implementation.createDocumentType('html', null, null));
        var head = doc.createElementNS(ns, 'head');
        doc.documentElement.appendChild(head);
        var nl = document.head.querySelectorAll('*[data-marker="system"]');
        for (var i = 0; i<nl.length; i++) {
            var n;
            if ('SCRIPT' == nl[i].nodeName) {
                n = nl[i].cloneNode(false);
                var text = nl[i].textContent;
                text = text.substring(4, text.length-3); // Remove comments
//                            $$.log('Saving string:', text);
                n.appendChild(doc.createComment(text));
            } else {
                n = nl[i].cloneNode(true);
            }
            head.appendChild(n);
        };
        var body = document.body.cloneNode(false);
        doc.documentElement.appendChild(body);
        var storage = doc.createElementNS(ns, 'storage');
        doc.documentElement.appendChild(storage);
        nl = this.storageEl.childNodes;
        for (var i = 0; i<nl.length; i++) {
            if ('ITEM' != nl[i].nodeName) {
                continue;
            }
            var n = nl[i].cloneNode(true);
            storage.appendChild(n);
        };
        var output = doc;
        if (!cfg.sendDOM) {
            var oSerializer = new XMLSerializer();
            output = '';
            var stream = {
                close: function() {
                },
                flush: function() {
                },
                write: function(string, count) {
                  $$.log("Write"+string+"\n "+count);
                  output += string;
                }
            };
            oSerializer.serializeToStream(doc, stream, 'utf-8');
        };
        var resultHandler = function(event) {
        }.bind(this);
        if (cfg.resultEvent) {
            window.addEventListener(cfg.resultEvent, resultHandler, false);
        };
        if (cfg.event) {
            var resultHandler = function(event) {
                window.removeEventListener(cfg.resultEvent, resultHandler);
                if (!event.detail.err) {
                    this.setDirty(false);
                }
                if (handler) handler (event.detail.err, event.detail.message);
            }.bind(this);
            window.addEventListener(cfg.resultEvent, resultHandler);
            var evt = new CustomEvent(cfg.event, {detail: {dom: output, dev: this.dev}});
            // evt.dom = output;
//            $$.log('Sending', cfg, evt.dom, evt, window.location);
            window.dispatchEvent(evt);
        };
    };
    var $$ = new Storage();
    window.$$ = $$;
}).call(this);