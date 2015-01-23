var Client = require('./shadowclient');

var client = new Client('minderbender', 'cb95tmr');

client.on('avalon connected', function() {
  console.log('avalon connected');
});

client.on('login success', function() {
  console.log("---LOGGED IN---");
  client.write('who\r\n');
});

client.on('avalon disconnected', function (had_error) {
  console.log('avalon disconnected);
});



client.on('input', function (data) {
  if(data.qual == 'user') {
    console.log("user: " + data.who);
  } else if(data.qual == 'calling from') {
  	console.log("call from: " + data.who + ' to ' + data.chan + ' with text "' + data.msg + '"');
  } else if(data.qual == 'calling to') {
  	console.log("call to: " + data.chan + ' with text "' + data.msg + '"');
  } else if(data.qual == 'tell from') {
  	console.log("tell from: " + data.who + ' with text "' + data.msg + '"');
  } else if(data.qual == 'tell to') {
  	console.log("tell to: " + data.who + ' with text "' + data.msg + '"');
  } else if(data.qual == 'unparsed') {
  	console.log("unparsed input: " + data.text);
  }
});




