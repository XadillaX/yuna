/**
 * XadillaX created at 2015-05-15 20:59:36 With ♥
 *
 * Copyright (c) 2015 Huaban.com, all rights
 * reserved.
 */
require("sugar");
var uuid = require("node-uuid");
var async = require("async");
var util = require("util");
var LinkList = require("algorithmjs").ds.Linklist;
var Illyria = require("illyria");
var EventEmitter = require("events").EventEmitter;
var Scarlet = require("scarlet-task");

var emptyCallback = function(){};
var DEFAULT_OPTIONS = {
    runTimeout: 10000,
    connectTimeout: 5000,
    retriesForGetting: 5,
    gettingRetryInterval: 200
};
var DEFAULT_CONNECTION_STRING = "127.0.0.1:2181";
var DEFAULT_ROOT = "/illyria";
var DEFAULT_PREFIX = "/HB_";

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
 * @param {Number} [options.retriesForGetting=5] retry times for getting usable client
 * @param {Number} [options.gettingRetryInterval=200] retry interval per getting usable client (in million second)
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
    } else if(arguments.length === 1) {
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
    } else if(arguments.length === 2) {
        if(typeof root === "string") {
            options = DEFAULT_OPTIONS;
        } else {
            options = Object.merge(root, DEFAULT_OPTIONS, true, false);
            root = DEFAULT_ROOT;
        }

        prefix = DEFAULT_PREFIX;
    } else if(arguments.length === 3) {
        if(typeof prefix === "string") {
            options = DEFAULT_OPTIONS;
        } else {
            options = Object.merge(prefix, DEFAULT_OPTIONS, true, false);
            prefix = DEFAULT_PREFIX;
        }
    } else {
        options = Object.merge(options, DEFAULT_OPTIONS, true, false);
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
    this.options.reconnect = false;

    this.maxPool = this.options.maxPool || 10;
    this.pool = new LinkList();

    // underscore -> camelize
    this.pool.popBack = this.pool["pop_back"];
    this.pool.popFront = this.pool["pop_front"];
    this.pool.pushBack = this.pool["push_back"];
    this.pool.pushFront = this.pool["push_front"];

    // create task processor
    var self = this;
    var scarlet = new Scarlet(1);
    var createTasker = function(taskObject) {
        self.newConnection(function() {
            scarlet.taskDone(taskObject);
        });
    };

    // create clients
    for(var i = 0; i < this.maxPool; i++) {
        scarlet.push(null, createTasker);
    }

    this.destroyed = false;

    this.on("error", emptyCallback);
};

util.inherits(IllyriaPool, EventEmitter);

/**
 * available count
 * @return {Number} the available connection count
 */
IllyriaPool.prototype.availableCount = function() {
    var i = 0;
    var list = this.pool;
    var count = 0;
    for(var node = list._head.next; node !== list._tail; node = node.next, i++) {
        if(node.value instanceof Illyria.Client && node.value.status === "CONNECTED") {
            count++;
        }
    }

    return count;
};

/**
 * removeClient
 * @param {IllyriaClient} client the illyria client
 */
IllyriaPool.prototype.removeClient = function(client) {
    // remove this client from pool
    var idx = this.clientPosition(client);

    // if no node found
    if(-1 !== idx) {
        // remove node
        this.pool.removeAt(idx);
    }

    try {
        client.removeAllListeners();

        // close client
        client.close();
    } catch(e) {
        //... ignore error
    }
};

/**
 * clientPosition
 * @param {IllyriaClient} client the illyria client
 * @return {Number} the index of this client in the pool
 */
IllyriaPool.prototype.clientPosition = function(client) {
    var i = 0;
    var list = this.pool;
    for(var node = list._head.next; node !== list._tail; node = node.next, i++) {
        if(node.value === client) return i;
    }
    return -1;
};

/**
 * newConnection
 * @param {Boolean} [force] create new client forcely
 * @param {Function} [callback] the callback function
 */
