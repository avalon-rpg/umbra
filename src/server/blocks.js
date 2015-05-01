'use strict';

function Block (qual) {
  this.qual = qual || '';
  this.tags = [];
  this.entries = [];
  this.timestamp = new Date();
}
//returns true if the tag was added
Block.prototype.tag = function (tagname) {
  if (!this.tags || this.tags.length === 0) {
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

Block.prototype.untag = function (tagname) {
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
  const self = this;
  let root = new Block('root');
  let current = root;
  let stack = [current];

  function reset() {
    root = new Block('root');
    current = root;
    stack = [current];
  }

  self.addEntry = function (entry) { current.addEntry(entry); };

  self.tagCurrent = function (tagname) { current.tag(tagname); };

  self.untagCurrent = function (tagname) { current.untag(tagname); };

  self.currentEntries = function() { return current.entries; };

  self.push = function (block) {
    current = block;
    stack.push(block);
    //console.log('entering block at depth ' + stack.length + ': ' + JSON.stringify(block));
  };

  /**
   * Runs some cleanup on the current block (such as tagging one-liners)
   * Then, if higher blocks exist in the stack, pops it and appends as
   *       an entry to the parent block.
   * @returns {boolean} true if the block was popped, false if the current block is already root
   */
  self.pop = function () {
    //console.log('popping block : ' + JSON.stringify(current));

    if (current.hasOwnProperty('entries')) {
      //console.log("this block has entries...");
      if (current.entries.length === 1) {
        //console.log("...just one though...");
        let soleEntry = current.entries[0];
        if (soleEntry.comms) {
          //console.log("... it's a comms block");
          current = soleEntry;
          return false;
        } else {
          current.tag('oneliner');
        }
      }
    }
    if (stack.length > 1) {
      let block = current;
      stack.pop();
      current = stack.last();
      //console.log('current block is now: ' + JSON.stringify(current));
      current.addEntry(block);
      return true;
    } else {
      return false;
    }
  };

  self.popAll = function () {
    while (self.pop()) {
      //do nowt
    }
    let ret = current;
    reset();
    return ret;
  };
}

exports.Block = Block;
exports.BlockStack = BlockStack;
