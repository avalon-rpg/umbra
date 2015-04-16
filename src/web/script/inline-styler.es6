'use strict';


function InlineStyler() {
  this.stashedContext = [];
  this.fg = this.bg = null;
  this.bright = false;
  this.tagStack = [];
}

InlineStyler.prototype.reset = function () {
  //console.log("resetting styler");
  this.stashedContext = [];
  this.fg = this.bg = null;
  this.bright = false;
  this.tagStack = [];
};

InlineStyler.prototype.stashContext = function() {
  let ctx = {
    fg: this.fg,
    bg: this.bg,
    bright: this.bright,
    tagStack: this.tagStack
  };

  this.fg = this.bg = null;
  this.bright = false;
  this.tagStack = [];

  this.stashedContext.push(ctx);
};

InlineStyler.prototype.unstashContext = function() {
  if(this.stashedContext.length > 0) {
    let ctx = this.stashedContext.pop();
    this.fg = ctx.fg;
    this.bg = ctx.bg;
    this.bright = ctx.bright;
    this.tagStack = ctx.tagStack;
  }
};

InlineStyler.prototype.inCleanContext = function(fn) {
  this.stashContext();
  let retval;
  try { retval = fn(); } finally { this.unstashContext(); }
  return retval;
};

InlineStyler.prototype.style = function (txt) {
  let self = this;
  if (txt.replace) {
    let escaped = self.escape_for_html(txt);
    let ansified = self.ansi_to_html(escaped);
    let styled = self.inline_to_html(ansified);
    //console.log("styled line: " + styled);
    //console.log("retained styles: " + JSON.stringify(self.tagStack));
    return styled;
  } else {
    //we weren't supplied a string...
    return txt;
  }
};

InlineStyler.prototype.escape_for_html = function (txt) {
  if(!txt) { return ''; }
  else if (txt.replace) {
    return txt.replace(/[&<>]/gm, function (str) {
      if (str === "&") { return "&amp;"; }
      if (str === "<") { return "&lt;";  }
      if (str === ">") { return "&gt;";  }
    });
  } else {
    return txt;
  }
};

InlineStyler.prototype.linkify = function (txt) {
  return txt.replace(/(https?:\/\/[^\s]+)/gm, function(str) {
    return "<a href=\"" + str + "\">" + str + "</a>";
  });
};

InlineStyler.prototype.inline_to_html = function (txt) {
  if(!txt) { return ''; }

  let self = this;
  let inSpan = false;

  function pushTag(tag) {
    let idx = self.tagStack.indexOf(tag);
    if(idx < 0) {
      //console.log('pushing to tag stack: ' + tag);
      self.tagStack.push(tag);
      return true;
    } else {
      return false;
    }
  }

  function popTag(tag) {
    let idx = self.tagStack.indexOf(tag);
    if(idx >= 0) {
      self.tagStack.splice(idx, 1);
      return true;
    } else {
      //console.log('can\'t pop from tag stack: ' + tag);
      return false;
    }
  }

  function spanForStack() {
    if(self.tagStack && self.tagStack.length && (self.tagStack.length > 0)) {
      inSpan = true;
      return '<span class="' + self.tagStack.join(' ') + '">';
    } else {
      inSpan = false;
      return '';
    }
  }

  function replacer(match, p1, p2, offset, string) {
    let pushed = false;
    let popped = false;
    let content = p1 || p2;
    if(!content) { return ''; }

    let tags = content.split(' ');
    tags.forEach( function(tag) {
      if(tag.indexOf("/") === 0) {
        tag = tag.substring(1);
        //console.log("tag to pop = " + tag);
        popped = popTag(tag) || popped;
      } else if(tag === "reset") {
        popped = (self.tagStack && self.tagStack.length > 0);
        self.tagStack = [];
      } else {
        //console.log("tag to push = " + tag);
        pushed = pushTag(tag) || pushed;
      }
    });

    let replacement = '';
    if(pushed || popped) {
      if (inSpan) {
        replacement = '</span>';
      }
      let newSpan = spanForStack();
      replacement = replacement + newSpan;
    }
    return replacement;
  }

  const regex = /<##(.*?)##>|&lt;##(.*?)##&gt;/gm;

  let openingSalvo = spanForStack();
  if(openingSalvo !== '') { inSpan = true; }

  let newtxt = txt.replace(regex, replacer);
  let partingShot = '';
  if(self.tagStack && self.tagStack.length && (self.tagStack.length > 0)) {
    partingShot = '</span>';
  }
  return openingSalvo + newtxt + partingShot;
};


InlineStyler.prototype.ansi_to_html = function (txt) {

  if(!txt) { return ''; }

  let txtArray = txt.split(/\033\[/);

  let first = txtArray.shift(); // the first chunk is not the result of the split

  let self = this;
  let transformedArray = txtArray.map(self.process_chunk);

  transformedArray.unshift(first);

  //because array.push returns the new length for whatever obscene reason
  let sanePush = function(a,b) { a.push(b); return a; };

  let reducer = function (a, b) {
    return Array.isArray(b) ? a.concat(b) : sanePush(a,b);
  };

  let flattened_data = transformedArray.reduce(reducer, []);

  let escaped_data = flattened_data.join('');

  return escaped_data;
};

// indices here correspond to ansi numbers
const ANSI_COLORS = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];


InlineStyler.prototype.process_chunk = function (text) {

  function cssLookup(bright, num) {
    let name = ANSI_COLORS[num % 10];
    return bright ? `bright-$name` : name;
  }

  // Each 'chunk' is the text after the CSI (ESC + '[') and before the next CSI/EOF.
  //
  // This regex matches two groups within a chunk.
  // The first group matches all of the number+semicolon command sequences
  // before the 'm' character. These are the graphics or SGR commands.
  // The second group is the text (including newlines) that is colored by
  // the first group's commands.
  let matches = text.match(/([\d;]*)m([\s\S]*)/m);

  if (!matches) { return text; }

  let orig_txt = matches[2];
  let nums = matches[1].split(';');

  let self = this;
  nums.map(function (num_str) {

    let num = parseInt(num_str);

    if (isNaN(num) || num === 0) { self.fg = self.bg = null; self.bright = false; }
    else if (num === 1) { self.bright = true; }
    else if ((num >= 30) && (num < 38)) { self.fg = cssLookup(self.bright, num); }
    else if ((num >= 90) && (num < 98)) { self.fg = cssLookup(true, num); }
    else if ((num >= 40) && (num < 48)) { self.bg = cssLookup(false, num); }
    else if ((num >= 100) && (num < 108)) { self.bg = cssLookup(true, num); }
  });

  if ((self.fg === null) && (self.bg === null)) {
    return orig_txt;
  } else {
    let classes = ["ansi"];
    if (self.fg) { classes.push(self.fg + "-fg");  }
    if (self.bg) { classes.push(self.bg + "-bg");  }
    return ["<span class=\"" + classes.join(' ') + "\">", orig_txt, "</span>"];
  }
};

let hasModule = (typeof module !== 'undefined');
if(hasModule) {
  module.exports = InlineStyler;
}
