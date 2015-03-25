'use strict';
let util = require('util');
let EventEmitter = require('events').EventEmitter;
require('buffertools').extend();

//const gaSeq = "\xFF\xF9";  // = IAC GA
const IAC = 255;
const GA  = 249;
const gaSeq = new Buffer([IAC,GA]);

function GaBlockSplitter(input) {
  EventEmitter.call(this);
  this.init(input);
}

util.inherits(GaBlockSplitter, EventEmitter);

GaBlockSplitter.prototype.init = function(input) {
  let self = this;

  let promptTimeout;
  let buffer = '';
  let emitLine = function(line) { self.emit('line', line); };
  let emitPrompt = function(prompt) { self.emit('prompt', prompt); };

  let clearPromptTimeout = function() {
    if(promptTimeout) {
      clearTimeout(promptTimeout);
      promptTimeout = null;
    }
  };

  let onPromptTimeout = function() {
    if(buffer && buffer.trim() !== '') {
      console.log('emitting dirty prompt: ' + buffer);
      emitPrompt(buffer);
      buffer = '';
    }
  };

  let setPromptTimeout = function() {
    clearPromptTimeout();
    setTimeout(onPromptTimeout, 600);
  };

  let processBlock = function(text, isClean) {
    let lines = (buffer + text).split("\r\n");
    buffer = '';
    let lastLine = lines.pop();  //lines is mutated
    lines.forEach(emitLine);
    if(isClean) {
      clearPromptTimeout();
      emitPrompt(lastLine);
    } else {
      setPromptTimeout();
      buffer = lastLine;
    }
  };

  let processCleanBlock = function(block) {
    processBlock(block, true);
  };
  let processDirtyBlock = function(block) {
    processBlock(block, false);
  };

  input.on('data', function (data) {
    let remaining = data;
    let pos = -1;
    do {
      pos = remaining.indexOf(gaSeq);
      if(pos >= 0) {
        let block = remaining.slice(0, pos).toString('ascii');
        remaining = remaining.slice(pos+2);
        processCleanBlock(block);
      } else {
        let block = remaining.toString('ascii');
        processDirtyBlock(block);
      }
    } while(pos >= 0);
  });

};

module.exports = GaBlockSplitter;