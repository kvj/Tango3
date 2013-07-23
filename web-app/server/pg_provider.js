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
var pg = null;
pg = require('pg');
