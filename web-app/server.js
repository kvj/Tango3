var PG_HOST_VAR = 'OPENSHIFT_DB_HOST';
var PG_PORT_VAR = 'OPENSHIFT_DB_PORT';
var PG_USER_VAR = 'OPENSHIFT_DB_USERNAME';
var PG_PASS_VAR = 'OPENSHIFT_DB_PASSWORD';
var PG_APPL_VAR = 'OPENSHIFT_APP_NAME';

var PG_HOST_DEF = '127.0.0.1';
var PG_PORT_DEF = '5432';
var PG_USER_DEF = 'tango2';
var PG_PASS_DEF = 'tango2';
var PG_APPL_DEF = 'tango2';
var SERVER_PORT_DEF = 3000;


var express = require('express');
var pg = require('pg');
var common = require('./js/common');
var cors = require('cors');
var fs = require('fs');
var App = function() {
    // Math.randomize(new Date().getTime());
    this._id = 0;
    this.initDB(function (err) {
        if (err) {
            $$.log('Error:', err);
            return;
        };
        this.initRest();
    }.bind(this));
};

App.prototype.id = function() {
    var id = new Date().getTime();
    while (id <= this._id) {
        id = this._id+1;
    };
    this._id = id;
    return id;
};

App.prototype.initRest = function() {
    this.restPrefix = '/rest';
    this.app = express();
    this.app.use(express.json());
    this.app.use('/js', express.static(__dirname + '/js'));
    this.app.use('/lib', express.static(__dirname + '/lib'));
    this.app.use('/dev', express.static(__dirname + '/dev'));
    this.app.use(cors({
        origin: true
    }));
    this.app.use(this.app.router);
    this.rest('/site/create', this.restNewApplication.bind(this));
    this.rest('/site/get', this.restGetApplication.bind(this));
    this.rest('/name/create', this.restCreateName.bind(this));
    this.rest('/in', this.restIncomingData.bind(this), {token: true});
    this.rest('/out', this.restOutgoingData.bind(this), {token: true});
    this.rest('/ping', this.restPing.bind(this), {token: true});
    this.rest('/site/tokens/get', this.restGetTokens.bind(this), {token: true});
    this.rest('/site/tokens/status', this.restTokenStatus.bind(this), {token: true});
    this.rest('/site/tokens/remove', this.restRemoveToken.bind(this), {token: true});
    this.app.get('/:code.wiki.html', this.htmlLoadApplication.bind(this));
    this.app.get('/:code.cache.manifest', this.htmlGetCache.bind(this));
    this.app.get('/', this.htmlGenerateApplication.bind(this));
    var port = SERVER_PORT_DEF;
    if (process.argv.length>2) {
        port = parseInt(process.argv[2]) || SERVER_PORT_DEF;
    };
    this.app.listen(port);
    this.log('Server started on', port);
    this.cacheVersion = 0;
    this.analyticsCode = '';
    this.loadAppVersion();
    this.loadFile('analytics.txt', function (err, data) {
        if (!err) {
            this.analyticsCode = data;
        };
    }.bind(this));
};

App.prototype.loadFile = function(name, handler) {
    fs.readFile(name, {
        encoding: 'utf8'
    }, function (err, data) {
        if (err) {
            this.log('Error loading file:', name, err);
            handler(err);
        } else {
            handler(null, data.toString().trim());
        }
    }.bind(this));
};

App.prototype.loadAppVersion = function() {
    this.loadFile('app.version.txt', function (err, data) {
        if (!err) {
            this.cacheVersion = data;
            this.log('App version loaded:', this.cacheVersion);
        };
    }.bind(this));
};

App.prototype.random = function (len) {
    var result = '';
    var pattern = 'qwertyuiopasdfghjklzxcvbnm1234567890';
    for (var i = 0; i < len; i++) {
        result += pattern.charAt(Math.floor(Math.random()*pattern.length));
    };
    return result;
};

App.prototype.initDB = function(handler) {
    var user = process.env[PG_USER_VAR] || PG_USER_DEF;
    var pass = process.env[PG_PASS_VAR] || PG_PASS_DEF;
    var host = process.env[PG_HOST_VAR] || PG_HOST_DEF;
    var port = process.env[PG_PORT_VAR] || PG_PORT_DEF;
    var appl = process.env[PG_APPL_VAR] || PG_APPL_DEF;
    this.dbUrl = 'postgres://'+user+':'+pass+'@'+host+':'+port+'/'+appl;
    this.db(function (err, client, done) {
        if (err) {
            return handler(err);
        };
        client.query('select id from history order by id desc limit 1', function (err, result) {
            done();
            if (err) {
                return handler(err);
            };
            if (result.rows.length>0) {
                this._id = result.rows[0].id;
                this.log('Loaded previous ID:', this._id);
            };
            handler(null);
        }.bind(this));
    }.bind(this));
};

