'use strict';

var murmur = require('murmur');

let Q = require('q');
let ShadowClient = require('./bufferedShadowclient');

function AvalonConnections() {
  this.map = new Map();
}

function idFrom(params) {
  let plain = params.username + '/' + murmur.hash128(params.password).hex();
  if(params.game && params.game !== 'avalon') {
    return plain + '@' + params.game;
  } else {
    return plain;
  }
}

AvalonConnections.prototype.get = function(params) {
  let self = this;
  let ret = Q.defer();

  let id = idFrom(params);
  if(self.map.has(id)) {
    console.log('located existing connection for ' + id);
    ret.resolve(self.map.get(id));
  } else {
    console.log('establishing new connection for ' + id);

    let client = new ShadowClient(params);

    client.once('login result', function(data) {
      if(data.success) {
        console.log('login success for ' + id);
        self.map.set(id, client);
        ret.resolve(client);
      } else {
        console.log('login failure for ' + id);
        ret.reject(new Error(data));
      }
    });
    client.once('avalon disconnected', function() {
      self.map.delete(id);
    });
  }

  return ret.promise;
};

module.exports = AvalonConnections;