'use strict';
var util = require('util');
var stripAnsi = require('strip-ansi');
var EventEmitter = require('events').EventEmitter;

/////////////////////////////////////////
// Helpful helpers

if (typeof String.prototype.startsWith !== 'function') {
  String.prototype.startsWith = function (str){
    return this.indexOf(str) === 0;
  };
}

if (!Array.prototype.last){
  Array.prototype.last = function(){
    return this[this.length - 1];
  };
}

/////////////////////////////////////////
// AvParser setup


function AvParser(shadowclient) {
  this.init(shadowclient);
}

util.inherits(AvParser, EventEmitter);

AvParser.prototype.init = function(shadowclient) {
  let self = this;
  self.shadowclient = shadowclient;

  var blockStack;
  var currentBlock;

  function appendOutput(data) {
    //console.log('appending: ' + JSON.stringify(data));
    if (!currentBlock) {
      pushBlock({
        qual: 'block',
        tags: ['block'],
        entries: [data]
      });
    } else if (!currentBlock.entries) {
      currentBlock.entries = [data];
    } else {
      currentBlock.entries.push(data);
    }
  }

  function pushBlock(block) {
    if (!blockStack || blockStack.length === 0) {
      blockStack = [block];
    } else {
      blockStack.push(block);
    }
    currentBlock = block;
    //console.log('entering block at depth ' + blockStack.length + ': ' + JSON.stringify(block));
  }

  //returns true if the tag was added
  function tagBlock(tag) {
    if(!currentBlock.tags || currentBlock.tags.length === 0) {
      currentBlock.tags = [tag];
      return true;
    } else {
      if(currentBlock.tags.indexOf(tag) < 0) {
        currentBlock.tags.push(tag);
        return true;
      }
    }
    return false;
  }

  function exitBlock() {
    if(currentBlock && currentBlock.entries && currentBlock.entries.length === 1) {
      var soleEntry = currentBlock.entries[0];
      if(soleEntry.comms) {
        currentBlock = soleEntry;
        return false;
      } else {
        tagBlock('oneliner');
      }
    }
    if(blockStack && blockStack.length > 1) {
      var block = blockStack.pop();
      currentBlock = blockStack.last();
      appendOutput(block);
      return true;
    } else {
      return false;
    }
  }

  function flushOutput() {
    while( exitBlock() ){
      //do nowt
    }

    if(currentBlock) {
      self.emit('block', currentBlock);
      currentBlock = null;
      blockStack = null;
    }
  }


  var inMap = false;
  var mapLoc = '';
  var mapLines = [];

  // needs handling:
  //
  // Gigglefluff of Mercinae (scholar; on the hunter course) is requesting ADVICE at "Gardens of the Hunter Gatherer school". Your help may be needed.



  function endMapFor(region) {
    appendOutput({
      qual:  'map',
      loc:    mapLoc,
      region: region,
      lines:  mapLines
    });
    mapLoc = '';
    mapLines = [];
    inMap = false;
  }

  var fnEndMap = function(match) { endMapFor(match[1]); };

  var sequences = [
    {
      regex: /^Initiating CLIENT \/ AVALON protocol codes\.$/,
      func: function(match) {/* do nothing*/}
    },{
      regex: /^Vicinity MAP around "(.+)" location:$/,
      func: function(match) {
        mapLoc = match[1];
        inMap = true;
      }
    },{
      regex: /^Map depicts (.*)\. Your location is highlighted\.$/,
      cond: () => inMap,
      func: fnEndMap
    },{
      regex: /^Map depicts (.*) environs with your location highlighted\.$/,
      cond: function() { return inMap; },
      func: fnEndMap
    },{
      regex: /^Map shows (.*)\. Your location is highlighted\.$/,
      cond: function() { return inMap; },
      func: fnEndMap
    },{
      regex: /^Map shows (.*) environs with your location highlighted\.$/,
      cond: function() { return inMap; },
      func: fnEndMap
    },{
      regex: /^Map depicts (.*)$/,
      cond: function() { return inMap; },
      func: fnEndMap
    },{
      regex: /^Map shows (.*)$/,
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
        //console.log('multiline message start: ' + match[0]);
        let newBlock = {qual: 'avmsg'};
        let parts = match[1].split('###');
        let partcount = parts.length;
        for (var i = 1; i < partcount; i++) {
          var part = parts[i];
          var keyarr = part.split('=', 1);
          var key = keyarr[0];
          var value = part.substring(key.length + 1);
          if(key === 'tag') {
            var tags = value.split(' ');
            tags.push('block');
            newBlock.tags = tags;
          } else {
            newBlock[key] = value.trim();
          }
        }
        pushBlock(newBlock);
      }
    },{
      regex: /^###end@.*$/,
      func: exitBlock
    },{
      regex: /^You engage in a moment's deep thought, gathering a sense of the domain\.$/,
      func: function(match, rawLine) {
        appendOutput({ qual: 'marker', markerFor: 'spheresense' });
        tagBlock('spheresense');
      }
    },{
      regex: /^Guild Name *\| Guildhead *\| Patron Deity *\| Where *$/,
      func: function(match, rawLine) {
        appendOutput({ qual: 'marker', markerFor: 'guilds' });
        tagBlock('guilds');
      }
    },{
      regex: /^(\S) BB: +Read (\d+) out of (\d+)$/,
      func: function(match, rawLine) {
        if(tagBlock('bbstatus')) {
          appendOutput({ qual: 'marker', markerFor: 'bbstatus' });
        }
        appendOutput({qual: 'line',  line: rawLine});
      }
    },{
      //de-dupling locations in oracular watch
      regex: /^At "(.*)": (At \1: )(.*)\.$/,
      func: function(match, rawLine) {
        let spammyBit = match[2];
        appendOutput({
          qual: 'line',
          line: rawLine.replace(spammyBit, '')
        });
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
        let suppress = false;
        let txt = match[1];

        //If this corresponds to speech already in the block, skip it
        if(currentBlock && currentBlock.entries) {
          currentBlock.entries.forEach(function (entry) {
            //matching text
            if(entry.comms && txt.indexOf(entry.msg) >= 0) {
              if (entry.qual === 'speech to' || entry.qual === 'tell to') {
                //from us!
                suppress = true;
              } else if (entry.who &&  txt.indexOf(entry.who) >= 0) {
                //matching person
                suppress = true;
              }
            }
            //TODO: if there's an existing entry from "someone" or "a shadowy figure"
            // match that as well and rewrite the name

          });
        }

        if(!suppress) {
          appendOutput({
            qual: 'rune-bug',
            chan: 'rune-bug',
            comms: true,
            msg: txt
          });
        }
      }
    },{
      regex: /^(\S+) novice-calls from (.+?): "(.*)"$/,
      func: function(match) {
        appendOutput({
          qual: 'novice-calling from',
          chan: 'novices',
          comms: true,
          who:  match[1],
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
          comms: true,
          city: match[1],
          msg: match[2]
        });
      }
    },{
      regex: /^(\S+) novice-calls: "(.*)"$/,
      func: function(match) {
        appendOutput({
          qual: 'novice-calling from',
          chan: 'novices',
          comms: true,
          who:  match[1],
          msg: match[2]
        });
      }    },{
      regex: /^(\S+) calls to (.+?): "(.*)"$/,
      func: function(match) {
        appendOutput({
          qual: 'calling from',
          comms: true,
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
          comms: true,
          chan: match[1],
          msg: match[2]
        });
      }
    },{
      regex: /^(.*?) tells you, "(.*)"$/,
      func: function(match) {
        appendOutput({
          qual: 'tell from',
          //chan: 'From',
          comms: true,
          who:  match[1],
          msg:  match[2]
        });
      }
    },{
      regex: /^You (tell|answer) (.*?), "(.*)"$/,
      func: function(match) {
        appendOutput({
          qual: 'tell to',
          //chan: 'To',
          comms: true,
          who:  match[2],
          msg:  match[3]
        });
      }
    },{
      regex: /^(.+?) (asks|says|exclaims), "(.+)"$/,
      func: function(match) {
        appendOutput({
          qual: 'speech from',
          comms: true,
          who:  match[1],
          msg:  match[3]
        });
      }
    },{
      regex: /^You (ask|say|exclaim), "(.+)"$/,
      func: function(match) {
        appendOutput({
          qual: 'speech to',
          comms: true,
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
    },{
      regex: /^(\S+) has just departed beyond the confines of your sphere of control\.$/,
      func: function(match) {
        var who = match[1].toLowerCase().replace('(','').replace(')','');
        appendOutput({
          qual: 'line',
          line:  match[0],
          who: who,
          tags:  ['sphere-movement', 'sphere-departure', 'person-' + who]
        });
      }
    },{
      regex: /^(\S+) has just stepped within your sphere of control\.$/,
      func: function(match) {
        var who = match[1].toLowerCase().replace('(','').replace(')','');
        appendOutput({
          qual: 'line',
          line:  match[0],
          who: who,
          tags:  ['sphere-movement', 'sphere-entry', 'person-' + who]
        });
      }
    }
  ];


// Your rune-bug picks up words: Billum asks, "Did you find an emerald?"
// Your rune-bug picks up words: Satsuki answers Craftmaster Billum Submerged Involved, "Thank you."

  var onLine = function (line) {

    var cleanline = stripAnsi(line);

    var seqLen = sequences.length;
    for (var i = 0; i < seqLen; i++) {
      var entry = sequences[i];
      if(entry.cond === undefined || entry.cond()) {
        var match = entry.regex.exec(cleanline);
        if (match) {
          entry.func(match, line);
          return;
        }
      }
    }

    //default fallback
    if(line.trim() !== '') {
      appendOutput({qual: 'line',  line: line});
    }

    if(line.indexOf('   ') >= 0) { tagBlock('monospaced'); }
  };


  var onPrompt = function(prompt) {
    if(inMap) { endMapFor('unknown'); }
    flushOutput();
  };

  ///////////////////////////////////////////
  // shadowclient event handlers

  self.shadowclient.on('line', onLine);

  self.shadowclient.on('prompt', onPrompt);

  self.shadowclient.on('login result', function (data) {
    self.emit('login result', data);
  });

  self.shadowclient.on('avalon connected', function () {
    self.emit('avalon connected');
  });

  self.shadowclient.on('avalon disconnected', function (had_error) {
    self.emit('avalon disconnected', had_error);
  });

};


AvParser.prototype.write = function(input) { this.shadowclient.write(input); };

AvParser.prototype.close = function() { this.shadowclient.close(); };

module.exports = AvParser;
