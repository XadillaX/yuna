/**
 * XadillaX created at 2015-05-15 20:59:36 With ♥
 *
 * Copyright (c) 2015 Huaban.com, all rights
 * reserved.
 */
require("sugar");
var util = require("util");
var LinkList = require("algorithmjs").ds.LinkList;
var Illyria = require("illyria");
var EventEmitter = require("events").EventEmitter;

var emptyCallback = function(){};
const DEFAULT_OPTIONS = {
    runTimeout: 10000,
    connectTimeout: 5000
};
const DEFAULT_CONNECTION_STRING = "127.0.0.1:2181";
const DEFAULT_ROOT = "/illyria";
const DEFAULT_PREFIX = "/HB_";

/**
 * IllyriaPool
 *
 * @param {String|Array} [connectionString="127.0.0.1:2181"] the connection string or array
 * @param {String} [root="/illyria"] the service root
 * @param {String} [prefix="/HB_"] the service prefix
 * @param {Object} [options={}] the connect options (especially in zookeeper)
 * @param {Number} [options.runTimeout=10000] the run timeout value
 * @param {Number} [options.connectTimeout=5000] the connect timeout value
 * @param {Number} [options.maxPool=10] the max pool
 *
 * @constructor
 */
var IllyriaPool = function(connectionString, root, prefix, options) {
    EventEmitter.call(this);

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
    this.pool = new LinkList();

    // underscore -> camelize
    this.pool.popBack = this.pool["pop_back"];
    this.pool.popFront = this.pool["pop_front"];
    this.pool.pushBack = this.pool["push_back"];
    this.pool.pushFront = this.pool["push_front"];

    // create clients
    for(var i = 0; i < this.maxPool; i++) {
        this.newConnection();
    }
};

util.inherits(IllyriaPool, EventEmitter);

IllyriaPool.prototype.clientPosition = function(client) {
    var i = 0;
    var list = this.LinkList;
    for(var node = list._head.next; node !== list._tail; node = node.next, i++) {
        if(node.value === client) return i;
    }
    return -1;
};

IllyriaPool.prototype.newConnection = function(force, callback) {
    if(typeof force === "function") {
        callback = force, force = false;
    }

    if(undefined === callback) callback = emptyCallback;

    /**
     * if the existing client count is larger then expected and the action is not
     * force
     */
    if(this.pool.length >= this.maxPool && !force) {
        return process.nextTick(function() {
            callback();
        });
    }

    var client = Illyria.createClient(this.options);
    this.pool.pushBack(client);

    // add some extra properties
    client.poolNode = this.pool.nodeAt(this.pool.length - 1);

    // connect and wait for timeout
    var self = this;
    var timer = setTimeout(function() {
        client.close();

        // remove this client from pool
        var idx = self.clientPosition(client);
        if(-1 === idx) return;
        self.pool.removeAt(idx);

        callback(new Error("Connect timeout after " + self.options.connectTimeout + "ms."));
    }, this.options.connectTimeout);
    
    client.connect(function() {
        clearTimeout(timer);
        callback(undefined, client);
        self.emit("new");
        client.on("close", function() {
            // remove this client and create a new one
            var idx = self.clientPosition(client);
            if(-1 === idx) return;
            self.pool.removeAt(idx);
            self.newConnection(callback);
            self.emit("close");
        });
    });
};

IllyriaPool.prototype.send = function() {
};

module.exports = IllyriaPool;

