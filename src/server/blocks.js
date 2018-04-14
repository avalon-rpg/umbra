"use strict";
var _ = require("lodash");

function Block(qual) {
  this.qual = qual || "";
  this.tags = [];
  this.entries = [];
  this.timestamp = new Date();
  // console.log("New block", this);
}
//returns true if the tag was added
Block.prototype.tag = function(tagname) {
  console.log("tagging block with: " + tagname);
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

Block.prototype.addEntry = function(entry) {
  if (this.entries && this.entries.length > 0) {
    this.entries.push(entry);
  } else {
    this.entries = [entry];
  }
};

if (typeof Array.prototype.flatMap !== "function") {
  Array.prototype.flatMap = function(lambda) {
    return Array.prototype.concat.apply([], this.map(lambda));
  };
}

Block.prototype.deepMap = function(lambda) {
  let self = this;

  let alteredEntries = [];

  if (self.hasOwnProperty("entries")) {
    alteredEntries = self.entries.map(function(x) {
      if (x instanceof Block) {
        return x.deepMap(lambda);
      } else {
        return lambda(x);
      }
    });
    self.entries = alteredEntries;
  }

  let altered = lambda(self) || self;

  return altered;
};

function BlockStack() {
  const self = this;
  let root = new Block("root");
  let current = root;
  let stack = [current];
  // console.log(
  //   "New blockstack:\n\troot=",
  //   root,
  //   "\n\tcurrent=",
  //   current,
  //   "\n\tstack=",
  //   stack
  // );

  function reset() {
    root = new Block("root");
    current = root;
    stack = [current];
    // console.log(
    //   "Reset blockstack:\n\troot=",
    //   root,
    //   "\n\tcurrent=",
    //   current,
    //   "\n\tstack=",
    //   stack
    // );
  }

  self.addEntry = function(entry) {
    // console.log(
    //   "Add entry to blockstack:\n\tcurrent:",
    //   current,
    //   "\n\t+ with entry:",
    //   entry
    // );
    current.addEntry(entry);
  };

  self.tagCurrent = function(tagname) {
    current.tag(tagname);
  };

  self.untagCurrent = function(tagname) {
    current.untag(tagname);
  };

  self.currentEntries = function() {
    return current.entries;
  };

  self.push = function(block) {
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
  self.pop = function() {
    // console.log("popping block : " + JSON.stringify(current));

    //bail out fast if it's just a comms line
    if (current.hasOwnProperty("entries") && current.entries.length === 1) {
      let soleEntry = current.entries[0];
      if (soleEntry.comms) {
        current = soleEntry;
        return false;
      }
    }

    if (stack.length > 1) {
      let block = current;
      stack.pop();
      current = stack.last();
      // console.log("parent block is: " + JSON.stringify(current));
      current.addEntry(block);
      return true;
    } else {
      return false;
    }
  };

  self.popAll = function() {
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
