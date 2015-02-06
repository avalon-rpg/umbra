var util = require('util');
var net = require('net');
var binary = require('binary');
var stripAnsi = require('strip-ansi');


var EventEmitter = require('events').EventEmitter;

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}

if (!Array.prototype.last){
  Array.prototype.last = function(){
    return this[this.length - 1];
  };
}

if (typeof RegExp.prototype.withMatch != 'function') {
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

  var currentBlock;
  var monospacedBlock = false;

  function queueOutput(data) {
    if(currentBlock) {
      currentBlock.push(data);
    } else {
      currentBlock = [data];
    }
  }

  self.username = params.username;
  self.password = params.password;
  self.gender = params.gender;
  self.email = params.email || '';
  self.create = params.create || false;

  // console.log('ShadowLogin initialising as: ' + JSON.stringify(self));

  var inMap = false;
  var mapLoc = '';
  var mapLines = [];

  var inMultilineMsg = false;
  var multilineMsgData = {};

  var inNotification = false;
  var notificationLines = [];

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



  var fnEndMap = function(match) {
    queueOutput({
      qual:  'map',
      loc:    mapLoc,
      region: match[1],
      lines:  mapLines
    });
    mapLoc = '';
    mapLines = [];
    inMap = false;
  };

  var fnEndMultilineMsg = function(match) {
    if(inMultilineMsg && multilineMsgData) {
      console.log('ending multiline message');
      queueOutput(multilineMsgData);
    }
    inMultilineMsg = false;
    multilineMsgData = undefined;
  };

  var sequences = [
    {
      regex: /^Vicinity MAP around "(.+)" location:$/,
      func: function(match) {
        mapLoc = match[1];
        inMap = true;
      }
    },{
      regex: /^Map depicts (.*)\. Your location is highlighted\.$/,
      cond: function() { return inMap; },
      func: fnEndMap
    },{
      regex: /^Map depicts (.*) environs with your location highlighted\.$/,
      cond: function() { return inMap; },
      func: fnEndMap
    },{
      regex: /^Map depicts (.*)$/,
      cond: function() { return inMap; },
      func: fnEndMap
    },{
      regex: /^.*$/,
      cond: function() { return inMap; },
      func: function(match, rawLine) {
        mapLines.push(rawLine);
      }
    },{
      regex: /^###msg@ (.+)$/,
      func: function(match) {
        var data = { qual: 'avmsg' };
        var parts = match[1].split('###');
        var partcount = parts.length;
        for (var i = 1; i < partcount; i++) {
          var part = parts[i];
          var keyarr = part.split('=', 1);
          var key = keyarr[0];
          var value = part.substring(key.length + 1);
          data[key] = value.trim();
        }
        queueOutput(data);
      }
    },{
      regex: /^###begin@ (.+)$/,
      func: function(match) {
        ///for now, don't treat 'stdio' as a valid multiline tag
        if(match[1].indexOf('tag=stdio') >= 0) {
          console.log('NOT starting multiline message for stdio input: ' + match[0]);
        } else {
          console.log('multiline message start: ' + match[0]);
          inMultilineMsg = true;
          multilineMsgData = {qual: 'avmsg'};
          var parts = match[1].split('###');
          var partcount = parts.length;
          for (var i = 1; i < partcount; i++) {
            var part = parts[i];
            var keyarr = part.split('=', 1);
            var key = keyarr[0];
            var value = part.substring(key.length + 1);
            multilineMsgData[key] = value.trim();
          }
          multilineMsgData.text = [];
        }
      }
    },{
      regex: /^###end@.*$/,
      func: fnEndMultilineMsg
    },{
      regex: /^.*$/,
      cond: function() { return inMultilineMsg; },
      func: function(match, rawLine) {
        console.log('multiline message part: ' + rawLine);
        multilineMsgData.text.push(rawLine);
      }
    },{
      regex: /^###channel (\S+) (.+)$/,
      func: function(match) {
        queueOutput({
          qual: 'channel',
          code:  match[1],
          name:  match[2]
        });
      }
    },{
      regex: /^Your rune-bug picks up words: (.+)$/,
      func: function(match) {
        queueOutput({
          chan: 'rune-bug',
          qual: 'rune-bug',
          msg:  match[1]
        });
      }
    },{
      regex: /^(\S+) novice-calls from (.+?): "(.*)"$/,
      func: function(match) {
        queueOutput({
          qual: 'novice-calling from',
          who:  match[1],
          chan: 'novices',
          city: match[2],
          msg: match[3]
        });
      }
    },{
      regex: /^You novice-call from (.+?): "(.*)"$/,
      func: function(match) {
        queueOutput({
          qual: 'novice-calling to',
          chan: 'novices',
          city: match[1],
          msg: match[2]
        });
      }
    },{
      regex: /^(\S+) novice-calls: "(.*)"$/,
      func: function(match) {
        queueOutput({
          qual: 'novice-calling from',
          who:  match[1],
          chan: 'novices',
          msg: match[2]
        });
      }    },{
      regex: /^(\S+) calls to (.+?): "(.*)"$/,
      func: function(match) {
        queueOutput({
          qual: 'calling from',
          who:  match[1],
          chan: match[2],
          msg: match[3]
        });
      }
    },{
      regex: /^You call to (.+?): "(.*)"$/,
      func: function(match) {
        queueOutput({
          qual: 'calling to',
          who: 'You',
          chan: match[1],
          msg: match[2]
        });
      }
    },{
      regex: /^(.*?) tells you, "(.*)"$/,
      func: function(match) {
        queueOutput({
          qual: 'tell from',
          who:  match[1],
          //chan: 'From',
          msg:  match[2]
        });
      }
    },{
      regex: /^You (tell|answer) (.*?), "(.*)"$/,
      func: function(match) {
        queueOutput({
          qual: 'tell to',
          who:  match[2],
          //chan: 'To',
          msg:  match[3]
        });
      }
    },{
      regex: /^(.+?) (asks|says|exclaims), "(.+)"$/,
      func: function(match) {
        queueOutput({
          qual: 'speech from',
          who:  match[1],
          msg:  match[3]
        });
      }
    },{
      regex: /^You (ask|say|exclaim), "(.+)"$/,
      func: function(match) {
        queueOutput({
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
        queueOutput(data);
      }
    },{
      regex: /^###(\S+) ?(.*)$/,
      func: function(match) {
        queueOutput({
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
    var cleanline = stripAnsi(line);
    if(!self.loggedIn) {
      if(self.loggingIn) {
        if(cleanline.startsWith('###ACK LOGIN OK')) {
          self.loggedIn = true;
          self.loggingIn = false;
          self.emit('login result', {
            success: true            
          });
        } else if(cleanline.startsWith('ERROR: ###ACK ERROR @ bad persona')) {
          self.loggedIn = false;
          self.loggingIn = false;
          self.badCredentials = true;
          self.connected = false;
          self.emit('login result', {
            success: false,
            username: self.username,
            reason: 'bad username'
          });
        } else if(cleanline.startsWith('ERROR: ###ACK ERROR @ bad password')) {
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

    if(cleanline.startsWith('###')) { fnEndMultilineMsg([]); }

    if (cleanline == '###notification begin') {
      inNotification = true;
      return;
    }

    if (cleanline == '###notification end')   {
      queueOutput({
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

    var seqLen = sequences.length;
    for (var i = 0; i < seqLen; i++) {
      var entry = sequences[i];
      if(entry.cond == undefined || entry.cond()) {
        var match = entry.regex.exec(cleanline);
        if (match) {
          entry.func(match, line);
          return;
        }
      }
    }

    //default fallback
    if(line.trim() != '') {
      if(line.indexOf('   ') >= 0) {
        monospacedBlock = true;
      }
      queueOutput({
        qual: 'unparsed',
        line: line
      });
    }
  };

  var onPrompt = function (prompt) {


    if(!self.badCredentials && prompt.indexOf('What is the name of your character?') == 0) {
      self.loggingIn = true;
      console.log('login prompt seen');
      var loginline;
      if(self.create) {
        console.log('attempting to log in new user ' + self.username);
        loginline = '###ack create ' + self.username + ' ' + self.password + ' ' + self.gender;
        console.log(loginline);
      } else {
        console.log('attempting to log in existing user ' + self.username);
        loginline = '###ack login ' + self.username + ' ' + self.password;
      }
      self.conn.write(loginline + '\r\n');
      return;
    }
    if(self.loggedIn) {
      fnEndMultilineMsg(); //end any ongoing multiline message
      self.emit('block', {
        monospaced: monospacedBlock,
        entries:    currentBlock,
        prompt:     prompt
      });
      monospacedBlock = false;
      currentBlock = null;
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
