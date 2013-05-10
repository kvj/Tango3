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

var express = require('express');
var pg = require('pg');
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
    while(id<this._id) {
        id++;
    }
    this._id = id;
    return id;
};

App.prototype.initRest = function() {
    this.restPrefix = '/rest';
    this.app = express();
    this.app.use(express.json());
    this.app.use('/js', express.static(__dirname + '/js'));
    this.rest('/site/create', this.restNewApplication.bind(this));
    this.rest('/site/get', this.restGetApplication.bind(this));
    this.rest('/name/get', this.restGetName.bind(this));
    this.app.get('/:code.wiki.html', this.htmlLoadApplication.bind(this));
    this.app.get('/', this.htmlGenerateApplication.bind(this));
    this.app.listen(3000);
    this.log('Server started');
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
    handler();
};

App.prototype.db = function(handler) {
    pg.connect(this.dbUrl, function (err, client, done) {
        $$.log('Received connection', err);
        handler(err, client, done);
    });
};

App.prototype.rest = function (path, handler, config) {
    this.app.post(this.restPrefix+path, function (req, res) {
        this.log('Incoming rest:', path, req.body);
        var sendOutput = function (obj) {
            res.send(obj);
        }
        try {
            handler(req.body, function (err, output) {
                if (err) {
                    output = {error: err};
                };
                sendOutput(output);
            }, req, res);
        } catch (e) {
            this.log('Rest error:', e);
            sendOutput({error: 'Error: '+e});
        }
    }.bind(this));
};

App.prototype.log = function() {
    console.log.apply(console, arguments);
};

App.prototype.htmlLoadApplication = function(req, res) {
    $$.log('Load application:', req.params.code);
    res.sendfile('tango2.html');
};

App.prototype.htmlGenerateApplication = function(req, res) {
    var id = this.random(8);
    res.send('<a href="/'+id+'.wiki.html">Create new Container ['+id+']</a>');
};

App.prototype.restGetApplication = function(data, handler) {
    this.log('restGetApplication', data, data.code);
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
        done();
    }.bind(this));
};

App.prototype.restGetName = function(data, handler) {
    this.log('restGetName', data, data.code);
    handler('Not implemented');
};

var $$ = new App();
