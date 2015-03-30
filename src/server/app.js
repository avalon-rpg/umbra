'use strict';

let pmx = require('pmx').init();
pmx.http();

// Setup basic express server
let express = require('express');
let compression = require('compression');
let bodyParser = require('body-parser');

let app = express();

let server = app.listen(process.env.UMBRA_PORT || 2252, '0.0.0.0');
console.log("Listening on %s", process.env.UMBRA_PORT || 2252);
let io = require('socket.io')(server);

//let MobileDetect = require('mobile-detect');

let api = require("./api/index");

let AvalonConnections = require('./avalonConnections');
let avalonConnections = new AvalonConnections();


// Routing
app.get("/checkname/", api.checkName);
app.get("/checkname/:username", api.checkName);

app.use(compression());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());



app.post("/", function (req, res, next) {
  res.cookie('umbralogin', JSON.stringify(req.body), { maxAge: 60000, httpOnly: false });
  res.sendfile('index.html', {root: __dirname + '/../web'});
});

app.get("/", function (req, res, next) {
  //let md = new MobileDetect(req.headers['user-agent']);
  let fileback = 'index.html';
  //if(md.tablet())      { fileback = 'tablet.html'; }
  //else if( md.phone()) { fileback = 'phone.html'; }
  res.sendFile(fileback, {root: __dirname + '/../web'});
});

app.use(express.static(__dirname + '/../web'));
app.use(express.static(__dirname + '/../../node_modules'));


io.on('connection', function (socket) {
  let self = this;
  let shadowclient;
  let username = '<unknown>';
  let playerAddress = socket.request.connection.remoteAddress;

  console.log('Websocket connected from: ' + playerAddress);

  socket.on('reconnect', function () {
    console.log('websocket reconnected');
  });

  //////////////////
  // SOCKET EVENTS 

  socket.on('connect game', function (params) {
    params.playerAddress = playerAddress;
    username = params.username;
    avalonConnections.get(params)
      .then(function(cli) {
        shadowclient = cli;
        shadowclient.write('###hub ' + playerAddress + '\r\n');
        wireClientEvents(cli);
        socket.emit("connect game ok");
        if(params.replayFrom) {
          cli.replayFrom(params.replayFrom, blk => socket.emit('block', blk));
        } else {
          cli.replay(blk => socket.emit('block', blk));
        }
      }).done();
  });

  socket.on('log', function(msg) {
    console.log(username + ': ' + msg);
  });
  socket.on('send', function (text) {    
    if(shadowclient) { shadowclient.write(text + '\r\n'); }
    else { console.log(username + ' can\'t send to disconnected client: ' + text); }
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    console.log('websocket disconnected for ' + username);
    if(shadowclient) { shadowclient.pause(); }
  });

  //////////////////
  // CLIENT EVENTS 

  function wireClientEvents(client) {
    client.on('login result', function(data) {
      console.log('login result: ' + JSON.stringify(data));
      socket.emit('login result', data);
    });

    client.on('avalon disconnected', function (had_error) {
      console.log('avalon disconnected for ' + username);
      socket.emit('avalon disconnected', had_error);
      shadowclient.close();
    });

    client.on('block', function (data) { socket.emit('block', data); });
  }

});