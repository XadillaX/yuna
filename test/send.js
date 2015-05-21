/**
 * XadillaX created at 2015-05-21 15:00:18 With ♥
 *
 * Copyright (c) 2015 Huaban.com, all rights
 * reserved.
 */
var should = require("should");
var Scarlet = require("scarlet-task");
var common = require("./common");
var Yuna = require("../");

describe("send test", function() {
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

            yuna = Yuna.createPool(
                common.ZK_CONNECTION_STRING,
                common.ZK_ROOT,
                common.ZK_PREFIX, {
                    maxPool: 10,
                    runTimeout: 1500
                });

            callback();
        }, false);
    });

    after(function() {
        yuna.destroy();
        for(var i = 0; i < SERVER_COUNT; i++) servers[i].close();
    });

    it("should echo ping", function(callback) {
        yuna.send("test", "echo", "ping", function(err, text) {
            should(err).be.eql(undefined);
            text.should.be.eql("ping");
            callback();
        });
    });

    it("should load balancing while sending", function(callback) {
        yuna.send("test", "setTimeout", { time: 100 }, function(err, obj) {
            should(err).be.eql(undefined);
            yuna.pool.valueAt(0).taskCount.should.eql(0);
            obj.time.should.be.eql(100);
        });

        setTimeout(function() {
            yuna.send("test", "setTimeout", { time: 200 }, function(err, obj) {
                should(err).be.eql(undefined);
                yuna.pool.valueAt(1).taskCount.should.eql(0);
                obj.time.should.be.eql(200);

                callback();
            });
        }, 50);
    });

    it("should load balancing while sending", function(callback) {
        yuna.send("test", "setTimeout", { time: 500 }, function(err, obj) {
            should(err).be.eql(undefined);
            yuna.pool.valueAt(0).taskCount.should.eql(0);
            obj.time.should.be.eql(500);
        });

        setTimeout(function() {
            yuna.send("test", "setTimeout", { time: 1000 }, function(err, obj) {
                should(err).be.eql(undefined);
                yuna.pool.valueAt(1).taskCount.should.eql(0);
                obj.time.should.be.eql(1000);

                callback();
            });
        }, 50);

        setTimeout(function() {
            yuna.pool.valueAt(0).taskCount.should.eql(1);
            yuna.pool.valueAt(1).taskCount.should.eql(1);
        }, 100);
    });

    it("should send with second connection", function(callback) {
        var uuid = yuna.pool.valueAt(1).uuid;
        var uuid9 = yuna.pool.valueAt(9).uuid;
        yuna.pool.valueAt(0).close();

        yuna.send("test", "setTimeout", { time: 500 }, function(err, obj) {
            yuna.pool.valueAt(0).uuid.should.be.eql(uuid);
            should(err).be.eql(undefined);
            obj.time.should.be.eql(500);
            callback();
        });

        setTimeout(function() {
            yuna.pool.valueAt(0).uuid.should.be.eql(uuid);
            yuna.pool.valueAt(9).uuid.should.not.be.eql(uuid9);
        }, 200);
    });

    it("couldn't find a usable connection", function(callback) {
        for(var i = 0; i < 10; i++) yuna.pool.valueAt(i).status = "CLOSED";
        yuna.send("test", "echo", "c", function(err) {
            err.message.should.be.eql("No usable client node now.");
            for(var i = 0; i < 10; i++) {
                yuna.pool.valueAt(i).status = "CONNECTED";
            }
            callback();
        });
    });

    it("couldn't send any more after destroying", function(callback) {
        yuna = Yuna.createPool(
            common.ZK_CONNECTION_STRING,
            common.ZK_ROOT,
            common.ZK_PREFIX, {
                maxPool: 10
            });
        yuna.destroy();
        yuna.send("a", "b", "c", function(err) {
            err.message.should.eql("This Yuna has been destroyed.");
            callback();
        });
    });
});

