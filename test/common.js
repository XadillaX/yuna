/**
 * XadillaX created at 2015-05-18 15:18:03 With ♥
 *
 * Copyright (c) 2015 Huaban.com, all rights
 * reserved.
 */
var Illyria = require("illyria");

var ZK_CONNECTION_STRING = exports.ZK_CONNECTION_STRING = process.env.ZK || "127.0.0.1:2181";
var ZK_ROOT = exports.ZK_ROOT = "/yuna_mocha";
var ZK_PREFIX = exports.ZK_PREFIX = "/yuna_";
var SERVER_HOST = exports.SERVER_HOST = "127.0.0.1";

exports.createServer = function(port, callback) {
    var server = Illyria.createServer({
        port: port,
        host: SERVER_HOST
    }, {
        connectString: ZK_CONNECTION_STRING,
        root: ZK_ROOT,
        prefix: ZK_PREFIX
    });

    server.expose("test", {
        echo: function(req, resp) {
            resp.send(req.params);
        },

        setTimeout: function(req, resp) {
            var time = req.params.time;
            setTimeout(function() {
                resp.send(req.params);
            }, time);
        },

        info: function(req, resp) {
            resp.send({ port: port, host: SERVER_HOST });
        }
    });

    server.listen(function(err) {
        if(err) return callback(err);
        callback(undefined, server);
    });
};

