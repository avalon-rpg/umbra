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
app.use(express.static(__dirname + '/node_modules'));

io.on('connection', function (socket) {

  var shadowclient = null;
  var username = "undefined";
  var self = this;

  console.log('Websocket connected');

  socket.on('reconnect', function () {
    console.log('websocket reconnected');
  });

  //////////////////
  // SOCKET EVENTS 

  socket.on('attempt login', function (params) {
    // console.log('index.js attempt login: ' + JSON.stringify(params));
    username = params.username;
    shadowclient = new ShadowClient(params);
    wireShadowEvents(username);
  });

  socket.on('confirm login', function (params) {
    if(!shadowclient || !shadowclient.connected || shadowclient.username != params.username) {
      username = params.username;
      shadowclient = new ShadowClient(params);
      wireShadowEvents(username);
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
    console.log('websocket disconnected');
    if(shadowclient && shadowclient.connected) {
      shadowclient.write('QQ\r\n');
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

    shadowclient.on('block', function (data) {
      // console.log('input: ' + JSON.stringify(data));
      if(shadowclient.loggedIn) { socket.emit('block', data); }
    });

  }

});