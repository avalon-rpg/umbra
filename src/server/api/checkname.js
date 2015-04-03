'use strict';
var telnet = require("./telnet");

function CheckName() {
  this.check = function(person, callback) {
    telnet.write("###checkname " + person + "\n", function(chunk) {
      var matchBad = /\#\#\#checkbad (-?\d+)/i.exec(chunk);
      var matchOk = /\#\#\#checkok/i.test(chunk);
      if (matchBad && matchBad[1]) {
        var status = parseInt(matchBad[1]);
        console.log("- API CHECKBAD: ", person, status);
        callback({valid: false, status: status});
      } else if (matchOk) {
        console.log("- API CHECK OK: ", person, chunk);
        callback({valid: true});
      }
    });
  };
}


module.exports = new CheckName;