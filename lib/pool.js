/**
 * XadillaX created at 2015-05-15 20:59:36 With ♥
 *
 * Copyright (c) 2015 Huaban.com, all rights
 * reserved.
 */
require("sugar");
var util = require("util");

const DEFAULT_OPTIONS = {
    runTimeout: 10000,
    maxRetries: 10,
    retryInterval: 1000,
    reconnect: true
};
const DEFAULT_CONNECTION_STRING = "127.0.0.1:2181";
const DEFAULT_ROOT = "/illyria";
const DEFAULT_PREFIX = "/HB_";

var IllyriaPool = function(connectionString, root, prefix, options) {
    if(arguments.length === 0) {
        connectionString = DEFAULT_CONNECTION_STRING;
        root = DEFAULT_ROOT;
        prefix = DEFAULT_PREFIX;
        options = DEFAULT_OPTIONS;
    } if(arguments.length === 1) {
        if(util.isArray(connectionString) || typeof connectionString === "string") {
            // if it's a real connection string
 
            options = DEFAULT_OPTIONS;
        } else {
            // if it's an option
           
            options = Object.merge(connectionString, DEFAULT_OPTIONS, true, false);
            connectionString = DEFAULT_CONNECTION_STRING;
        }

        root = DEFAULT_ROOT;
        prefix = DEFAULT_PREFIX;
    } else if(arguments === 2) {
        if(typeof root === "string") {
            options = DEFAULT_OPTIONS;
        } else {
            options = Object.merge(root, DEFAULT_OPTIONS, true, false);
            root = DEFAULT_ROOT;
        }

        prefix = DEFAULT_PREFIX;
    } else if(arguments === 3) {
        if(typeof prefix === "string") {
            options = DEFAULT_OPTIONS;
        } else {
            options = Object.merge(prefix, DEFAULT_OPTIONS, true, false);
            prefix = DEFAULT_PREFIX;
        }
    }

    this.options = {};
    for(var key in options) {
        if(!options.hasOwnProperty(key)) continue;
        this.options[key] = options[key];
    }

    if(undefined === this.options.zookeeper) this.options.zookeeper = {};
    this.options.zookeeper.connectString = connectionString;
    this.options.zookeeper.root = root;
    this.options.zookeeper.prefix = prefix;

    this.maxPool = this.options.maxPool || 10;
};

module.exports = IllyriaPool;

