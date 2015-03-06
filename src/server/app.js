'use strict';
// Setup basic express server
let express = require('express');
let compression = require('compression');
let bodyParser = require('body-parser');

let app = express();
let server = app.listen(process.env.UMBRA_PORT || 2252);
let io = require('socket.io')(server);

let MobileDetect = require('mobile-detect');

let Watcher = require('./Watcher').Watcher;
let WatcherBinding = require('./WatcherBinding').WatcherBinding;
let ShadowClient = require('./shadowclient');
let AvParser = require('./avparser');
let Tabulator = require('./tabulator');
let api = require("./api/index");

let tabulator = new Tabulator();

let watcher = new Watcher('./web');

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
  watcher.addClient(new WatcherBinding(socket, watcher));

  let shadowclient;
  let parsedclient;
  let username = "undefined";
  let self = this;
  let playerAddress = socket.request.connection.remoteAddress;

  console.log('Websocket connected from: ' + playerAddress);

  socket.on('reconnect', function () {
    console.log('websocket reconnected');
  });

  //////////////////
  // SOCKET EVENTS 

  socket.on('attempt login', function (params) {
    console.log('attempting login for ' + params.username);
    console.log('host = ' + params.host);
    username = params.username;
    shadowclient = new ShadowClient(params);
    parsedclient = new AvParser(shadowclient);
    wireShadowEvents(username);
  });

  socket.on('confirm login', function (params) {
    console.log('confirming login for ' + params.username);
    console.log('host = ' + params.host);
    if(!shadowclient || !shadowclient.connected || shadowclient.username !== params.username) {
      console.log('fresh login required');
      username = params.username;
      shadowclient = new ShadowClient(params);
      parsedclient = new AvParser(shadowclient);
      wireShadowEvents(username);
    } else {
      console.log('re-attaching login');
    }
  });

  socket.on('send', function (text) {    
    if(shadowclient) {
      //console.log(username + ' wrote: ' + text);
      shadowclient.write(text + '\r\n');
    } else {
      console.log(username + ' can\'t send to disconnected socket: ' + text);
    }
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    console.log('websocket disconnected for ' + username);
    if(shadowclient && shadowclient.connected) {
      shadowclient.write('###ack logout ' + username + '\r\n');
    }
  });

  //////////////////
  // CLIENT EVENTS 

  function wireShadowEvents(username) {
    shadowclient.on('avalon connected', function() {
      console.log('avalon connected, attempting login for ' + username);
    });

    shadowclient.on('login result', function(data) {
      console.log('login reult: ' + JSON.stringify(data));
      socket.emit('login result', data);
      if(data.success) {
        shadowclient.write('protocol on\r\n');
        shadowclient.write('macrolist\r\n');
      } else {
        shadowclient.close();
      }
    });

    shadowclient.on('avalon disconnected', function (had_error) {
      console.log('avalon disconnected for ' + username);
      socket.emit('avalon disconnected', had_error);
      shadowclient.close();
    });

    parsedclient.on('block', function (data) {
      //console.log('================================================================');
      //console.log('before tabulator: ' + JSON.stringify(data, null, 2));
      let processedBlock = tabulator.tabulate(data);
      //console.log('================================================================');
      //console.log('after tabulator: ' + JSON.stringify(processedBlock, null, 2));
      if(shadowclient.loggedIn) { socket.emit('block', processedBlock); }
      //if(shadowclient.loggedIn) { socket.emit('block', data); }
    });

  }

});