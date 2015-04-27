'use strict';
var util = require('util');
var stripAnsi = require('strip-ansi');
var EventEmitter = require('events').EventEmitter;
var blocks = require('./blocks');

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
  this._emitter = new EventEmitter();
  this.init(shadowclient);
  // I don't trust prototype inheritance (due to an unexplained bug where self.emit becomes undefined),
  // so we delegate instead
}

AvParser.prototype.on = function() {
  this._emitter.on.apply(this._emitter, arguments);
};

AvParser.prototype.init = function(shadowclient) {
  const self = this;
  self.shadowclient = shadowclient;

  let blockStack = new blocks.BlockStack();

  let inMap = false;
  let mapLoc = '';
  let mapLines = [];
  let umbraMsg = false;
//  let inMacroList = false;
  let promptExtraVars = {};

  const emit = function() {
    self._emitter.emit.apply(self._emitter, arguments);
  };

  let appendOutput = function(data) {
    blockStack.addEntry(data);
  };

  const promptRegex = /^(\d+)\/(\d+)h, (\d+)\/(\d+)m (\S*) (.*)(?:-|=).*$/;

  let flushOutput = function(prompt) {
    let block = blockStack.popAll();
    if(block) {
      try {
        if(prompt) {
          block.prompt = prompt;
          let cleanPrompt = stripAnsi(prompt).trim();
          if(shadowclient.username === 'gwahir') {
            console.log('clean prompt: [' + cleanPrompt + ']');
          }
          let promptMatch = promptRegex.exec(cleanPrompt);
          if(promptMatch) {
            let promptVars = {
              health: promptMatch[1],
              healthMax: promptMatch[2],
              mana: promptMatch[3],
              manaMax: promptMatch[4],
              flags: promptMatch[5],
              visFlags: promptMatch[6]
            };
            if(shadowclient.username === 'gwahir') {
              console.log('parsed prompt: ' + JSON.stringify(promptVars));
            }
            block.promptVars = promptVars;
          }
        }
        block.promptExtraVars = promptExtraVars;
        promptExtraVars = {};
        block.emitted = new Date();
        emit('block', block);
      } catch (err) {
        if (typeof emit !== 'function') {
          console.log('emit is fubar, currently set to: ' + JSON.stringify(emit));
        }
        console.log('error in popped block: ' + JSON.stringify(block));
        throw err;
      }
    } else {
      console.log('attempted to flush an empty block, on prompt: ' + prompt);
    }
  };




  // needs handling:
  //
  // Gigglefluff of Mercinae (scholar; on the hunter course) is requesting ADVICE at "Gardens of the Hunter Gatherer school". Your help may be needed.



  let endMapFor = function(region) {
    let padRegex = /^((?:\u001b\[\d+m)*)(\s*)(.*?)$/;
    let padding = 999;
    mapLines.forEach(function(line) {
      if(line.trim().length > 0) {
        //console.log('map line: →' + line.replace('\u001b', '⌂') + '←');
        let matches = padRegex.exec(line);
        let ansiPart = matches[1] || '';
        let padPart = matches[2];
        let remainder = matches[3];
        let linePad = padPart.length;
        //console.log('split: →' + ansiPart.replace('\u001b', '⌂') + '↔' + padPart.replace('\u001b', '⌂') + '↔' + remainder.replace('\u001b', '⌂') + '←');
        if(remainder.length > 0) {
          padding = Math.min(linePad, padding);
        }
        //console.log('padding = ' + padding);
      }
    });
    let cleanLines = [];
    mapLines.forEach(function(line) {
      let matches = padRegex.exec(line);
      let ansiPart = matches[1] || '';
      let padPart = matches[2];
      let remainder = matches[3];
      let cleanLine = ansiPart + padPart.substring(padding) + remainder;
      cleanLines.push(cleanLine);
    });
    appendOutput({
      qual:  'map',
      loc:    mapLoc,
      region: region,
      lines:  cleanLines
    });
    mapLoc = '';
    mapLines = [];
    inMap = false;
  };

  let fnEndMap = function(match) { endMapFor(match[1]); };

  let sequences = [
    {
      regex: /^###ack prompt (\S*) (.*)$/,
      func: function(match) {
        promptExtraVars[match[1]] = match[2];
      }
    },{
      regex: /^UmBrA:\s$/,
      func: function(match) {
        umbraMsg = true;
      }
    },{
      regex: /^###ack macro@ ###id=(\d+) ###name=(.+) ###definition=(.*)$/,
      func: function(match) {
        appendOutput({
          qual:     'protocol',
          code:     'macro',
          content:   match[0],
          macroId:   match[1],
          macroName: match[2],
          macroDef:  match[3]
        });
      }
    //},{
    //  regex: /^(\d+) (.*)$/,
    //  cond: () => inMacroList,
    //  func: function(match) {
    //    appendOutput({
    //      qual:    'protocol',
    //      code:    'macro',
    //      content:  match[0],
    //      macroId:  match[1],
    //      macroDef: match[2]
    //    });
    //  }
    },{
      regex: /^###macro (\d+) (.*)$/,
      func: function(match) {
        appendOutput({
          qual:    'protocol',
          code:    'macro',
          content:  match[0],
          macroId:  match[1],
          macroDef: match[2]
        });
      }
    },{
      regex: /^(.*) >>> (.*)$/,
      cond: () => umbraMsg,
      func: function(match, rawLine) {
        umbraMsg = false;
        appendOutput({
          qual: 'umbra',
          chan: 'umbra',
          who: match[1],
          comms: true,
          msg: match[2]
        });
      }
    },{
      regex: /^Initiating CLIENT \/ AVALON protocol codes\.$/,
      func: function(match) {/* do nothing*/}
    },{
      regex: /^Vicinity MAP around "(.+)" location:$/,
      func: function(match) {
        mapLoc = match[1];
        inMap = true;
      }
    },{
      regex: /^Map (?:depicts|shows) (.*)$/,
      cond: function() { return inMap; },
      func: fnEndMap
    },{
      regex: /^.*$/,
      cond: () => inMap,
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
        let newBlock = new blocks.Block('avmsg');
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
        //if(newBlock.cmd && newBlock.cmd === 'MACROLIST') {
        //  inMacroList = true;
        //} else {
          blockStack.push(newBlock);
        //}
      }
    },{
      regex: /^###end@.*$/,
      func: blockStack.pop
    },{
      regex: /^You engage in a moment's deep thought, gathering a sense of the domain\.$/,
      func: function(match, rawLine) {
        appendOutput({ qual: 'marker', markerFor: 'spheresense' });
        blockStack.tagCurrent('spheresense');
      }
    },{
      regex: /^Guild Name *\| Guildhead *\| Patron Deity *\| Where *$/,
      func: function(match, rawLine) {
        appendOutput({ qual: 'marker', markerFor: 'guilds' });
        blockStack.tagCurrent('guilds');
      }
    },{
      regex: /^(\S+) BB: +Read (\d+) out of (\d+)$/,
      func: function(match, rawLine) {
        if(blockStack.tagCurrent('bbstatus')) {
          appendOutput({ qual: 'marker', markerFor: 'bbstatus' });
        }
        appendOutput({qual: 'line',  line: rawLine});
      }
    },{
      //de-duping locations in oracular watch
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
        let code = match[1];
        let name = match[2];

        if(code === 'ccc') { emit('protocol', { code: 'city', content: name }); }
        if(code === 'ccg') { emit('protocol', { code: 'guild', content: name }); }
        if(code === 'ccp') { emit('protocol', { code: 'profession', content: name }); }
        if(code === 'cco') { emit('protocol', { code: 'order', content: name }); }

        appendOutput({
          qual: 'channel',
          code:  code,
          name:  name
        });
      }
    },{
      regex: /^Your rune-bug picks up words: (.+)$/,
      func: function(match) {
        let suppress = false;
        let txt = match[1];

        //If this corresponds to speech already in the block, skip it
        if(blockStack.current && blockStack.current.entries) {
          blockStack.current.entries.forEach(function (entry) {
            //matching text
            if(entry.comms && txt.indexOf(entry.msg) >= 0) {
              if (entry.qual === 'speech to' || entry.qual === 'tell to') {
                //from us!
                suppress = true;
              } else if (entry.who && txt.indexOf(entry.who) >= 0) {
                //matching person
                suppress = true;
              }
            }
            //TODO: if there's an existing entry from "someone" or "a shadowy figure"
            //      but the body matches regardless...
            //      match that as well and rewrite the name

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
        // any protocol without special handling above gets taken out-of-band
        emit('protocol', {
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
      func: function(match, rawLine) {
        var who = match[1].toLowerCase().replace('(','').replace(')','');
        appendOutput({
          qual: 'line',
          line:  rawLine,
          who:   who,
          tags:  ['sphere-movement', 'sphere-entry', 'person-' + who]
        });
      }
    },{
      regex: /^The ethereal flow continues to be absorbed into your seedpod: (\d+) seeds absorbed into (\d+) potency within the pod\.$/,
      func: function(match, rawLine) {
        appendOutput({
          qual: 'line',
          line:  rawLine,
          replacableId: 'oracle-pod-absorb-self'
        });
      }
    },{
      regex: /^You note marks of your own ethereal seed below. Ethereal marking at "(.*)" now at: (\d+)\.$/,
      func: function(match, rawLine) {
        let loc = match[1].replace(/\s/g, '-').replace(/'/g, "").replace(/"/g, '');
        appendOutput({
          qual: 'line',
          line:  rawLine,
          replacableId: 'oracle-marking-' + loc
        });
      }
    },{
      regex: /^You note marks of your own ethereal seed below. You allow an ethereal seed of ether to fall through the oracle-eye. The seed markings at "(.+)" now number (.+)\.$/,
      func: function(match, rawLine) {
        let loc = match[1].replace(/\s/g, '-').replace(/'/g, "").replace(/"/g, '');
        appendOutput({
          qual: 'line',
          line:  rawLine,
          replacableId: 'oracle-marking-' + loc
        });
      }
    },{
      regex: /^Below at "(.+)" the ether continue to twine and thicken about the (.+), the wall (.*) percent towards completion\.$/,
      func: function(match, rawLine) {
        let dirn = match[2];
        appendOutput({
          qual: 'line',
          line:  rawLine,
          replacableId: 'oracle-wall-building-' + dirn
        });
      }
    },{
      regex: /^The oracle-eye focus is unusually sharp as it draws up a sparkling flow of ether from the (.+) of "(.+)", directing it (.*) to gather density; (.*) percent complete\.$/,
      func: function(match, rawLine) {
        let srcdirn = match[1];
        let tgtdirn = match[3];
        appendOutput({
          qual: 'line',
          line:  rawLine,
          replacableId: 'oracle-raising-' + tgtdirn
        });
      }
    },{
      regex: /^(.+) is fully manifested at the (.+) reaches of the wind; the last of the sparkling flow having passed up through the oracle-eye.$/,
      func: function(match, rawLine) {
        let tgtdirn = match[2];
        appendOutput({
          qual: 'line',
          line:  rawLine,
          replacableId: 'oracle-raising-' + tgtdirn
        });
      }
    },{
      regex: /^Ether continues to flow through the eye, from the (.+) region to "(.+)" below. The supercharged particles gather at the (.+), enlarging (\d+)% of the ethereal creation\.$/,
      func: function(match, rawLine) {
        let dirn1 = match[1];
        let dirn2 = match[3];
        appendOutput({
          qual: 'line',
          line:  rawLine,
          replacableId: 'oracle-lowering-' + dirn1 + '-' + dirn2
        });
      }
    },{
      regex: /^(.+) has dropped seed markings below\.$/,
      func: function(match, rawLine) {
        appendOutput({
          qual: 'line',
          line:  rawLine,
          replacableId: 'oracle-othermarks-' + match[1]
        });
      }
    },{
      regex: /^The battle for supremacy with (.*) over "(.*)" continues: (.*) further focus bouts and the attack (.*) will be completed, permanently expanding the (.*) sphere of control\.$/,
      func: function(match, rawLine) {
        let dirn = match[4];
        appendOutput({
          qual: 'line',
          line:  rawLine,
          replacableId: 'far-attack-' + dirn
        });
      }
    }
  ];




// Your rune-bug picks up words: Billum asks, "Did you find an emerald?"
// Your rune-bug picks up words: Satsuki answers Craftmaster Billum Submerged Involved, "Thank you."

  var onLine = function (line) {

    let seqLen = sequences.length;
    for (let i = 0; i < seqLen; i++) {
      let entry = sequences[i];
      if(entry.cond === undefined || entry.cond()) {
        let match;
        if(entry.ansiRegex) {
          match = entry.ansiRegex.exec(line);
        } else if(entry.regex) {
          let cleanLine = stripAnsi(line);
          match = entry.regex.exec(cleanLine);
        } else {
          console.error("Parser entry with no regex defined: " + JSON.stringify(entry));
        }
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

    if(line.indexOf('   ') >= 0) { blockStack.tagCurrent('monospaced'); }
  };


  let onPrompt = function(prompt) {
    umbraMsg = false;
    //inMacroList = false;
    if(inMap) { endMapFor('unknown'); }
    flushOutput(prompt);
  };

  ///////////////////////////////////////////
  // shadowclient event handlers

  self.shadowclient.on('line', onLine);

  self.shadowclient.on('prompt', onPrompt);

  self.shadowclient.on('login result', function (data) {
    emit('login result', data);
  });

  self.shadowclient.on('avalon connected', function () {
    emit('avalon connected');
  });

  self.shadowclient.on('avalon disconnected', function (had_error) {
    emit('avalon disconnected', had_error);
  });

};


AvParser.prototype.write = function(input) { this.shadowclient.write(input); };

AvParser.prototype.close = function() { this.shadowclient.close(); };

module.exports = AvParser;
