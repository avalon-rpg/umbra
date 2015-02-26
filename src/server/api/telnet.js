var net = require("net");


(function(global) {
  "use strict";
  var Telnet = function() {

    if ( Telnet.prototype._singletonInstance ) {
      return Telnet.prototype._singletonInstance;
    }
    Telnet.prototype._singletonInstance = this;

    var client = null;
    var evoke = null;
    var self = this;
    var lastData = null;
    var isClosed = true;

    this.connect = function(onConnect) {
      console.log("--- API CONNECTING ---");
      client = net.connect(23, "avalon-rpg.com",function(){
        isClosed = false;
        if (onConnect) onConnect();
      });
      client.setKeepAlive(true);
      client.on("data", function(chunk) {
        // console.log("- API RECEIVE: ", chunk.toString("utf8"));
        if (evoke) evoke(chunk.toString("utf8"));
      });
      client.on("error", function(err) {
        console.error("- API ERROR: ", err)
      });
      client.on("close", function() {
        console.log("- API CLOSE");
        isClosed = true;
        //self.connect();
      });
      client.on("end", function() {console.log("- API END")});
      client.write("###version 2\n");
      console.log("--- API Conected ---\n");
    };

    this.write = function(data, callback) {
      console.log("writing")
      evoke = callback;
      lastData = data;
      if (isClosed === true) {
        self.connect(function() {
          self.write(data, callback);
        })
      } else {
        console.log("- API SEND: ", data);
        client.resume();
        client.write(data);
      }
    }

    this.pause = function() {
      client.pause();
    }

  };

  global.telnet = new Telnet();
  telnet.connect();

}(root));

module.exports = telnet;