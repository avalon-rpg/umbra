// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 2252;

var ShadowClient = require('./shadowclient');
var AvParser = require('./avparser');
var Tabulator = require('./tabulator');

var tabulator = new Tabulator();

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/node_modules'));

io.on('connection', function (socket) {

  var shadowclient;
  var parsedclient;
  var username = "undefined";
  var self = this;

  console.log('Websocket connected');

  socket.on('reconnect', function () {
    console.log('websocket reconnected');
  });

  //////////////////
  // SOCKET EVENTS 

  socket.on('attempt login', function (params) {
    console.log('index.js attempt login for ' + params.username);
    username = params.username;
    shadowclient = new ShadowClient(params);
    parsedclient = new AvParser(shadowclient);
    wireShadowEvents(username);
  });

  socket.on('confirm login', function (params) {
    console.log('index.js attempt login for ' + params.username);
    if(!shadowclient || !shadowclient.connected || shadowclient.username != params.username) {
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
      } else {
        shadowclient.close();
      }
    });

    shadowclient.on('avalon disconnected', function (had_error) {
      console.log('avalon disconnected for ' + username)
      socket.emit('avalon disconnected', had_error);
      shadowclient.close();
    });

    parsedclient.on('block', function (data) {
      var processedBlock = tabulator.process(data);
      console.log('input: ' + JSON.stringify(data));
      if(shadowclient.loggedIn) { socket.emit('block', processedBlock); }
    });

  }

});