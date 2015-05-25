# Yuna (ユウナ)

The extra Zookeeper support for Illyria client pool.

[![NPM](https://img.shields.io/npm/v/yuna.svg)](https://www.npmjs.com/package/yuna) [![TravisCI Status](https://img.shields.io/travis/XadillaX/yuna/master.svg)](https://travis-ci.org/XadillaX/yuna) [![Coverage Status](https://coveralls.io/repos/XadillaX/yuna/badge.svg?branch=master)](https://coveralls.io/r/XadillaX/yuna?branch=master&time=201505211829) [![David Status](https://img.shields.io/david/XadillaX/yuna.svg)](https://david-dm.org/XadillaX/yuna)

![Yuna](yuna.jpg)

## Installation

```sh
$ npm install --save yuna
```

> Yuna is a summoner embarking on a journey to defeat the world-threatening monster ***Sin***. And in this project, she will summon multiple connections of illyria to defeat the instability of servers.

## Usage

### Create

First of all, you should create a new `Yuna` object.

```javascript
var Yuna = require("yuna");
var yuna = Yuna.createPool(ZOOKEEPER_CONNECT_STRING, ZOOKEEPER_ROOT, ZOOKEEPER_PREFIX, OPTIONS);
```

> **Attention:** all of the params above in `Yuna.createPool` are optional.

The parameters and their default value are shown below.

| Parameter                    | Default         | Description                                                                          |
|------------------------------|-----------------|--------------------------------------------------------------------------------------|
| ZOOKEEPER_CONNECT_STRING     | "127.0.0.1"     | The connect string for zookeeper.                                                    |
| ZOOKEEPER_ROOT               | "/illyria"      | The root path for the certain server nodes.                                          |
| ZOOKEEPER_PREFIX             | "/HB_"          | The prefix for the certain server nodes.                                             |
| OPTIONS                      | [object Object] | The options for this pool.                                                           |
| OPTIONS.maxPool              | 10              | The maximum client count in the pool.                                                |
| OPTIONS.runTimeout           | 10000           | Timeout for one sending operation in million second. (not including retry)           |
| OPTIONS.connectTimeout       | 5000            | Timeout for the connecting to the server in million second.                          |
| OPTIONS.retryForGetting      | 5               | Times of retry for getting a usable connection.                                      |
| OPTIONS.gettingRetryInterval | 200             | Interval for retry of getting a usable connection.                                   |
| OPTIONS.zookeeper            | {}              | Refer to [Illyria document](https://github.com/XadillaX/illyria2#with-zookeeper-1).  |
| OPTIONS.?                    | -               | Refer to [io.js document](https://iojs.org/api/net.html#net_new_net_socket_options). |

> **Tip:** don't include `connectString`, `root` and `prefix` in option `OPTIONS.zookeeper` because it will be replaced by `ZOOKEEPER_CONNECT_STRING`, `ZOOKEEPER_ROOT` and `ZOOKEEPER_PREFIX`.

### Send

The main method you should use in your program is `Yuna::send`. The parameters are the same as [Illyria Client](https://github.com/XadillaX/illyria2#send-a-message-to-rpc-server).

```javascript
yuna.send("module", "method", DATA, function(err, data, conn) {
    // `conn` is the current connection
    console.log(err, data, conn);
});
```

### Destroy

Destroy this Yuna pool and disconnect all the connections.

```javascript
yuna.destroy();
```

### New Connection

Most time you needn't to use this method. It usually be used by other functions of Yuna like the constructor function.

```javascript
yuna.newConnection([force], callback);
```

> The optional parameter `force` is defined to tell the function weather the connection will be created forcely and ignore the maximum connection count of the pool.
>
> The callback function is look like `function(err, conn) {}`.

### Get Connection

Most time you needn't to use this method. This method will return you a usable Illyria connection just now if you really want to do this.

```javascript
yuna.getConnection(function(err, conn) {
    // DO SOMETHING
});
```

### Available Connection Count

Get current available connection count.

```javascript
var availables = yuna.availableCount();
```

### Client Position

Most time you needn't to use this method. It will tell the position of the connection you passed in in the connection pool.

```javascript
var idx = yuna.clientPosition(conn);
```

### Events

#### new

This event will be emitted when a new connection is set.

```javascript
yuna.on("new", function() {
    // SOME CODE...
});
```

#### error

This event will be emitted when a connection has an error. (But Yuna will reconnect automatically)

```javascript
yuna.on("error", function() {
    // SOME CODE...
});
```

#### close

This event will be emitted when a connection is disconnected.

```javascript
yuna.on("close", function() {
    // SOME CODE...
});
```

## Contribution

You're welcome to make pull requests.

「雖然我覺得不怎麼可能有人會關注我」

