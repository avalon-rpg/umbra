var expect = require('chai').expect;

describe('jquery', function () {

  var $;

  before(function () {
    $ = require('cheerio');
  });

  it('creating elements works', function () {
    var div = $("<div>hello <b>world</b></div>");
    expect(div.html()).to.eql('hello <b>world</b>');
  });

});