App.prototype.db = function(handler) {
    pg.connect(this.dbUrl, function (err, client, done) {
        // $$.log('Received connection', err);
        handler(err, client, done);
    });
};

App.prototype.rest = function (path, handler, config) {
    this.app.post(this.restPrefix+path, function (req, res) {
        // this.log('Incoming rest:', path, req.body);
        var sendOutput = function (obj) {
            res.send(obj);
        };
        var checkToken = function (handler) {
            if (!config || !config.token) {
                return handler(null, {});
            };
            this.db(function (err, client, done) {
                if (err) {
                    return handler('DB error');
                };
                client.query('select id, token, status, client, site_id from tokens where token=$1', [req.body.token], function (err, result) {
                    if (err || result.rows.length == 0) {
                        // Not found
                        done();
                        return handler('Token not found');
                    };
                    var row = result.rows[0];
                    if (row.status != 1) {
                        // Not approved
                        done();
                        return handler('Account disabled');
                    };
                    var info = {
                        token: row.token,
                        token_id: row.id,
                        status: row.status,
                        client: row.client,
                        site_id: row.site_id
                    };
                    // TODO: Check token status
                    client.query('select code from sites where id=$1', [row.site_id], function (err, result) {
                        done();
                        if (err || result.rows.length == 0) {
                            // Not found
                            return handler('Container not found');
                        };
                        info.code = result.rows[0].code;
                        handler(null, info);
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        }.bind(this);
        checkToken(function (err, info) {
            if (err) {
                return sendOutput({error: err});
            };
            try {
                handler(req.body, function (err, output) {
                    if (err) {
                        output = {error: err};
                    };
                    sendOutput(output);
                }, info, req, res);
            } catch (e) {
                this.log('Rest error:', e);
                sendOutput({error: 'Error: '+e});
            }
        }.bind(this));
    }.bind(this));
};

App.prototype.log = function() {
    console.log.apply(console, arguments);
};

App.prototype.htmlLoadApplication = function(req, res) {
    $$.log('Load application:', req.params.code);
    this.loadFile('tango4.tmpl.html', function (err, data) {
        if (err) {
            this.log('Error getting html template:', err);
            res.send(500, 'HTML template not found');
            return;
        };
        var tmpl = data;
        res.set('Content-Type', 'text/html');
        var dev = req.url.indexOf('?dev') != -1;
        res.send(tmpl.replace('#{manifest}', dev? '': ' manifest="'+req.params.code+'.cache.manifest"').replace('#{analytics}', dev? '': this.analyticsCode));
    }.bind(this));
};

App.prototype.htmlGetCache = function(req, res) {
    // Some text
    var files = [
        'js/common.js',
        'lib/layout.js',
        'js/tango4.css',
        'js/tango2.js',
        'js/tango4.js'
    ];
    var noCacheFiles = [
    ];
    this.log('Getting cache:');
    var outp = 'CACHE MANIFEST\n';
    outp += '# rev '+this.cacheVersion+'\n';
    outp += 'CACHE:\n';
    outp += ''+req.params.code+'.wiki.html\n';
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        outp += f+'\n';
    };
    if (noCacheFiles.length>0) {
        outp += 'NETWORK:\n';
        for (var i = 0; i < noCacheFiles.length; i++) {
            var f = noCacheFiles[i];
            outp += f+'\n';
        };
    };
    outp += 'NETWORK:\n*\n';
    res.set({
        'Content-Type': 'text/cache-manifest',
        'ETag': this.cacheVersion
    });
    res.send(outp);
};

App.prototype.htmlGenerateApplication = function(req, res) {
    var id = this.random(8);
    this.loadFile('index.tmpl.html', function (err, data) {
        if (err) {
            this.log('Error getting html template:', err);
            res.send(500, 'HTML template not found');
            return;
        };
        var tmpl = data;
        res.set('Content-Type', 'text/html');
        var dev = req.url.indexOf('?dev') != -1;
        res.send(tmpl.replace(/\#\{code\}/g, id).replace('#{analytics}', dev? '': this.analyticsCode));
    }.bind(this));
};

App.prototype.restOutgoingData = function(ctx, handler, info) {
    this.db(function (err, client, done) {
        if (err) {
            return handler('DB error');
        };
        var res = {
            clean: false,
            data: []
        };
        var updateToken = function () {
            if (!info.token) {
                // No token - public access
                return done();
            };
            client.query('update tokens set accessed=$1 where id=$2', [new Date().getTime(), info.token_id], function (err) {
                if (err) {
                    this.log('Error updating token access time:', err);
                };
                done();
            }.bind(this));
        }.bind(this);
        client.query('select id from history where history_id=$1', [ctx.from || null], function (err, result) {
            if (err) {
                done();
                return handler('DB error');
            };
            // Check, was marker found or not
            var marker = 0;
            if (result.rows.length>0) {
                // Found
                marker = result.rows[0].id;
            } else {
                // Not found - from the begin
                res.clean = true;
            };
            // this.log('Sending history from:', marker, result);
            client.query('select client, operation, document_id, history_id, id, version, from_version, created from history where id>$1 and site_id=$2 order by id limit $3', [marker, info.site_id, 200], function (err, result) {
                if (err) {
                    done();
                    return handler('DB error');
                };
                var history = [];
                for (var i = 0; i < result.rows.length; i++) {
                    var row = result.rows[i];
                    history.push({
                        client: row.client,
                        doc_id: row.document_id,
                        id: row.history_id,
                        operation: row.operation,
                        tstamp: row.created,
                        version: row.version,
                        from_version: row.from_version
                    });
                };
                var conf = {max: 50000};
                if (!res.clean) {
                    // Send only version of other clients
                    conf.client = info.client;
                };
                common.compressHistory(history, conf, {
                    document: function (id, handler) {
                        client.query('select body from documents where document_id=$1', [id], function (err, result) {
                            if (err) {
                                return handler(err);
                            };
                            if (result.rows.length>0) {
                                // Found
                                return handler(null, result.rows[0].body);
                            };
                            return handler();
                        }.bind(this));
                    }.bind(this)
                }, function (err, result) {
                    if (err) {
                        done();
                        return handler(err);
                    };
                    res.data = result;
                    handler(null, res);
                    updateToken();
                }.bind(this));
            }.bind(this));
        }.bind(this));
    }.bind(this));
};

App.prototype.restPing = function(ctx, handler, info) {
    this.db(function (err, client, done) {
        if (err) {
            return handler('DB error');
        };
        client.query('select id from history where history_id=$1', [ctx.from || null], function (err, result) {
            if (err) {
                done();
                return handler('DB error');
            };
            // Check, was marker found or not
            var marker = 0;
            if (result.rows.length>0) {
                // Found
                marker = result.rows[0].id;
            } else {
                // Not found - from the begin
                done();
                return handler(null, {data: true});
            };
            client.query('select client, operation, document_id, history_id, id, version, from_version, created from history where id>$1 and site_id=$2 order by id limit $3', [marker, info.site_id, 1], function (err, result) {
                done();
                if (err) {
                    return handler('DB error');
                };
                if (result.rows.length>0) {
                    // Found
                    return handler(null, {data: true});
                } else {
                    // Not found - from the begin
                    return handler(null, {data: false});
                };
            }.bind(this));
        }.bind(this));
    }.bind(this));
};

App.prototype.restGetTokens = function(ctx, handler, info) {
    this.db(function (err, client, done) {
        if (err) {
            return handler('DB error');
        };
        client.query('select token, created, status, owner, accessed, client from tokens where site_id=$1 order by created', [info.site_id], function (err, result) {
            done();
            if (err) {
                return handler('DB error');
            };
            var json = {data: []};
            for (var i = 0; i < result.rows.length; i++) {
                var row = result.rows[i];
                json.data.push({
                    token: row.token,
                    created: row.created,
                    status: row.status,
                    owner: row.owner,
                    accessed: row.accessed,
                    client: row.client
                });
            };
            return handler(null, json);
        }.bind(this));
    }.bind(this));
};

// Changes token status
App.prototype.restTokenStatus = function(ctx, handler, info) {
    if (info.token == ctx.code && !ctx.status) {
        return handler('Denied to disable own token');
    };
    this.db(function (err, client, done) {
        if (err) {
            return handler('DB error');
        };
        client.query('update tokens set status=$1 where site_id=$2 and token=$3', [ctx.status || 0, info.site_id, ctx.code], function (err, result) {
            done();
            if (err) {
                return handler('DB error');
            };
            return handler(null, {});
        }.bind(this));
    }.bind(this));
};

App.prototype.restRemoveToken = function(ctx, handler, info) {
    this.db(function (err, client, done) {
        if (err) {
            return handler('DB error');
        };
        client.query('delete from tokens where site_id=$1 and token=$2', [info.site_id, ctx.code], function (err, result) {
            done();
            if (err) {
                return handler('DB error');
            };
            return handler(null, {});
        }.bind(this));
    }.bind(this));
};

App.prototype.restIncomingData = function(data, handler, info) {
    // this.log('Incoming data:', data, info);
    this.db(function (err, client, done) {
        if (err) {
            return handler('DB error');
        };
        var insertHistory = function (item, index) {
            // body...
            client.query('insert into history (id, site_id, client, created, operation, document_id, version, from_version, history_id) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [this.id(), info.site_id, item.client, new Date().getTime(), item.operation, item.doc_id, item.version, item.from_version, item.id], function (err) {
                if (err) {
                    done();
                    this.log('Failed to insert history', err);
                    return handler('DB error');
                };
                // Inserted
                processItem(index+1);
            }.bind(this));
        }.bind(this);
        var processItem = function (index) {
            if (index>=data.data.length) {
                done();
                return handler(null, {});
            };
            var item = data.data[index];
            // this.log('processItem', item);
            var documentOperation = function () {
                var query = '';
                var args = [];
                if (0 == item.operation) {
                    // Insert
                    query = 'insert into documents (id, document_id, site_id, version, status, created, updated) values ($1, $2, $3, $4, $5, $6, $7)';
                    args = [this.id(), item.doc_id, info.site_id, item.version, 0, new Date().getTime(), new Date().getTime()];
                };
                if (1 == item.operation) {
                    query = 'update documents set version=$1, updated=$2 where document_id=$3';
                    args = [item.version, new Date().getTime(), item.doc_id];
                };
                if (2 == item.operation) {
                    // Delete
                    query = 'delete from documents where document_id=$1';
                    args = [item.doc_id];
                };
                client.query(query, args, function (err) {
                    if (err) {
                        done();
                        this.log('Failed to update documents', err);
                        return handler('DB error');
                    };
                    // Documets table modified
                    if (item.doc) {
                        // Also have doc
                        client.query('update documents set body=$1 where document_id=$2', [item.doc, item.doc_id], function (err) {
                            if (err) {
                                this.log('Failed to replace document', err);
                                done();
                                return handler('DB error');
                            };
                            // Updated
                            insertHistory(item, index);
                        }.bind(this));
                    } else {
                        // Insert history
                        insertHistory(item, index);
                    }
                }.bind(this));
            }.bind(this);
            client.query('select id from history where history_id=$1', [item.id], function (err, result) {
                if (err) {
                    this.log('Failed to search history', err);
                    done();
                    return handler('DB error');
                };
                if (result.rows.length>0) {
                    // Already inserted
                    this.log('Already added', item);
                    processItem(index+1);
                } else {
                    documentOperation();
                };
            }.bind(this));
        }.bind(this);
        processItem(0);
    }.bind(this));
};

App.prototype.restGetApplication = function(data, handler) {
    // this.log('restGetApplication', data, data.code);
    this.db(function (err, client, done) {
        if (err) {
            return handler('DB error');
        };
        client.query('select * from sites where code=$1', [data.code], function (err, result) {
            if (err) {
                done();
                return handler('Query error');
            }
            done();
            if (result.rows.length>0) {
                var row = result.rows[0];
                // Found
                handler(null, {found: true, description: row.description, created: row.description});
            } else {
                handler(null, {found: false});
            }
        })
    });
};

App.prototype.newToken = function(client, siteID, status, handler) {
    var clientID = this.random(2);
    var token = this.random(16);
    var dt = new Date().getTime();
    client.query('insert into tokens (id, token, created, status, accessed, site_id, client) values ($1, $2, $3, $4, $5, $6, $7)', [this.id(), token, dt, status, dt, siteID, clientID], function (err) {
        handler(err, clientID, token);
    }.bind(this));
};

App.prototype.restNewApplication = function(data, handler) {
    this.log('restNewApplication', data, data.code);
    if (!data.code) {
        return handler('Code not passed');
    };
    this.db(function (err, client, done) {
        if (err) {
            return handler('DB error');
        };
        // Insert new site and token
        var siteID = this.id();
        client.query('insert into sites (id, code, access, created) values ($1, $2, $3, $4)', [siteID, data.code, 0, new Date().getTime()], function (err) {
            if (err) {
                done();
                return handler('DB error: '+err);
            };
            this.newToken(client, siteID, 1, function (err, clientID, token) {
                done();
                if (err) {
                    return handler('DB error: '+err);
                };
                handler(null, {client: clientID, token: token});
            });
        }.bind(this));
    }.bind(this));
};

App.prototype.restCreateName = function(data, handler) {
    this.log('restCreateName', data, data.code);
    if (!data.code) {
        return handler('Code not passed');
    };
    this.db(function (err, client, done) {
        if (err) {
            return handler('DB error');
        };
        client.query('select id from sites where code = $1', [data.code], function (err, result) {
            if (err || result.rows.length == 0) {
                done();
                return handler('Container not found');
            };
            var row = result.rows[0];
            var siteID = row.id;
            this.newToken(client, siteID, 0, function (err, clientID, token) {
                done();
                if (err) {
                    return handler('DB error: '+err);
                };
                handler(null, {client: clientID, token: token});
            });
        }.bind(this));
    }.bind(this));
};

var $$ = new App();
