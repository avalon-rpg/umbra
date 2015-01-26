$(document).ready(function() {
  //init sidebar
  $('[data-toggle=offcanvas]').click(function() {
    $('.row-offcanvas').toggleClass('active');
  });

  //show login modal
  $('#loginModal').modal();
});

$(function() {

  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize varibles
  var $window = $(window);
  var $nameInput = $('.nameInput'); // Input for username
  var $passwordInput = $('.passwordInput'); // Input for username
  var $sidelist = $('.sidelist');
  var $messages = $('.messages'); // Messages area
  var $chatArea = $('.chatArea'); // Input message input box
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginBtn = $('.loginBtn');

  // Prompt for setting a username
  var username;
  var password;
  var connected = false;
  var $currentInput = $nameInput.focus();

  var socket = io();


  // Sets the client's username
  function attemptLogin () {
    username = cleanInput($nameInput.val().trim());
    password = cleanInput($passwordInput.val().trim());

    // If the username is valid
    if (username && password) {
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('attempt login', username, password);
    }
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      console.log("sent: " + message);
      socket.emit('send', message);
    }
  }

  // Log a message
  function log (message, options) {
    var msghtml = ansi_up.ansi_to_html(message, {use_classes: true});
    var $el = $('<li>').addClass('log').html(msghtml);
    addMessageElement($el, options);
  }

  function notify (message, options) {
    var msghtml = ansi_up.ansi_to_html(message, {use_classes: true});
    var $el = $('<li>').addClass('notification').html(msghtml);
    addMessageElement($el, options);
  }

  function addTell (whofrom, message, options) {
    var whofromhtml = ansi_up.ansi_to_html(whofrom + ': ', {use_classes: true});
    var msghtml = ansi_up.ansi_to_html(message);
    var $usernameDiv = $('<span class="username"/>').html(whofromhtml).css('color', getUsernameColor(whofrom));
    var $messageBodyDiv = $('<span class="messageBody">').html(msghtml);
    var $messageDiv = $('<li class="message"/>').data('username', whofrom).append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  function addUser(name) {
    // var $badge = $('<span class="badge"/>').text('42');
    var $userLink = $('<a href="#"/>').text(name);//.append($badge);
    var $userElem = $('<li class="user"/>').append($userLink);

    $sidelist.append($userElem);
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    // if (!(event.ctrlKey || event.metaKey || event.altKey)) {
    //   if (connected) { $currentInput.focus(); }
    // }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (connected) { sendMessage(); } else { attemptLogin(); }
    }
  });

  $loginBtn.click(function () {
    attemptLogin();
  });


  // Click events

  //Focus input when clicking on the message input's border
  $chatArea.click(function () {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login success', function () {
    connected = true;
    $('#loginModal').modal('hide');
    // Display the welcome message
    var message = "Welcome to Avalon shadow-Chat";
    log(message, { prepend: true });
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' departed to walk the void');
  });

  socket.on('avalon disconnected', function (data) {
    log('*** AVALON DISCONNECTED ***');
  });

  socket.on('disconnect', function () {
    connected = false;
    log('*** WEBSOCKET DISCONNECTED ***');
  });

  socket.on('reconnect', function () {
    log('*** WEBSOCKET RECONNECTED ***');
    if (username && password) {
      socket.emit('confirm login', username, password);
    }
  });


  socket.on('input', function (data) {    
    if(data.qual == 'user') {
      addUser(data.who);      
    } else if(data.qual == 'calling from') {
      addTell(data.who + ' @ ' + data.chan, data.msg);
    } else if(data.qual == 'calling to') {
      addTell('You => ' + data.chan, data.msg);
    } else if(data.qual == 'novice-calling from') {
      addTell(data.who + ' (' + data.chan + ') => Novices', data.msg);
    } else if(data.qual == 'novice-calling to') {
      addTell('You (' + data.chan + ') => Novices', data.msg);
    } else if(data.qual == 'tell from') {
      addTell(data.who + ' => You', data.msg);
    } else if(data.qual == 'tell to') {
      addTell('You => ' + data.who, data.msg);
    } else if(data.qual == 'speech from') {
      addTell(data.who, data.msg);
    } else if(data.qual == 'speech to') {
      addTell('You', data.msg);
    } else if(data.qual == 'rune-bug') {
      addTell('Rune-Bug', data.msg);
    } else if(data.qual == 'notification') {
      var block = '';
      for(var i = 0; i < data.lines.length; i++) {
        if(i == 0) {
          block = data.lines[0];
        } else {
          block = block + '\r\n' + data.lines[i];
        }
      }
      notify(block);
    } else if(data.qual == 'unparsed') {
      log(data.line);  
    } else {
      console.log('input: ' + JSON.stringify(data));
    }
  });

});