'use strict';
let util = require('util');
let net = require('net');
let binary = require('binary');

let EventEmitter = require('events').EventEmitter;
let GaBlockSplitter = require('./gaBlockSplitter');

if (typeof String.prototype.startsWith !== 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) === 0;
  };
}

function ShadowClient(params) {
  EventEmitter.call(this);
  this.init(params);
}

util.inherits(ShadowClient, EventEmitter);

ShadowClient.prototype.init = function(params) {
  let self = this;
  self.setMaxListeners(30);

  self.host = 'avalon-rpg.com';
  self.port = 23;
  if(params.game && params.game === 'legends') {
    self.host = 'legends.avalon-rpg.com';
  }
  self.username = params.username;
  self.password = params.password;
  self.gender = params.gender;
  self.email = params.email || '';
  self.create = params.create || false;

  console.log('attempting avalon login to host: ' + self.host + ', port: ' + self. port);

  // console.log('ShadowLogin initialising as: ' + JSON.stringify(self));

  self.conn = net.connect({port: self.port, host: self.host}, function() {
    self.connected = true;
    if(params.playerAddress) {
      self.conn.write('###hub ' + params.playerAddress + '\r\n');
    }
    console.log('avalon connected, host: ' + self.host + ', port: ' + self.port);
  });

  let onLine = function (line) {
    if(!self.loggedIn) {
      if(self.loggingIn) {
        if(line.startsWith('###ACK LOGIN OK')) {
          console.log(self.username + ' « ' + line);
          self.loggedIn = true;
          self.loggingIn = false;
          self.emit('login result', {
            success: true            
          });
        } else if(line.startsWith('ERROR: ###ACK ERROR @ bad persona')) {
          console.log(self.username + ' « ' + line);
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
          console.log(self.username + ' « ' + line);
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

    if(self.username === 'gwahir') {
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
      if(self.username === 'gwahir') {
        console.log(self.username + ' ««««««««««««« ' + prompt);
      }
      self.emit('prompt', prompt);
    }
  };

  let blockSplitter = new GaBlockSplitter({
    input: self.conn,
    blockDebug: false,
    lineDebug: (self.username === 'gwahir'),
    onLine: onLine,
    onPrompt: onPrompt
  });

  self.conn.on('close', function (had_error) {
    console.log("shadow client closing for " + self.username);
    self.connected = false;
    blockSplitter = null;
    self.emit('avalon disconnected', had_error);
  });

};

ShadowClient.prototype.write = function(input) {
  if(this.connected) {
    if(this.username === 'gwahir') {
      console.log(this.username + ' » ' + input);
    }
    this.conn.write(input);  
  } else {
    console.error('couldn\'t send msg to disconnected client: ' + input);
  }  
};

ShadowClient.prototype.close = function() {
  if(this.connected) {
    this.conn.write('###ack logout ' + this.username + '\r\n');
  }
};

ShadowClient.prototype.pause = function() {
  if (this.connected) {
    this.conn.write('AURA WHO ON\r\n');
  }
};

module.exports = ShadowClient;
