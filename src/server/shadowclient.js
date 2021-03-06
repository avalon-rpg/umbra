"use strict";
let util = require("util");
let net = require("net");
let binary = require("binary");

let EventEmitter = require("events").EventEmitter;
let GaBlockSplitter = require("./gaBlockSplitter");

if (typeof String.prototype.startsWith !== "function") {
  // see below for better implementation!
  String.prototype.startsWith = function(str) {
    return this.indexOf(str) === 0;
  };
}

function ShadowClient(params) {
  EventEmitter.call(this);
  this.init(params);
}

util.inherits(ShadowClient, EventEmitter);

ShadowClient.prototype.init = function(params) {
  let self = this;
  self.setMaxListeners(30);

  self.host = "avalon-rpg.com";
  self.port = 23;
  if (params.game && params.game === "legends") {
    self.host = "legends.avalon-rpg.com";
  } else if (params.game && params.game === "omerta") {
    self.host = "omertalaw.com";
  }
  self.username = params.username;
  self.password = params.password;
  self.gender = params.gender;
  self.email = params.email || "";
  self.create = params.create || false;

  console.log(
    "attempting avalon login to host: " + self.host + ", port: " + self.port
  );

  // console.log('ShadowLogin initialising as: ' + JSON.stringify(self));

  self.conn = net.connect({ port: self.port, host: self.host }, function() {
    self.connected = true;
    if (params.playerAddress) {
      self.conn.write("###ack origin@ " + params.playerAddress + "\r\n");
    }
    console.log(
      "avalon connected, host: " + self.host + ", port: " + self.port
    );
  });

  let onLine = function(line) {
    if (self.username === "gwahir") {
      console.log(
        `${self.username} got: »»${line
          .replace(/\u001b/g, "◘")
          .replace(/\n/g, "\\n")}««`
      );
    }

    if (!self.loggedIn) {
      if (self.loggingIn) {
        if (line.startsWith("###ACK LOGIN OK")) {
          console.log("Seen ###ACK LOGIN OK for " + self.username);
          self.loggedIn = true;
          self.loggingIn = false;
          if (params.playerAddress) {
            self.conn.write("###ack origin@ " + params.playerAddress + "\r\n");
          }
          self.emit("login result", {
            success: true
          });
        } else if (line.startsWith("ERROR: ###ACK ERROR @ bad persona")) {
          console.log(self.username + " « " + line);
          self.loggedIn = false;
          self.loggingIn = false;
          self.badCredentials = true;
          self.connected = false;
          self.emit("login result", {
            success: false,
            username: self.username,
            reason: "bad username"
          });
        } else if (line.startsWith("ERROR: ###ACK ERROR @ bad password")) {
          // console.log(self.username + " « " + line);
          self.loggedIn = false;
          self.loggingIn = false;
          self.badCredentials = true;
          self.connected = false;
          self.emit("login result", {
            success: false,
            username: self.username,
            reason: "bad password"
          });
        } else {
          console.log("Unexpected login response: " + line);
        }
      }

      return;
    }

    self.emit("line", line);
  };

  let onPrompt = function(prompt) {
    if (self.loggedIn) {
      if (prompt.trim() === "") {
        prompt = "-";
      }
      self.emit("prompt", prompt.trim());
    } else if (
      !self.badCredentials &&
      prompt.indexOf("What is the name of your character?") === 0
    ) {
      self.loggingIn = true;
      console.log("login prompt seen");
      let loginline;
      if (self.create) {
        // console.log(
        //   "attempting to log in new user " +
        //     self.username +
        //     " with email " +
        //     self.email
        // );
        loginline =
          "###ack create@ " +
          self.username +
          " " +
          self.password +
          " " +
          self.gender +
          " " +
          self.email;
      } else {
        console.log("attempting to log in existing user " + self.username);
        loginline = "###ack login@ " + self.username + " " + self.password;
      }
      self.conn.write(loginline + "\r\n");
    } else {
      console.log("pre-login prompt: " + prompt);
    }
  };

  let blockSplitter = new GaBlockSplitter({
    input: self.conn,
    blockDebug: false,
    lineDebug: false, // (self.username === 'gwahir'),
    onLine: onLine,
    onPrompt: onPrompt
  });

  self.conn.on("close", function(had_error) {
    console.log("shadow client closing for " + self.username);
    self.connected = false;
    blockSplitter = null;
    self.emit("avalon disconnected", had_error);
  });
};

ShadowClient.prototype.write = function(input) {
  if (this.connected) {
    this.conn.write(input);
  } else {
    console.error("couldn't send msg to disconnected client: " + input);
  }
};

ShadowClient.prototype.close = function() {
  if (this.connected) {
    this.write("###ack logout@ " + this.username + "\r\n");
    //this.emit('closed', false);
    //this.connected = false;
    //this.conn = null;
  }
};

ShadowClient.prototype.forceClose = function() {
  console.log(
    "shadowclient force close requested, currently connected = " +
      this.connected
  );
  this.emit("avalon disconnected", false);
  if (this.connected) {
    this.conn.end();
    this.connected = false;
    this.conn = null;
  }
};

ShadowClient.prototype.pause = function() {
  if (this.connected) {
    //this.conn.write('aura who on\r\n');
    this.write("###ack disconnect@\r\n");
  }
};

module.exports = ShadowClient;