IllyriaPool.prototype.newConnection = function(force, callback) {
    if(typeof force === "function") {
        callback = force, force = false;
    }

    if(undefined === callback) callback = emptyCallback;

    /**
     * if the Yuna has been destroyed.
     */
    if(this.destroyed) {
        return process.nextTick(function() {
            callback(new Error("This Yuna has been destroyed."));
        });
    }

    /**
     * if the existing client count is larger then expected and the action is not
     * force
     */
    if(this.pool.length >= this.maxPool && !force) {
        return process.nextTick(function() {
            callback(new Error(this.maxPool + " connection limit exceeded."));
        });
    }

    var client = Illyria.createClient(this.options);
    this.pool.pushBack(client);

    // add some extra properties
    client.poolNode = this.pool.nodeAt(this.pool.length - 1);
    client.taskCount = 0;
    client.uuid = uuid.v1();
    client.$send = client.send;
    client.$cast = client.cast;
    client.send = (function(module, method, params, callback) {
        var self = this;
        this.taskCount++;
        this.$send(module, method, params, function() {
            self.taskCount--;
            callback.apply(null, arguments);
        });
    }).bind(client);
    client.cast = (function(module, method, params, callback) {
        var self = this;
        this.taskCount++;
        this.$cast(module, method, params, function() {
            self.taskCount--;
            callback.apply(null, arguments);
        });
    }).bind(client);

    // connect and wait for timeout
    var self = this;
    var timeouted = false;
    var timer = setTimeout(function() {
        timeouted = true;
        self.removeClient(client);

        var err = new Error("Connect timeout after " + self.options.connectTimeout + "ms.");
        callback(err);
        self.emit("error", err);
    }, this.options.connectTimeout);

    client.connect(function(err) {
        clearTimeout(timer);

        if(timeouted) {
            return self.removeClient(client);
        }

        if(err) {
            self.removeClient(client);

            var _err;
            if(err.message.indexOf("NO_NODE") >= 0) {
                _err = new Error("Error occurred while connecting: No available server found.");
            } else {
                _err = new Error("Error occurred while connecting: " + err.message);
            }

            self.emit("error", _err);
            return callback(err);
        }

        callback(undefined, client);
        self.emit("new", client);

        var onClose = function() {
            // remove this client and create a new one
            self.removeClient(client);

            self.newConnection();
            self.emit("close");
        };

        client.on("close", onClose);
        client.on("error", onClose);
    });
};

/**
 * getConnection
 * @param {Function} callback the callback function
 */
IllyriaPool.prototype.getConnection = function(callback) {
    /**
     * if the Yuna has been destroyed.
     */
    if(this.destroyed) {
        return process.nextTick(function() {
            callback(new Error("This Yuna has been destroyed."));
        });
    }


    var self = this;
    if(!this.pool.length) {
        return this.newConnection(callback);
    }

    // traversal the list and get minimum tasks ones
    var list = this.pool;
    var clients = [];
    var min = 0;
    for(var node = list._head.next; node !== list._tail; node = node.next) {
        var _client = node.value;
        if(_client.connectStatus() !== "CONNECTED") {
            continue;
        }

        if(!clients.length) {
            clients.push(_client);
            min = _client.taskCount;
        } else if(min > _client.taskCount) {
            clients = [ _client ];
            min = _client.taskCount;
        }
    }

    // no usable connection
    if(!clients.length) {
        if(this.pool.length < this.maxPool) {
            return this.newConnection(callback);
        }

        // for retry
        var retries = arguments[1];
        if(!retries || retries < this.options.retriesForGetting) {
            return setTimeout(function() {
                self.getConnection(callback, (retries || 0) + 1);
            }, this.options.gettingRetryInterval);
        }

        // no more retry
        return process.nextTick(function() {
            callback(new Error("No usable client node now."));
        });
    }

    // get a random client in `clients`
    var client = clients[Number.random(0, clients.length - 1)];

    // return current client
    process.nextTick(function() {
        callback(undefined, client);
    });
};

/**
 * cast
 * @param {String} module the module name
 * @param {String} method the method name
 * @param {*} params the params
 * @param {Function} callback the callback function
 */
IllyriaPool.prototype.cast = function(module, method, params, callback_) {
    this.send(module, method, params, callback_, true);
};

/**
 * send
 * @param {String} module the module name
 * @param {String} method the method name
 * @param {*} params the params
 * @param {Function} callback the callback function
 */
IllyriaPool.prototype.send = function(module, method, params, callback_) {
    var self = this;
    var argv = arguments;
    var isCast = false;

    /**
     * if the Yuna has been destroyed.
     */
    if(this.destroyed) {
        return process.nextTick(function() {
            callback_(new Error("This Yuna has been destroyed."));
        });
    }

    var _client;
    async.waterfall([
        /**
         * step 1.
         *   select a usable client at first
         */
        function(callback) {
            self.getConnection(function(err, client) {
                if(err) {
                    return callback(err);
                }
                callback(undefined, client);
            });
        },

        /**
         * step 2.
         *   send the message
         */
        function(client, callback) {
            _client = client;

            // a hidden param - isCast...
            // it's after callback
            if(argv.length >= 5) {
                isCast = !!argv[4];
            }

            var func = isCast ? client.cast.bind(client) : client.send.bind(client);
            func(module, method, params, callback);
        }
    ], function(err, data) {
        callback_(err, data, _client);
    });
};

/**
 * destroy
 */
IllyriaPool.prototype.destroy = function() {
    while(this.pool.length) {
        var conn = this.pool.popBack();
        conn.removeAllListeners();
        conn.close();
    }

    this.destroyed = true;
};

module.exports = IllyriaPool;
