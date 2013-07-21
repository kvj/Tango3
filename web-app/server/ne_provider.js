var DataProvider = function(name, config) { // Implements abstract data access
};

DataProvider.prototype = new SuperDataProvider();

DataProvider.prototype.open = function(handler) { // Opens DB, loads last ID, if any
};

DataProvider.prototype.findToken = function(token, handler) { // Loads token and site
};

DataProvider.prototype.updateToken = function(token, handler) { // Updates token timestamp
};

DataProvider.prototype.hasHistory = function(marker, site, handler) { // Check for new data for this site and marker
};

DataProvider.prototype.getHistory = function(marker, site, handler) { // Gets history from some point
};

DataProvider.prototype.getDocument = function(id, handler) { // Loads document (body) from DB by it's ID
};

DataProvider.prototype.getTokens = function(site, handler) { // Returns all tokens for site
};

DataProvider.prototype.setTokenStatus = function(token, status, handler) { // Changes status of token
};

DataProvider.prototype.removeToken = function(token, handler) { // Removes token
};

DataProvider.prototype.addHistory = function(item, handler) { // Adds new hitory item, updates documents also
};

DataProvider.prototype.getSite = function(code, handler) { // Searches for application
};

DataProvider.prototype.addToken = function(site, status, handler) { // Creates new token for site
};

DataProvider.prototype.addSite = function(code, handler) { // Creates new site
};

module.exports.NeDataProvider = DataProvider;

