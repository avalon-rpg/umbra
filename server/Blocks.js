


function Block(qual) {
  this.qual = qual || '';
  this.tags = [];
  this.entries = [];
}

//returns true if the tag was added
Block.prototype.tag = function(tag) {
  if(!this.tags || this.tags.length == 0) {
    this.tags = [tag];
    return true;
  } else {
    if(this.tags.indexOf(tag) < 0) {
      this.tags.push(tag);
      return true;
    }
  }
  return false;
};

Block.prototype.untag = function(tag) {
  if(this.tags && this.tags.length > 0) {
    var idx = this.tags.indexOf(tag)
    if (idx > -1) {
      this.tags.splice(idx, 1);
      return true;
    }
  }
  return false;
};

Block.prototype.addEntry = function(entry) {
  if(this.entries && this.entries.length > 0) {
    this.entries.push(entry);
  } else {
    this.entries = [entry];
  }
};

function BlockStack() {
  this.reset();
}

BlockStack.prototype.reset = function () {
  this.current = new Block();
  this.stack = [this.current];
};

BlockStack.prototype.push = function (block) {
  if (this.stack.length == 0) {
    this.stack = [block];
  } else {
    this.stack.push(block);
  }
  this.current = block;
  //console.log('entering block at depth ' + blockStack.length + ': ' + JSON.stringify(block));
};

BlockStack.prototype.pop = function () {
  if(this.current && this.current.entries && this.current.entries.length == 1) {
    var soleEntry = this.current.entries[0];
    if(soleEntry.comms) {
      this.current = soleEntry;
      return false;
    } else {
      this.current.tag('oneliner');
    }
  }
  if(this.stack.length > 1) {
    var block = this.stack.pop();
    this.current = this.stack.last();
    this.current.addEntry(block);
    return true;
  } else {
    return false;
  }
};

BlockStack.prototype.popAll = function () {
  while(this.pop()) {
    //do nowt
  }
  var ret = this.current;
  this.reset();
  return ret;
};


module.exports = [Block, BlockStack];
