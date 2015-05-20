/**
 * XadillaX created at 2015-05-18 14:46:14 With ♥
 *
 * Copyright (c) 2015 Huaban.com, all rights
 * reserved.
 */
var Yuna = exports.Yuna = require("./lib/pool");

/**
 * create a illyria client pool
 *
 * @param {String|Array} [connectionString="127.0.0.1:2181"] the connection string or array
 * @param {String} [root="/illyria"] the service root
 * @param {String} [prefix="/HB_"] the service prefix
 * @param {Object} [options={}] the connect options (especially in zookeeper)
 * @param {Number} [options.runTimeout=10000] the run timeout value
 * @param {Number} [options.connectTimeout=5000] the connect timeout value
 * @param {Number} [options.maxPool=10] the max pool
 * @param {Number} [options.retriesForGetting=5] retry times for getting usable client
 * @param {Number} [options.gettingRetryInterval=200] retry interval per getting usable client (in million second)
 * @return {Yuna} the illyria client pool
 */
exports.createPool = function(connectionString, root, prefix, options) {
    if(arguments.length === 0) {
        return new Yuna();
    } else if(arguments.length === 1) {
        return new Yuna(connectionString);
    } else if(arguments.length === 2) {
        return new Yuna(connectionString, root);
    } else if(arguments.length === 3) {
        return new Yuna(connectionString, root, prefix);
    } else {
        return new Yuna(connectionString, root, prefix, options);
    }
};

