'use strict';
var checkName = require("./checkname");

var checkErrors = {
  2: "This username has already been used",
  1: "You can't use this username"
};

var api = {
  checkName : function(req, res) {
    try {
      var name = req.params["username"] || req.query["username"] || req.params["name"] || req.query["name"];
      var newUser = req.params["newUser"] || req.query["newUser"] || 'true';
      if(newUser === 'false') {
        res.send('true');
        res.end();
      } else if (!name) {
        res.send('Please fill in a name');
        res.end();
      } else {
        checkName.check(name, function(chk) {
          var snd;
          if (chk.valid) { snd = 'true'; }
          else { snd = '"Username ' + name + ' is unavailable"'; }
          res.send(snd);
          res.end();
        });
      }

    } catch(e) {console.error(e)}
  }
};

module.exports = api;