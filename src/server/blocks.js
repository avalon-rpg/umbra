'use strict';

function Block (qual) {
  this.qual = qual || '';
  this.tags = [];
  this.entries = [];
}

//returns true if the tag was added
Block.prototype.tag = function(tagname) {
  if (!this.tags || this.tags.length == 0) {
    this.tags = [tagname];
    return true;
  } else {
    if (this.tags.indexOf(tagname) < 0) {
      this.tags.push(tagname);
      return true;
    }
  }
  return false;
};

Block.prototype.untag = function(tagname) {
  if (this.tags && this.tags.length > 0) {
    let idx = this.tags.indexOf(tagname);
    if (idx > -1) {
      this.tags.splice(idx, 1);
      return true;
    }
  }
  return false;
};

Block.prototype.addEntry = function (entry) {
  if (this.entries && this.entries.length > 0) {
    this.entries.push(entry);
  } else {
    this.entries = [entry];
  }
};

function BlockStack() {
  this.reset();
}

BlockStack.prototype.reset = function() {
  this.root = new Block('root');
  this.current = this.root;
  this.stack = [this.current];
};

BlockStack.prototype.tagCurrent = function(tagname) {
  this.current.tag(tagname);
};

BlockStack.prototype.untagCurrent = function(tagname) {
  this.current.untag(tagname);

};

BlockStack.prototype.push = function(block) {
  if (this.stack.length == 0) {
    this.stack = [block];
  } else {
    this.stack.push(block);
  }
  this.current = block;
  //console.log('entering block at depth ' + blockStack.length + ': ' + JSON.stringify(block));
};

BlockStack.prototype.pop = function() {
  if(this.current && this.current.entries && this.current.entries.length == 1) {
    let soleEntry = this.current.entries[0];
    if(soleEntry.comms) {
      this.current = soleEntry;
      return false;
    } else {
       this.tagCurrent('oneliner');
    }
  }
  if(this.stack && this.stack.length > 1) {
    let block = this.stack.pop();
    this.current = this.stack.last();
    this.current.addEntry(block);
    return true;
  } else {
    return false;
  }
};

BlockStack.prototype.popAll = function() {
  while(this.pop()) {
    //do nowt
  }
  var ret = this.current;
  this.reset();
  return ret;
};


exports.Block = Block;
exports.BlockStack = BlockStack;
