'use strict';

var murmur = require('murmur');

let Q = require('q');
let ShadowClient = require('./bufferedShadowClient');

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

AvalonConnections.prototype.get = function(params, onSuccessFn, onFailureFn) {
  let self = this;

  let id = idFrom(params);
  if(self.map.has(id)) {
    console.log('located existing connection for ' + id);
    onSuccessFn({client:self.map.get(id),params:params});
  } else {
    console.log('establishing new connection for ' + id);

    let client = new ShadowClient(params);

    client.once('login result', function(data) {
      if(data.success) {
        console.log('login success for ' + id);
        self.map.set(id, client);
        onSuccessFn({client:client, params:params});
      } else {
        console.log('login failure for ' + id);
        let err = new Error('login failure for ' + id);
        err.result = data;
        onFailureFn({err:err, params:params});
      }
    });
    client.once('avalon disconnected', function(has_error) {
      console.log('avalon disconnected - removing ' + id + ' from connection pool');
      self.map.delete(id);
    });
    client.on('closed', function() {
      console.log('closed - removing ' + id + ' from connection pool');
      self.map.delete(id);
    });
  }
};

module.exports = AvalonConnections;