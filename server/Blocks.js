


function Block(qual) {
  this.qual = qual || '';
  this.tags = [] || [''];
  this.entries = [] || [''];
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


function BlockStack() {
  this.stack = [];
  this.current = new Block()
}



module.exports = [Block, BlockStack];
