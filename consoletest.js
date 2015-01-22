var Client = require('./shadowclient');

var client = new Client('minderbender', 'cb95tmr');

client.on('connect', function() {
  console.log('server connected');
});

client.on('login success', function() {
  console.log("---LOGGED IN---");
  client.write('who\r\n');
});

client.on('avalon disconnected', function (had_error) {
  console.log('avalon disconnected);
});

client.on('user', function (user) {
  console.log("user: " + user);
});

client.on('input', function (data) {
  if(data.qual == 'calling') {
  	console.log("call from: " + data.who + ' to ' + data.list + ' with text "' + data.text + '"');
  } else if(data.qual == 'tell from') {
  	console.log("tell from: " + data.who + ' with text "' + data.msg + '"');
  } else if(data.qual == 'tell to') {
  	console.log("tell to: " + data.who + ' with text "' + data.msg + '"');
  } else if(data.qual == 'unparsed') {
  	console.log("unparsed input: " + data.text);
  }
});




