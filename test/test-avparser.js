var assert = require("assert");
var expect = require('chai').expect;
var AvParser = require('../server/avparser');
var EventEmitter = require('events').EventEmitter;

describe('an AvParser', function () {
  var mockClient = new EventEmitter();
  var avParser = new AvParser(mockClient);

  var output = [];
  avParser.on('block', function (block) {
    output.push(block);
  });

  function prompt() {
    mockClient.emit("prompt", "@");
  }

  function inputLine(line) {
    mockClient.emit("line", line);
  }
  function input(data) {
    if(typeof data === "string") {
      mockClient.emit("line", data);
    } else if(typeof data === "object") {
      var len = data.length;
      for(var i = 0; i < len; ++i) {
        inputLine(data[i]);
      }
    }
  }

  it('shouldn\'t emit a one-line unterminated block', function () {
    input("this line is not special");
    expect(output).to.eql([]);
  });

  it('should emit data on a prompt', function () {
    prompt();
    expect(output).to.eql([{
      qual: "block",
      tags: ["block", "oneliner"],
      entries: [
        {line: "this line is not special", qual: "unparsed"}
      ]
    }]);
  });

  it('shouldn\'t emit a multi-line unterminated block', function () {
    output = [];
    input(["line 1", "line 2"]);
    expect(output).to.eql([]);
  });

  it('should emit data on a prompt', function () {
    mockClient.emit("prompt", "@");
    expect(output).to.eql([{
      qual: "block",
      tags: ["block"],
      entries: [
        {line: "line 1", qual: "unparsed"},
        {line: "line 2", qual: "unparsed"}
      ]
    }]);
  });

  it('should emit nothing for an empty block', function () {
    var before = output;
    mockClient.emit("prompt", "@");
    expect(output).to.eql(before);
  });

  it('should detect a sequence of 3 spaces as pre-formatted', function () {
    output = [];
    mockClient.emit("line", "line 1");
    mockClient.emit("line", "line   2");
    mockClient.emit("line", "line 3");
    mockClient.emit("prompt", "@");
    expect(output).to.eql([{
      qual: "block",
      tags: ["block", "monospaced"],
      entries: [
        {line: "line 1", qual: "unparsed"},
        {line: "line   2", qual: "unparsed"},
        {line: "line 3", qual: "unparsed"}
      ]
    }]);
  });

});