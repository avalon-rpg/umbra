var util = require('util');
var net = require('net');
var binary = require('binary');


var EventEmitter = require('events').EventEmitter;

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}


function ShadowClient(params) {
  this.init(params);
}

util.inherits(ShadowClient, EventEmitter);

ShadowClient.prototype.init = function(params) {
  var self = this;

  self.username = params.username;
  self.password = params.password;
  self.gender = params.gender;
  self.email = params.email || '';
  self.create = params.create || false;

  // console.log('ShadowLogin initialising as: ' + JSON.stringify(self));

  this.conn = net.connect({port: 23, host: '184.173.130.145'}, function() {
    self.connected = true;
    self.emit('avalon connected');
  });

  var IAC = 255;
  var GA  = 249;
  var gaSeq = new Buffer([IAC,GA]);

  var onLine = function (line) {
    if(!self.loggedIn) {
      if(self.loggingIn) {
        if(line.startsWith('###ACK LOGIN OK')) {
          self.loggedIn = true;
          self.loggingIn = false;
          self.emit('login result', {
            success: true            
          });
        } else if(line.startsWith('ERROR: ###ACK ERROR @ bad persona')) {
          self.loggedIn = false;
          self.loggingIn = false;
          self.badCredentials = true;
          self.connected = false;
          self.emit('login result', {
            success: false,
            username: self.username,
            reason: 'bad username'
          });
        } else if(line.startsWith('ERROR: ###ACK ERROR @ bad password')) {
          self.loggedIn = false;
          self.loggingIn = false;
          self.badCredentials = true;
          self.connected = false;
          self.emit('login result', {
            success: false,
            username: self.username,
            reason: 'bad password'
          });
        } else {
          console.log('Unexpected login response: ' + line);
        }
      } else {
        //console.log('skipping line before login: ' + line);
      }

      return;
    }

    self.emit('line', line);
  };

  var onPrompt = function (prompt) {
    if(!self.badCredentials && prompt.indexOf('What is the name of your character?') == 0) {
      self.loggingIn = true;
      console.log('login prompt seen');
      var loginline;
      if(self.create) {
        console.log('attempting to log in new user ' + self.username);
        loginline = '###ack create ' + self.username + ' ' + self.password + ' ' + self.gender + ' ' + self.email;
        console.log(loginline);
      } else {
        console.log('attempting to log in existing user ' + self.username);
        loginline = '###ack login ' + self.username + ' ' + self.password;
      }
      self.conn.write(loginline + '\r\n');
      return;
    }
    if(self.loggedIn) {
      self.emit('prompt', prompt);
    }
  };

  var parser = binary().loop(function (end, vars) {
    this.scan('gablock', gaSeq).tap( function(vars) {
      if(vars.hasOwnProperty('gablock')) {
        var block = vars.gablock.toString('ascii');
        var lines = block.split("\r\n");
        var lineCount = lines.length;
        for (var i = 0; i < lineCount; i++) {
          if(i == lineCount - 1) { onPrompt(lines[i]); }
          else                   { onLine(lines[i]); }
        }
      }
    });
  });

  self.conn.pipe(parser);

  self.conn.on('close', function (had_error) {
    console.log("shadow client closing for " + self.username);
    self.connected = false;
    self.emit('avalon disconnected', had_error);
  });

};

ShadowClient.prototype.write = function(input) {
  if(this.connected) {
    this.conn.write(input);  
  } else {
    console.error('couldn\'t send msg to disconnected client: ' + input);
  }  
};

ShadowClient.prototype.close = function() {
  if(this.connected) {
    // this.conn.end();  
  }  
};

module.exports = ShadowClient;
