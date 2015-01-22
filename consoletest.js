var Client = require('./shadowclient');

var client = new Client('minderbender', 'cb95tmr');

client.on('connect', function() {
  console.log('server connected');
});

client.on('login success', function() {
  console.log("---LOGGED IN---");
  client.write('who\r\n');
});

client.on('line', function (line) {
  console.log("line: " + line);
});

client.on('user', function (user) {
  console.log("user: " + user);
});

client.on('calling', function (who, list, text) {
  console.log("call from: " + who + ' to ' + list + ' with text "' + text + '"');
});

client.on('tell', function (who, text) {
  console.log("tell from: " + who + ' with text "' + text + '"');
});

client.on('avalon disconnected', function (had_error) {
  console.log('avalon disconnected);
});