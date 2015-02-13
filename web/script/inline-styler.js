


function InlineStyler() {
  this.fg = this.bg = null;
  this.bright = false;
  this.tagStack = [];
}

InlineStyler.prototype.style = function (txt) {
  var self = this;
  var escaped = self.escape_for_html(txt);
  var ansid = self.ansi_to_html(escaped);
  var styled = self.inline_to_html(ansid);
  return styled;

};
InlineStyler.prototype.escape_for_html = function (txt) {
  return txt.replace(/[&<>]/gm, function(str) {
    if (str == "&") return "&amp;";
    if (str == "<") return "&lt;";
    if (str == ">") return "&gt;";
  });
};

InlineStyler.prototype.linkify = function (txt) {
  return txt.replace(/(https?:\/\/[^\s]+)/gm, function(str) {
    return "<a href=\"" + str + "\">" + str + "</a>";
  });
};

InlineStyler.prototype.inline_to_html = function (txt) {
  var self = this;
  var inSpan = false;

  function pushTag(tag) {
    var idx = self.tagStack.indexOf(tag);
    if(idx < 0) {
      console.log('pushing to tag stack: ' + tag);
      self.tagStack.push(tag);
      return true;
    } else {
      return false;
    }
  }

  function popTag(tag) {
    var idx = self.tagStack.indexOf(tag);
    if(idx >= 0) {
      self.tagStack.splice(idx, 1);
      return true;
    } else {
      console.log('can\'t pop from tag stack: ' + tag);
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

  function replacer(match, p1, offset, string) {
    var pushed = false;
    var popped = false;
    var tags = p1.split(' ');
    var len = tags.length;
    for(var i = 0; i < len; ++i) {
      var tag = tags[i];
      if(tag.indexOf("/") == 0) {
        tag = tag.substring(1);
        console.log("tag to pop = " + tag);
        popped = popTag(tag) || popped;
      } else {
        console.log("tag to push = " + tag);
        pushed = pushTag(tag) || pushed;
      }
    }

    var replacement = '';
    if(pushed || popped) {
      if (inSpan) {
        replacement = '</span>';
      }
      var newSpan = spanForStack();
      replacement = replacement + newSpan;
    }
    return replacement;
  }

  var regex = /<##(.*?)##>/gm;

  var openingSalvo = spanForStack();
  if(openingSalvo != '') { inSpan = true; }

  var newtxt = txt.replace(regex, replacer);
  var partingShot = '';
  if(self.tagStack && self.tagStack.length && (self.tagStack.length > 0)) {
    partingShot = '</span>';
  }
  return openingSalvo + newtxt + partingShot;
};


InlineStyler.prototype.ansi_to_html = function (txt) {

  var txtArray = txt.split(/\033\[/);

  var first = txtArray.shift(); // the first chunk is not the result of the split

  var self = this;
  var transformedArray = txtArray.map(self.process_chunk);

  transformedArray.unshift(first);

  var flattened_data = transformedArray.reduce( function (a, b) {
    if (Array.isArray(b))
      return a.concat(b);

    a.push(b);
    return a;
  }, []);

  var escaped_data = flattened_data.join('');

  return escaped_data;
};

InlineStyler.prototype.process_chunk = function (text) {

  // indices here correspond to ansi numbers
  var ANSI_COLORS = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];

  function cssLookup(bright, num) {
    var name = ANSI_COLORS[num % 10];
    if(bright) return "bright-" + name;
    else return name;
  }

  // Each 'chunk' is the text after the CSI (ESC + '[') and before the next CSI/EOF.
  //
  // This regex matches two groups within a chunk.
  // The first group matches all of the number+semicolon command sequences
  // before the 'm' character. These are the graphics or SGR commands.
  // The second group is the text (including newlines) that is colored by
  // the first group's commands.
  var matches = text.match(/([\d;]*)m([\s\S]*)/m);

  if (!matches) return text;

  var orig_txt = matches[2];
  var nums = matches[1].split(';');

  var self = this;
  nums.map(function (num_str) {

    var num = parseInt(num_str);

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
    var classes = ["ansi"];
    if (self.fg) { classes.push(self.fg + "-fg");  }
    if (self.bg) { classes.push(self.bg + "-bg");  }
    return ["<span class=\"" + classes.join(' ') + "\">", orig_txt, "</span>"];
  }
};

var hasModule = (typeof module !== 'undefined');
if(hasModule) {
  module.exports = InlineStyler;
}
