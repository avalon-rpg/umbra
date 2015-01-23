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

if (typeof RegExp.prototype.withMatch != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}

function ShadowClient(user, pass) {
  var conn;
  var loggedIn = false;
  var connected = false;
  this.init(user, pass);
}

util.inherits(ShadowClient, EventEmitter);

ShadowClient.prototype.init = function(user, pass) {
  var self = this;
  var inWhoList = false;

  this.user = user;
  this.pass = pass;

  this.conn = net.connect({port: 23, host: '184.173.130.145'}, function() {
    self.connected = true;
    this.emit('avalon connected');
  });

  var IAC = 255;
  var GA  = 249;
  var gaSeq = new Buffer([IAC,GA]);

  var sequences = [
    {
      regex: /^(\S+) calls to (.+): "(.*)"$/,
      func: function(match) {
        self.emit('input', {
          qual: 'calling from',
          who:  match[1],
          chan: match[2],
          msg: match[3]
        });
      }
    },{
      regex: /^You call to (.+): "(.*)"$/,
      func: function(match) {
        self.emit('input', {
          qual: 'calling to',
          chan: match[1],
          msg: match[2]
        });
      }
    },{
      regex: /^(.*) tells you, "(.*)"$/,
      func: function(match) {
        self.emit('input', {
          qual: 'tell from',
          who:  match[1],
          msg:  match[2]
        });
      }
    },{
      regex: /^You tell (.*), "(.*)"$/,
      func: function(match) {
        self.emit('input', {
          qual: 'tell to',
          who:  match[1],
          msg:  match[2]
        });
      }
    }
  ];

  var onLine = function (line) {
    if(!this.loggedIn) {
      if(line.startsWith('###ACK LOGIN OK')) {
        this.loggedIn = true;
        self.emit('login success');
      }
      return;
    } 

    if (line == '###begin') { inWhoList = true;  return; }
    if (line == '###end')   { inWhoList = false; return; }

    if(inWhoList) {
      self.emit('input',{
        qual: 'user',
        who: line
      });
      return;
    }

    var seqLen = sequences.length;
    for (var i = 0; i < seqLen; i++) {
      var entry = sequences[i];
      var match = entry.regex.exec(line);
      if(match) { entry.func(match); return; }
    }

    //default fallback
    self.emit('line', line);
    self.emit('input', {
      qual: 'unparsed',
      line: line
    });
  }

  var onPrompt = function (prompt) {
    if(prompt.indexOf('What is the name of your character?') == 0) {
      self.conn.write('###ack login ' + user + ' ' + pass + '\r\n');
    }
  }

  var parser = binary().loop(function (end, vars) {
    this.scan('gablock', gaSeq).tap( function(vars) {
      if(vars.hasOwnProperty('gablock')) {
        var block = vars.gablock.toString('ascii');
        var lines = block.split("\r\n");
        var lineCount = lines.length;
        for (var i = 0; i < lineCount; i++) {
          if(i == lineCount - 1) { onPrompt(lines[i].trim()); }
          else                   { onLine(lines[i].trim()); }
        }
      }
    });
  });

  this.conn.pipe(parser);

  this.conn.on('close', function (had_error) {
    self.connected = false;
    self.emit('avalon disconnected', had_error);
  });

}

ShadowClient.prototype.write = function(input) {
  if(this.connected) {
    this.conn.write(input);  
  } else {
    console.error('couldn\'t send msg to disconnected client: ' + input);
  }

  
}

module.exports = ShadowClient
