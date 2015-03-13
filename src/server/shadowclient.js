'use strict';
let util = require('util');
let net = require('net');
let binary = require('binary');

let EventEmitter = require('events').EventEmitter;

if (typeof String.prototype.startsWith !== 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) === 0;
  };
}


function ShadowClient(params) {
  this.init(params);
}

util.inherits(ShadowClient, EventEmitter);

ShadowClient.prototype.init = function(params) {
  let self = this;

  self.host = params.host || '184.173.130.145';
  self.port = params.port || 23;
  self.username = params.username;
  self.password = params.password;
  self.gender = params.gender;
  self.email = params.email || '';
  self.create = params.create || false;

  self.emit('attempting avalon login to host: ' + self.host + ', port: ' + self. port);

  // console.log('ShadowLogin initialising as: ' + JSON.stringify(self));

  this.conn = net.connect({port: self.port, host: self.host}, function() {
    self.connected = true;
    self.emit('avalon connected, host: ' + self.host + ', port: ' + self.port);
  });

  const IAC = 255;
  const GA  = 249;
  const gaSeq = new Buffer([IAC,GA]);

  let onLine = function (line) {
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

    if(self.username == 'gwahir') {
      console.log(self.username + ' « ' + line);
    }
    self.emit('line', line);
  };

  let onPrompt = function (prompt) {
    if(!self.badCredentials && prompt.indexOf('What is the name of your character?') === 0) {
      self.loggingIn = true;
      console.log('login prompt seen');
      let loginline;
      if(self.create) {
        console.log('attempting to log in new user ' + self.username + ' with email ' + self.email);
        loginline = '###ack create ' + self.username + ' ' + self.password + ' ' + self.gender + ' ' + self.email;
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
        let block = vars.gablock.toString('ascii');
        let lines = block.split("\r\n");
        let lineCount = lines.length;
        for (let i = 0; i < lineCount; i++) {
          if(i === lineCount - 1) { onPrompt(lines[i]); }
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
    if(self.username == 'gwahir') {
      console.log(self.username + ' » ' + input);
    }
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
