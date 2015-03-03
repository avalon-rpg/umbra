'use strict';

export class Block {

  constructor(qual) {
    this.qual = qual || '';
    this.tags = [];
    this.entries = [];
  }

//returns true if the tag was added
  tag(tagname) {
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

  untag(tagname) {
    if (this.tags && this.tags.length > 0) {
      let idx = this.tags.indexOf(tagname);
      if (idx > -1) {
        this.tags.splice(idx, 1);
        return true;
      }
    }
    return false;
  };

  addEntry = function (entry) {
    if (this.entries && this.entries.length > 0) {
      this.entries.push(entry);
    } else {
      this.entries = [entry];
    }
  };
}

export class BlockStack {

  constructor() {
    this.reset();
  }

  reset() {
    this.current = new Block('root');
    this.stack = [this.current];
  };

  push(block) {
    if (this.stack.length == 0) {
      this.stack = [block];
    } else {
      this.stack.push(block);
    }
    this.current = block;
    //console.log('entering block at depth ' + blockStack.length + ': ' + JSON.stringify(block));
  };

  pop() {
    if(this.current && this.current.entries && this.current.entries.length == 1) {
      let soleEntry = this.current.entries[0];
      if(soleEntry.comms) {
        this.current = soleEntry;
        return false;
      } else {
        this.current.tag('oneliner');
      }
    }
    if(this.stack.length > 1) {
      let block = this.stack.pop();
      this.current = this.stack.last();
      this.current.addEntry(block);
      return true;
    } else {
      return false;
    }
  };

  popAll() {
    while(this.pop()) {
      //do nowt
    }
    var ret = this.current;
    this.reset();
    return ret;
  };
}

