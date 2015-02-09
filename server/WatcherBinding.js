var fs = require('fs');

exports.WatcherBinding = WatcherBinding;

// Encapsulates a web socket client connection from a web browser.
function WatcherBinding(clientSocket, watcher) {
  this.socket = clientSocket;
  this.watcher = watcher;
  this.watchedFiles = {};
  clientSocket.on('watch', this.handleMessage.bind(this));
  clientSocket.on('disconnect', this.disconnect.bind(this));
}

// Parse an incoming message from the client and dispatch accordingly.
WatcherBinding.prototype.handleMessage = function(data) {
  this.watchFile(data.href);
};

WatcherBinding.prototype.watchFile = function(href) {
  var filename = this.watcher.getFilenameForHref(href);
  console.log('now watching ' + href + ' as filename ' + filename);
  fs.stat(filename, function(err, stats) {
    if (err) {
      console.log('Could not read stats for ' + filename);
      return;
    }
    
    this.watchedFiles[filename] = {
      href: href,
      mtime: stats.mtime
    };
    this.watcher.startWatching(filename);
  }.bind(this));
};

WatcherBinding.prototype.updateFile = function(filename) {
  var fileInfo = this.watchedFiles[filename];
  if (fileInfo) {
    fs.stat(filename, function(err, stats) {
      if (err) {
        console.error('Could not read stats for file: ' + filename);
        return;
      }
      // Only send message to client if the file was modified
      // since we last saw it.
      if (fileInfo.mtime < stats.mtime) {
        console.log('saw an update for ' + fileInfo.href);
        this.socket.emit('watched-file-update', { href: fileInfo.href });
        fileInfo.mtime = stats.mtime;
      }
    }.bind(this));
  }
};

WatcherBinding.prototype.disconnect = function() {
  for (var filename in this.watchedFiles) {
    this.watcher.stopWatching(filename);
  }
  this.watcher.removeClient(this);
};