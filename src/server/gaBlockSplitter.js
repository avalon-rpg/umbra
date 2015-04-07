'use strict';
require('buffertools').extend();

//const gaSeq = "\xFF\xF9";  // = IAC GA
const IAC = 255;
const GA  = 249;
const gaSeq = new Buffer([IAC,GA]);

function GaBlockSplitter(params) {

  let self = this;

  self.params = params;

  let promptTimeout;
  let buffer = '';
  let emitLine = function(line) {
    if(params.lineDebug) {
      console.log('splitter emitting line: «««[' + line + ']»»»');
    }
    params.onLine(line);
  };

  let emitPrompt = function(prompt) {
    if(params.lineDebug) {
      console.log('splitter emitting prompt: «««[' + prompt + ']»»»');
    }
    params.onPrompt(prompt);
  };

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
      emitLine(lastLine);
      buffer = '';
      setPromptTimeout();
      //if(lastLine.indexOf('###') === 0) {
      //  clearPromptTimeout();
      //  emitLine(lastLine);
      //  buffer = '';
      //} else {
      //  buffer = lastLine;
      //  setPromptTimeout();
      //}
    }
  };

  let processCleanBlock = function(block) {
    if(params.blockDebug) {
      console.log('clean block: «««' + block + '»»»');
    }
    processBlock(block, true);
  };

  let processDirtyBlock = function(block) {
    if(params.blockDebug) {
      console.log('dirty block: «««' + block + '»»»');
    }
    processBlock(block, false);
  };

  params.input.on('data', function (data) {
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

}

module.exports = GaBlockSplitter;