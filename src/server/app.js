"use strict";

let pmx = require("pmx").init();
pmx.http();

// Setup basic express server
let express = require("express");
let compression = require("compression");
let bodyParser = require("body-parser");

let app = express();

console.log(`

 _|    _|                  _|
 _|    _|  _|_|_|  _|_|    _|_|_|    _|  _|_|    _|_|_|
 _|    _|  _|    _|    _|  _|    _|  _|_|      _|    _|
 _|    _|  _|    _|    _|  _|    _|  _|        _|    _|
   _|_|    _|    _|    _|  _|_|_|    _|          _|_|_|


`);

if (process.env.UMBRA_PORT) {
  app.set("port", process.env.UMBRA_PORT);
  console.log("running on custom port: " + process.env.UMBRA_PORT);
} else if (process.env.NODE_ENV === "production") {
  console.log("running on production port: 2252");
  app.set("port", 2252);
} else {
  console.log("running on dev port: 3353");
  app.set("port", 3353);
}

let server = app.listen(app.get("port"), "0.0.0.0");
console.log("Listening on %s", app.get("port"));
let io = require("socket.io")(server, { wsEngine: "uws" });

//let MobileDetect = require('mobile-detect');

let api = require("./api/index");

let AvalonConnections = require("./avalonConnections");
let avalonConnections = new AvalonConnections();

// Routing
app.get("/checkname/", api.checkName);
app.get("/checkname/:username", api.checkName);

app.use(compression());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post("/", function(req, res, next) {
  res.cookie("umbralogin", JSON.stringify(req.body), {
    maxAge: 60000,
    httpOnly: false
  });
  res.sendfile("index.html", { root: __dirname + "/../web" });
});

app.get("/", function(req, res, next) {
  //let md = new MobileDetect(req.headers['user-agent']);
  let fileback = "index.html";
  //if(md.tablet())      { fileback = 'tablet.html'; }
  //else if( md.phone()) { fileback = 'phone.html'; }
  res.sendFile(fileback, { root: __dirname + "/../web" });
});

app.use(express.static(__dirname + "/../web"));
app.use(express.static(__dirname + "/../../node_modules"));

io.on("connection", function(socket) {
  let self = this;
  let shadowclient;
  let username = "<unknown>";
  let playerAddress =
    socket.handshake.headers["x-forwarded-for"] ||
    socket.request.connection.remoteAddress;
  // socket.handshake.address.address
  //let playerAddress = socket.request.connection.remoteAddress;

  console.log("Websocket connected from: " + playerAddress);

  socket.on("reconnect", function() {
    console.log("websocket reconnected");
  });

  //////////////////
  // SOCKET EVENTS

  let onConnectSuccess = function(data) {
    let params = data.params;
    shadowclient = data.client;

    shadowclient.write("###ack connect@ " + playerAddress + "\r\n");
    wireClientEvents(shadowclient);
    socket.emit("connect game ok");

    let fnReplayState = function(blk) {
      socket.emit("protocol", blk);
    };
    let fnReplay = function(blk) {
      socket.emit("block", blk);
    };

    shadowclient.replayState(fnReplayState);

    if (params.hasOwnProperty("replayFrom")) {
      shadowclient.replayFrom(params.replayFrom, fnReplay);
    } else {
      shadowclient.replay(fnReplay);
    }
    shadowclient.write("###ack macros\r\n");
  };

  let onConnectFailure = function(data) {
    let err = data.err;
    let params = data.params;
    console.log(
      "login failure for " +
        params.username +
        "@" +
        params.playerAddress +
        ": " +
        JSON.stringify(err)
    );
    socket.emit("login failure", err.result.reason);
  };

  socket.on("connect game", function(params) {
    params.playerAddress = playerAddress;
    username = params.username;
    console.log("connect game request for: [" + username + "]");
    avalonConnections.get(params, onConnectSuccess, onConnectFailure);
  });

  socket.on("log", function(msg) {
    console.log(username + ": " + msg);
  });

  socket.on("send", function(text) {
    if (shadowclient) {
      shadowclient.write(text + "\r\n");
    } else {
      console.log(username + " can't send to disconnected client: " + text);
    }
  });

  socket.on("logout", function() {
    if (shadowclient) {
      shadowclient.write("qq\r\n");
    }
  });

  // when the user disconnects.. perform this
  socket.on("disconnect", function() {
    console.log("websocket disconnected for " + username);
    if (shadowclient) {
      shadowclient.pause();
    }
  });

  //////////////////
  // CLIENT EVENTS

  function wireClientEvents(client) {
    client.on("login result", function(data) {
      console.log("login result: " + JSON.stringify(data));
      socket.emit("login result", data);
    });

    client.on("avalon disconnected", function(had_error) {
      console.log("avalon disconnected for " + username);
      socket.emit("avalon disconnected", had_error);
    });

    client.on("closed", function(had_error) {
      console.log("closed for " + username);
      socket.emit("avalon disconnected", had_error);
    });

    client.on("block", function(data) {
      socket.emit("block", data);
    });

    client.on("protocol", function(data) {
      socket.emit("protocol", data);
    });
  }
});
