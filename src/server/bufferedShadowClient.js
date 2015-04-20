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
    if(statefulProtoVars.indexOf(data.code) >= 0) {
      protoState[data.code] = data.content;
    }
    self.emit('protocol', data);
  });

  sc.on('prompt', function (data) {
    self.inputBuffer.push(data);
    self.emit('prompt', data);
  });

  self.write = function(input) { sc.write(input); };

  self.close = function() { sc.close(); };

  self.pause = function() { sc.pause(); };

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
