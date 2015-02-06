var util = require('util');
var stripAnsi = require('strip-ansi');
var EventEmitter = require('events').EventEmitter;

/////////////////////////////////////////
// Helpful helpers

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

/////////////////////////////////////////
// AvParser setup


function AvParser(shadowclient) {
  this.init(shadowclient);
}

util.inherits(AvParser, EventEmitter);

AvParser.prototype.init = function(shadowclient) {
  var self = this;
  self.shadowclient = shadowclient;

  var blockStack;
  var currentBlock;
  var emptyStrArray = [''].pop();

  function appendOutput(data) {
    console.log('outputting: ' + JSON.stringify(data));
    if (!currentBlock) {
      currentBlock = {
        tags: emptyStrArray,
        entries: [data]
      };
    } else if (!currentBlock.entries) {
      currentBlock.entries = [data];
    } else {
      currentBlock.entries.push(data);
    }
    if (!blockStack || blockStack.length == 0) {
      blockStack = [currentBlock];
    }
  }

  function enterBlock(newBlock) {
    var block = newBlock;
    if(typeof block.tags == 'undefined') {
      block.tags = emptyStrArray;
    }
    currentBlock = block;
    console.log('entering block at depth ' + blockStack.length + ': ' + JSON.stringify(block));
    blockStack.push(block);
  }

  function tagBlock(tag) {
    if(!currentBlock.tags || currentBlock.tags.length == 0) {
      currentBlock.tags = [tag];
    } else {
      currentBlock.tags.push(tag);
    }
  }
  function exitBlock() {
    if(blockStack.length > 1) {
      var block = blockStack.pop();
      console.log('================================================================');
      console.log("popping block: " + JSON.stringify(block));
      console.log("blockstand depth is now : " + blockStack.length);
      console.log('================================================================');
      currentBlock = blockStack.last();
      appendOutput(block);
    }
  }

  function flushOutput() {
    while(blockStack.length > 1) {
      exitBlock();
    }
    self.emit('block', currentBlock);
    currentBlock = null;
  }


  var inMap = false;
  var mapLoc = '';
  var mapLines = [];

  // needs handling:
  //
  // Gigglefluff of Mercinae (scholar; on the hunter course) is requesting ADVICE at "Gardens of the Hunter Gatherer school". Your help may be needed.



  var fnEndMap = function(match) {
    appendOutput({
      qual:  'map',
      loc:    mapLoc,
      region: match[1],
      lines:  mapLines
    });
    mapLoc = '';
    mapLines = [];
    inMap = false;
  };

  //var fnEndMultilineMsg = function(match) {
  //  if(inMultilineMsg && multilineMsgData) {
  //    console.log('ending multiline message');
  //    appendOutput(multilineMsgData);
  //  }
  //  inMultilineMsg = false;
  //  multilineMsgData = undefined;
  //};

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
        appendOutput(data);
      }
    },{
      regex: /^###begin@ (.+)$/,
      func: function(match) {
        console.log('multiline message start: ' + match[0]);
        newBlock = {qual: 'avmsg'};
        var parts = match[1].split('###');
        var partcount = parts.length;
        for (var i = 1; i < partcount; i++) {
          var part = parts[i];
          var keyarr = part.split('=', 1);
          var key = keyarr[0];
          var value = part.substring(key.length + 1);
          newBlock[key] = value.trim();
        }
        enterBlock(newBlock);
      }
    },{
      regex: /^###end@.*$/,
      func: exitBlock
    },{
      regex: /^You engage in a moment's deep thought, gathering a sense of the domain\.$/,
      func: function(match, rawLine) {
        tagBlock('sphere sense');
      }
    },{
      regex: /^###channel (\S+) (.+)$/,
      func: function(match) {
        appendOutput({
          qual: 'channel',
          code:  match[1],
          name:  match[2]
        });
      }
    },{
      regex: /^Your rune-bug picks up words: (.+)$/,
      func: function(match) {
        appendOutput({
          chan: 'rune-bug',
          qual: 'rune-bug',
          msg:  match[1]
        });
      }
    },{
      regex: /^(\S+) novice-calls from (.+?): "(.*)"$/,
      func: function(match) {
        appendOutput({
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
        appendOutput({
          qual: 'novice-calling to',
          chan: 'novices',
          city: match[1],
          msg: match[2]
        });
      }
    },{
      regex: /^(\S+) novice-calls: "(.*)"$/,
      func: function(match) {
        appendOutput({
          qual: 'novice-calling from',
          who:  match[1],
          chan: 'novices',
          msg: match[2]
        });
      }    },{
      regex: /^(\S+) calls to (.+?): "(.*)"$/,
      func: function(match) {
        appendOutput({
          qual: 'calling from',
          who:  match[1],
          chan: match[2],
          msg: match[3]
        });
      }
    },{
      regex: /^You call to (.+?): "(.*)"$/,
      func: function(match) {
        appendOutput({
          qual: 'calling to',
          who: 'You',
          chan: match[1],
          msg: match[2]
        });
      }
    },{
      regex: /^(.*?) tells you, "(.*)"$/,
      func: function(match) {
        appendOutput({
          qual: 'tell from',
          who:  match[1],
          //chan: 'From',
          msg:  match[2]
        });
      }
    },{
      regex: /^You (tell|answer) (.*?), "(.*)"$/,
      func: function(match) {
        appendOutput({
          qual: 'tell to',
          who:  match[2],
          //chan: 'To',
          msg:  match[3]
        });
      }
    },{
      regex: /^(.+?) (asks|says|exclaims), "(.+)"$/,
      func: function(match) {
        appendOutput({
          qual: 'speech from',
          who:  match[1],
          msg:  match[3]
        });
      }
    },{
      regex: /^You (ask|say|exclaim), "(.+)"$/,
      func: function(match) {
        appendOutput({
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
        appendOutput(data);
      }
    },{
      regex: /^###(\S+) ?(.*)$/,
      func: function(match) {
        appendOutput({
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

    //if(cleanline.startsWith('###')) { fnEndMultilineMsg([]); }

    //if (cleanline == '###notification begin') {
    //  inNotification = true;
    //  return;
    //}
    //
    //if (cleanline == '###notification end')   {
    //  appendOutput({
    //    qual: 'notification',
    //    lines: notificationLines
    //  });
    //  inNotification = false;
    //  notificationLines = [];
    //  return;
    //}
    //
    //if(inNotification) {
    //  notificationLines.push(line);
    //  return;
    //}

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
      appendOutput({
        qual: 'unparsed',
        line: line
      });
    }
  };


  var onPrompt = function(prompt) {
    flushOutput()
  };

  ///////////////////////////////////////////
  // shadowclient event handlers

  self.shadowclient.on('line', onLine);

  self.shadowclient.on('prompt', onPrompt);

  self.shadowclient.on('login result', function (data) {
    self.emit('login result', data);
  });

  self.shadowclient.on('avalon connected', function () {
    self.connected = false;
    self.emit('avalon connected');
  });

  self.shadowclient.on('avalon disconnected', function (had_error) {
    self.connected = false;
    self.emit('avalon disconnected', had_error);
  });

};


AvParser.prototype.write = function(input) { this.shadowclient.write(input); };

AvParser.prototype.close = function() { this.shadowclient.close(); };

module.exports = AvParser;
