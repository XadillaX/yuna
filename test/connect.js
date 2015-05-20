/**
 * XadillaX created at 2015-05-18 17:20:35 With ♥
 *
 * Copyright (c) 2015 Huaban.com, all rights
 * reserved.
 */
var should = require("should");
var Illyria = require("illyria");
var Scarlet = require("scarlet-task");
var common = require("./common");
var Yuna = require("../");

describe("connection test", function() {
    var SERVER_COUNT = 10;
    var SERVER_START_PORT = 17173;
    var servers = [];
    var yuna;

    before(function(callback) {
        var scarlet = new Scarlet(SERVER_COUNT);
        var createServer = function(taskObject) {
            var id = taskObject.task.id;
            common.createServer(SERVER_START_PORT + id, function(err, server) {
                should(err).not.be.instanceof(Error);
                servers.push(server);

                scarlet.taskDone(taskObject);
            });
        };

        for(var i = 0; i < SERVER_COUNT; i++) {
            scarlet.push({ id: i }, createServer);
        }

        scarlet.afterFinish(SERVER_COUNT, function() {
            servers = servers.sort(function(a, b) {
                return a.port - b.port;
            });

            callback();
        }, false);
    });

    after(function() {
        yuna.destroy();
        for(var i = 0; i < SERVER_COUNT; i++) servers[i].close();
    });

    it("should has 10 connections", function(callback) {
        yuna = Yuna.createPool(
            common.ZK_CONNECTION_STRING,
            common.ZK_ROOT,
            common.ZK_PREFIX, {
                maxPool: 10
            });

        var count = 0;
        var ports = {};
        var onNew = function(client) {
            count++;
            ports[client.port] = true;
            if(count === 10) {
                finish();
            }
        };
        yuna.on("new", onNew);

        var finish = function() {
            yuna.pool.length.should.be.eql(10);
            for(var i = 0; i < yuna.pool.length; i++) {
                var client = yuna.pool.valueAt(i);
                client.should.be.instanceof(Illyria.Client);
                client.connectStatus().should.be.eql("CONNECTED");
                ports[SERVER_START_PORT + i].should.be.eql(true);
            }

            yuna.removeListener("new", onNew);
            callback();
        };
    });

    it("should disconnect one and reconnect", function(callback) {
        for(var i = 0; i < yuna.pool.length; i++) {
            var client = yuna.pool.valueAt(i);
            client.socket.socket.end();
        }

        var newCount = 0;
        var closeCount = 0;
        var onNew = function() {
            newCount++;
            if(newCount === 10 && closeCount === 10) finish();
        };
        var onClose = function() {
            closeCount++;
            if(newCount === 10 && closeCount === 10) finish();
        };

        yuna.on("new", onNew);
        yuna.on("close", onClose);

        var finish = function() {
            for(var i = 0; i < yuna.pool.length; i++) {
                var client = yuna.pool.valueAt(i);
                client.should.be.instanceof(Illyria.Client);
                client.connectStatus().should.be.eql("CONNECTED");
            }

            yuna.removeListener("new", onNew);
            yuna.removeListener("close", onClose);
            callback();
        };
    });

    it("can't create more connections", function(callback) {
        yuna.newConnection(function(err) {
            err.message.indexOf("connection limit exceeded.").should.above(0);
            callback();
        });
    });

    it("can create more connections forcely", function(callback) {
        yuna.newConnection(true, function(err, conn) {
            should(err).be.eql(undefined);
            conn.should.be.instanceof(Illyria.Client);
            yuna.clientPosition(conn).should.be.eql(10);
            callback();
        });
    });

    it("can get a usable connection", function(callback) {
        yuna.getConnection(function(err, conn) {
            should(err).be.eql(undefined);
            conn.should.be.instanceof(Illyria.Client);
            yuna.clientPosition(conn).should.be.eql(0);
            callback();
        });
    });

    it("should get the second connection because the first one is CLOSED", function(callback) {
        yuna.pool._head.next.value.status = "CLOSED";
        yuna.getConnection(function(err, conn) {
            should(err).be.eql(undefined);
            conn.should.be.instanceof(Illyria.Client);
            yuna.clientPosition(conn).should.be.eql(1);
            yuna.pool._head.next.value.status = "CONNECTED";
            callback();
        });
    });

    it("should get the second connection because the first one has more tasks", function(callback) {
        yuna.pool._head.next.value.taskCount = 10;
        yuna.getConnection(function(err, conn) {
            should(err).be.eql(undefined);
            conn.should.be.instanceof(Illyria.Client);
            yuna.clientPosition(conn).should.be.eql(1);
            yuna.pool._head.next.value.taskCount = 0;
            callback();
        });
    });

    it("shouldn't get a connection because all are in error", function(callback) {
        for(var i = 0; i < 11; i++) {
            yuna.pool.valueAt(i).status = "CLOSED";
        }

        yuna.getConnection(function(err) {
            err.message.should.be.eql("No usable client node now.");
            for(var i = 0; i < 11; i++) {
                yuna.pool.valueAt(i).status = "CONNECTED";
            }
            callback();
        });
    });

    var connections = [];
    it("should create a new connection because no connection", function(callback) {
        while(yuna.pool.length) connections.push(yuna.pool.popBack());

        yuna.getConnection(function(err, conn) {
            should(err).be.eql(undefined);
            conn.should.be.instanceof(Illyria.Client);
            yuna.clientPosition(conn).should.be.eql(0);
            callback();
        });
    });

    it("should create a new connection because no availble connection", function(callback) {
        yuna.pool._head.next.value.status = "CLOSED";
        yuna.getConnection(function(err, conn) {
            should(err).be.eql(undefined);
            conn.should.be.instanceof(Illyria.Client);
            yuna.clientPosition(conn).should.be.eql(1);
            
            yuna.pool._head.next.value.status = "CONNECTED";
            for(var i = 0; i < connections.length; i++) {
                yuna.pool.pushFront(connections[i]);
            }

            callback();
        });
    });

    it("create with none argument", function(callback) {
        var _yuna = Yuna.createPool();

        var count = 0;
        var onError = function(err) {
            err.message.indexOf("NO_NODE").should.above(0);
            count++;
            if(count === 10) {
                finish();
            }
        };
        _yuna.on("error", onError);

        var finish = function() {
            _yuna.pool.length.should.be.eql(0);
            _yuna.removeListener("new", onError);
            _yuna.destroy();
            callback();
        };
    });

    it("create with one argument 1⃣️", function(callback) {
        var _yuna = Yuna.createPool([ common.ZK_CONNECTION_STRING ]);

        var count = 0;
        var onError = function(err) {
            err.message.indexOf("NO_NODE").should.above(0);
            count++;
            if(count === 10) {
                finish();
            }
        };
        _yuna.on("error", onError);

        var finish = function() {
            _yuna.pool.length.should.be.eql(0);
            _yuna.removeListener("new", onError);
            _yuna.destroy();
            callback();
        };
    });

    it("create with one argument 2⃣️", function(callback) {
        var _yuna = Yuna.createPool({ maxPool: 10 });

        var count = 0;
        var onError = function(err) {
            err.message.indexOf("NO_NODE").should.above(0);
            count++;
            if(count === 10) {
                finish();
            }
        };
        _yuna.on("error", onError);

        var finish = function() {
            _yuna.pool.length.should.be.eql(0);
            _yuna.removeListener("new", onError);
            _yuna.destroy();
            callback();
        };
    });


    it("create with two arguments 1⃣️", function(callback) {
        var _yuna = Yuna.createPool([ common.ZK_CONNECTION_STRING ], { maxPool: 10 });

        var count = 0;
        var onError = function(err) {
            err.message.indexOf("NO_NODE").should.above(0);
            count++;
            if(count === 10) {
                finish();
            }
        };
        _yuna.on("error", onError);

        var finish = function() {
            _yuna.pool.length.should.be.eql(0);
            _yuna.removeListener("new", onError);
            _yuna.destroy();
            callback();
        };
    });

    it("create with two arguments 2⃣️", function(callback) {
        var _yuna = Yuna.createPool([ common.ZK_CONNECTION_STRING ], common.ZK_ROOT);

        var count = 0;
        var onError = function(err) {
            err.message.indexOf("No available server found.").should.above(0);
            count++;
            if(count === 10) {
                finish();
            }
        };
        _yuna.on("error", onError);

        var finish = function() {
            _yuna.pool.length.should.be.eql(0);
            _yuna.removeListener("new", onError);
            _yuna.destroy();
            callback();
        };
    });

    it("create with three arguments 1⃣️", function(callback) {
        var _yuna = Yuna.createPool([ common.ZK_CONNECTION_STRING ], common.ZK_ROOT, { maxPool: 10 });

        var count = 0;
        var onError = function(err) {
            err.message.indexOf("No available server found.").should.above(0);
            count++;
            if(count === 10) {
                finish();
            }
        };
        _yuna.on("error", onError);

        var finish = function() {
            _yuna.pool.length.should.be.eql(0);
            _yuna.removeListener("new", onError);
            _yuna.destroy();
            callback();
        };
    });

    it("create with three arguments 2⃣️ and can't create new connection after destroying", function(callback) {
        var _yuna = Yuna.createPool([ common.ZK_CONNECTION_STRING ], common.ZK_ROOT, common.ZK_PREFIX);

        var count = 0;
        var onNew = function() {
            count++;
            if(count === 10) {
                finish();
            }
        };
        _yuna.on("new", onNew);

        var finish = function() {
            _yuna.pool.length.should.be.eql(10);
            for(var i = 0; i < _yuna.pool.length; i++) {
                var client = _yuna.pool.valueAt(i);
                client.should.be.instanceof(Illyria.Client);
                client.connectStatus().should.be.eql("CONNECTED");
            }

            _yuna.removeListener("new", onNew);
            _yuna.destroy();

            _yuna.newConnection(true, function(err) {
                err.message.should.be.eql("This Yuna has been destroyed.");

                _yuna.getConnection(function(err) {
                    err.message.should.be.eql("This Yuna has been destroyed.");
                    callback();
                });
            });
        };
    });

    it("should occur timeout", function(callback) {
        var _yuna = Yuna.createPool([ common.ZK_CONNECTION_STRING ], common.ZK_ROOT, common.ZK_PREFIX, {
            connectTimeout: 1
        });

        var count = 0;
        var onError = function(err) {
            err.message.indexOf("timeout").should.above(0);
            count++;
            if(count === 10) {
                finish();
            }
        };
        _yuna.on("error", onError);

        var finish = function() {
            _yuna.pool.length.should.be.eql(0);
            _yuna.removeListener("new", onError);
            _yuna.destroy();
            callback();
        };
    });
});

