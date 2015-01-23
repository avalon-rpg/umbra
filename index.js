// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 2252;

var ShadowClient = require('./shadowclient');


server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));


io.on('connection', function (socket) {

  var shadowclient = null;
  var username = "undefined";

  console.log('Websocket connected');

  socket.on('reconnect', function () {
    console.log('websocket reconnected');
  });

  //////////////////
  // SOCKET EVENTS 

  socket.on('attempt login', function (username, password) {
    username = username;
    shadowclient = new ShadowClient(username, password);
    wireShadowEvents();
  });

  socket.on('confirm login', function (username, password) {
    if(!shadowclient || !shadowclient.connected || shadowclient.user != username) {
      username = username;
      shadowclient = new ShadowClient(username, password);
    }
    wireShadowEvents();
  });

  socket.on('send', function (text) {    
    if(shadowclient) {
      shadowclient.write(text + '\r\n');
    } else {
      console.log(username + ' can\'t send to disconnected socket: ' + text);
    }
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    console.log('websocket disconnected for ' + username);
    if(shadowclient && shadowclient.connected) {
      socket.shadowclient.write('QQ\r\n');
    }
  });

  //////////////////
  // CLIENT EVENTS 

  function wireShadowEvents() {
    shadowclient.on('avalon connected', function() {
      console.log('avalon connected, attempting login for ' + username);
    });

    shadowclient.on('login success', function() {
      console.log('login success for ' + username);
      socket.emit('login success');
      shadowclient.write('who\r\n');
    });

    shadowclient.on('avalon disconnected', function (had_error) {
      console.log('avalon disconnected for ' + username)
      socket.emit('avalon disconnected', had_error);
    });

    shadowclient.on('input', function (data) {
      // console.log('input: ' + JSON.stringify(data));
      socket.emit('input', data);
    });
  }

});