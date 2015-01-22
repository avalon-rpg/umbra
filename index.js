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

// Chatroom

// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'add user', this listens and executes
  socket.on('attemptlogin', function (username, password) {
    var shadowclient = new ShadowClient(username, password);

    shadowclient.on('connect', function() {
      console.log('server connected, attempting login for ' + username);
    });


    // we store the username in the socket session for this client
    socket.username = username;
    socket.shadowclient = shadowclient;

    shadowclient.on('login success', function() {
      console.log('login success for user ' + username);
      socket.emit('login success', { numUsers: numUsers });
      shadowclient.write('who\r\n');
    });

    shadowclient.on('user', function (user) {
      socket.emit('user joined', {
        username: user,
        numUsers: numUsers
      });
    });

    shadowclient.on('tell', function (who, text) {
      console.log("tell from: " + who + ' with text "' + text + '"');
      socket.emit('tell from', who, text);
    });

    socket.on('new message', function (text) {
      shadowclient.write(text + '\r\n');
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
      console.log('websocket disconnected for ' + username);
      if(shadowclient.connected) {
        shadowclient.write('QQ\r\n');
      }
    });

        // when the user disconnects.. perform this
    shadowclient.on('avalon disconnected', function (had_error) {
      console.log('avalon disconnected for ' + username)
      socket.emit('avalon disconnected', had_error);
    });
  });

});