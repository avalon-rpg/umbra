var assert = require("assert");
var InlineStyler = require("../web/script/inline-styler.js");

describe('Styler', function(){
  it('should open and close spans mid-string', function(){
    var styler = new InlineStyler();
    var input = "lorem, <##tag##>ipsum,<##/tag##> blah blah blah";
    var output = styler.inline_to_html(input);
    var expected = 'lorem, <span class="tag">ipsum,</span> blah blah blah';
    assert.equal(output, expected);
  });
  it('should open and close spans at the ends of a string', function(){
    var styler = new InlineStyler();
    var input = "<##tag##>lorem, ipsum, blah blah blah<##/tag##>";
    var output = styler.inline_to_html(input);
    var expected = '<span class="tag">lorem, ipsum, blah blah blah</span>';
    assert.equal(output, expected);
  });
  it('should reset all styles on encountering a tag named reset', function(){
    var styler = new InlineStyler();
    var input = "<##one##>lorem, <##two##>ipsum, <##reset##>blah blah blah<##/tag##>";
    var output = styler.inline_to_html(input);
    var expected = '<span class="one">lorem, </span><span class="one two">ipsum, </span>blah blah blah';
    assert.equal(output, expected);
    var line2 = "xxx";
    var output2 = styler.inline_to_html(line2);
    assert.equal(output2, "xxx");
  });
  it('should handle escaped delimiters', function(){
    var styler = new InlineStyler();
    var input = "&lt;##tag##&gt;lorem, ipsum, blah blah blah&lt;##/tag##&gt;";
    var output = styler.inline_to_html(input);
    var expected = '<span class="tag">lorem, ipsum, blah blah blah</span>';
    assert.equal(output, expected);
  });
  it('should auto-close an open tag', function(){
    var styler = new InlineStyler();
    var input = "<##tag##>lorem, ipsum, blah blah blah";
    var output = styler.inline_to_html(input);
    var expected = '<span class="tag">lorem, ipsum, blah blah blah</span>';
    assert.equal(output, expected);
  });
  it('should auto-close multiple open tags', function(){
    var styler = new InlineStyler();
    var input = "<##one##>lorem, ipsum, <##two##>blah blah blah";
    var output = styler.inline_to_html(input);
    var expected = '<span class="one">lorem, ipsum, </span><span class="one two">blah blah blah</span>';
    assert.equal(output, expected);
  });
  it('should ignore an unmatched closing tag', function(){
    var styler = new InlineStyler();
    var input = "lorem, ipsum, blah blah blah<##/tag##>";
    var output = styler.inline_to_html(input);
    var expected = 'lorem, ipsum, blah blah blah';
    assert.equal(output, expected);
  });
  it('should handle nesting', function(){
    var styler = new InlineStyler();
    var input = "<##outer##>lorem, <##inner##>ipsum,<##/inner##> blah blah blah<##/outer##>";
    var output = styler.inline_to_html(input);
    var expected = '<span class="outer">lorem, </span><span class="outer inner">ipsum,</span><span class="outer"> blah blah blah</span>';
    assert.equal(output, expected);
  });
  it('should handle overlaps', function(){
    var styler = new InlineStyler();
    var input = "<##left##>lorem, <##right##>ipsum,<##/left##> blah blah blah<##/right##>";
    var output = styler.inline_to_html(input);
    var expected = '<span class="left">lorem, </span><span class="left right">ipsum,</span><span class="right"> blah blah blah</span>';
    assert.equal(output, expected);
  });
  it('should handle multiple tags in a delimiter', function(){
    var styler = new InlineStyler();
    var input = "<##one two##>lorem, <##/one##>ipsum<##/two##>";
    var output = styler.inline_to_html(input);
    var expected = '<span class="one two">lorem, </span><span class="two">ipsum</span>';
    assert.equal(output, expected);
  });
  describe('When Reused', function(){
    var styler = new InlineStyler();
    it('should close an open tag at the end of a line', function(){
      var input = "<##tag##>line 1";
      var output = styler.inline_to_html(input);
      var expected = '<span class="tag">line 1</span>';
      assert.equal(output, expected);
    });
    it('should retain a tag across calls', function(){
      var input = "line 2";
      var output = styler.inline_to_html(input);
      var expected = '<span class="tag">line 2</span>';
      assert.equal(output, expected);
    });
    it('should close a previously opened tag', function(){
      var input = "line 3<##/tag##> now closed";
      var output = styler.inline_to_html(input);
      var expected = '<span class="tag">line 3</span> now closed';
      assert.equal(output, expected);
    });
  });
});