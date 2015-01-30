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
  var user = user;
  var conn;
  var loggingIn = false;
  var loggedIn = false;
  var badCredentials = false;
  var connected = false;
  this.init(user, pass);
}

util.inherits(ShadowClient, EventEmitter);

ShadowClient.prototype.init = function(user, pass) {
  var self = this;
  var inWhoList = false;
  var inNotification = false;
  var notificationLines = [];

  this.user = user;
  this.pass = pass;

  this.conn = net.connect({port: 23, host: '184.173.130.145'}, function() {
    self.connected = true;
    self.emit('avalon connected');
  });

  var IAC = 255;
  var GA  = 249;
  var gaSeq = new Buffer([IAC,GA]);


  // needs handling:
  //
  // Gigglefluff of Mercinae (scholar; on the hunter course) is requesting ADVICE at "Gardens of the Hunter Gatherer school". Your help may be needed.
  // Andreu novice-calls: "Or just send a TELL to me."

  var sequences = [
    {
      regex: /^###channel (\S+) (.+)$/,
      func: function(match) {
        self.emit('input', {
          qual: 'channel',
          code:  match[1],
          name:  match[2]
        });
      }
    },{
      regex: /^Your rune-bug picks up words: (.+)$/,
      func: function(match) {
        self.emit('input', {
          qual: 'rune-bug',
          msg:  match[1]
        });
      }
    },{
      regex: /^(\S+) novice-calls from (.+): "(.*)"$/,
      func: function(match) {
        self.emit('input', {
          qual: 'novice-calling from',
          who:  match[1],
          chan: match[2],
          msg: match[3]
        });
      }
    },{
      regex: /^You novice-call from (.+): "(.*)"$/,
      func: function(match) {
        self.emit('input', {
          qual: 'novice-calling to',
          chan: match[1],
          msg: match[2]
        });
      }
    },{
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
      regex: /^You (tell|answer) (.*), "(.*)"$/,
      func: function(match) {
        self.emit('input', {
          qual: 'tell to',
          who:  match[2],
          msg:  match[3]
        });
      }
    },{
      regex: /^(.+) (asks|says|exclaims), "(.+)"$/,
      func: function(match) {
        self.emit('input', {
          qual: 'speech from',
          who:  match[1],
          msg:  match[3]
        });
      }
    },{
      regex: /^You (ask|say|exclaim), "(.+)"$/,
      func: function(match) {
        self.emit('input', {
          qual: 'speech to',
          msg:  match[2]
        });
      }
    },{
      regex: /^###user@ (.*)$/,
      func: function(match) {
        var data = { qual: 'user' };
        var parts = match[1].split('###');
        var partcount = parts.length;
        for (var i = 1; i < partcount; i++) {
          var part = parts[i];
          var keyarr = part.split(' ', 1);
          var key = keyarr[0];
          var value = part.substring(key.length);
          data[key] = value.trim();
        }
        self.emit('input', data);
      }
    },{
      regex: /^( *)###(\S+) ?(.*)$/,
      func: function(match) {
        self.emit('input', {
          qual: 'protocol',
          code:  match[1],
          content:  match[2]
        });
      }
    }
  ];


// Your rune-bug picks up words: Billum asks, "Did you find an emerald?"
// Your rune-bug picks up words: Satsuki answers Craftmaster Billum Submerged Involved, "Thank you."

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
            username: user,
            reason: 'bad username'
          });
        } else if(line.startsWith('ERROR: ###ACK ERROR @ bad password')) {
          self.loggedIn = false;
          self.loggingIn = false;
          self.badCredentials = true;
          self.connected = false;
          self.emit('login result', {
            success: false,
            username: user,
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

    if (line == '###notification begin') {
      inNotification = true;
      return;
    }

    if (line == '###notification end')   {
      self.emit('input',{
        qual: 'notification',
        lines: notificationLines
      });
      inNotification = false;
      notificationLines = [];
      return;
    }

    if(inNotification) {
      notificationLines.push(line);
      return;
    }

    // if (line == '###begin') { inWhoList = true; return; }

    // if (line == '###end')   { inWhoList = false; return; }

    // if(inWhoList) {
    //   self.emit('input',{
    //     qual: 'user',
    //     who: line
    //   });
    //   return;
    // }

    var seqLen = sequences.length;
    for (var i = 0; i < seqLen; i++) {
      var entry = sequences[i];
      var match = entry.regex.exec(line);
      if(match) { entry.func(match); return; }
    }

    //default fallback
    self.emit('input', {
      qual: 'unparsed',
      line: line
    });
  }

  var onPrompt = function (prompt) {


    if(!self.badCredentials && prompt.indexOf('What is the name of your character?') == 0) {
      self.loggingIn = true;
      console.log('login prompt seen');
      var loginline = '###ack login ' + user + ' ' + pass;
      console.log('sending credentials');
      self.conn.write(loginline + '\r\n');
      return;
    }
    if(self.loggedIn) {
      self.emit('prompt', prompt);
    }
  }

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
    console.log("shadow client closing for " + user);
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

ShadowClient.prototype.close = function() {
  if(this.connected) {
    // this.conn.end();  
  }  
}

module.exports = ShadowClient
