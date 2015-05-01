'use strict';
let util = require('util');
let EventEmitter = require('events').EventEmitter;
let ParsedShadowClient = require('./parsedShadowClient');
var CBuffer = require('CBuffer');

function BufferedShadowClient(params) {
  EventEmitter.call(this);
  this.init(params);
}

util.inherits(BufferedShadowClient, EventEmitter);

const statefulProtoVars = [
  'brief',
  'exits',
  'map',
  'items',
  'weight',
  'level',
  'xp',
  'playername',
  'rank',
  'lessons',
  'bloodlust',
  'alignment',
  'flying',
  'leftwield',
  'innersight',
  'gold',
  'hunger',
  'breath',
  'fatigue',
  'defences',
  'city',
  'guild',
  'profession',
  'order'
];

BufferedShadowClient.prototype.init = function(params) {

  let protoState = {};
  let promptVars = {};

  let self = this;
  self.setMaxListeners(30);
  let sc = new ParsedShadowClient(params);

  self.params = params;
  let inputBuffer = new CBuffer(100);

  sc.on('login result', function(data) {self.emit('login result', data); } );

  sc.on('avalon disconnected', function(had_error) { self.emit('avalon disconnected', had_error); } );

  sc.on('closed', function(had_error) { self.emit('closed', had_error); } );

  sc.on('block', function (data) {
    inputBuffer.push(data);
    self.emit('block', data);
  });

  sc.on('protocol', function (data) {
    let code = data.code;
    if(statefulProtoVars.indexOf(code) >= 0) {
      //only emit if changed from previously seen value
      if(!protoState.hasOwnProperty(code) || protoState[code].content !== data.content) {
        protoState[data.code] = data;
        self.emit('protocol', data);
      }
    } else if (data.code === 'promptvar') {
      let name = data.name;
      let value = data.value;
      if(!promptVars.hasOwnProperty(name) || promptVars[name].value !== value) {
        //console.log('sending updated promptvar ' + name + ' = ' + value);
        promptVars[name] = data;
        self.emit('protocol', data);
      } else {
        //console.log('suppressing unchanged promptvar ' + name + ' = ' + value);
      }
    } else {
      self.emit('protocol', data);
    }
  });

  sc.on('prompt', function (data) {
    self.inputBuffer.push(data);
    self.emit('prompt', data);
  });

  self.write = function(input) { sc.write(input); };

  self.close = function() { sc.close(); };

  self.pause = function() { sc.pause(); };

  self.replayState = function(outputFn) {
    for (let code in protoState) {
      if (protoState.hasOwnProperty(code)) {
        outputFn(protoState[code]);
      }
    }
    for (let name in promptVars) {
      if (promptVars.hasOwnProperty(name)) {
        outputFn(promptVars[name]);
      }
    }
  };

  self.replay = function(outputFn) {
    inputBuffer.forEach(outputFn);
  };

  self.replayFrom = function(dt, outputFn) {
    inputBuffer.forEach(function(block) {
      if(block.timestamp > dt) { outputFn(block); }
    });
  };

  self.protocolState = function() { return protoState; };

};
module.exports = BufferedShadowClient;
