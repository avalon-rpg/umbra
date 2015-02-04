

$(function() {

  /* depressing workaround for my least favourite browser */
  var isIE = window.ActiveXObject || "ActiveXObject" in window;
  if (isIE) {
    $('.modal').removeClass('fade');
  }

  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

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

  // Initialize varibles
  var $window = $(window);

  var createNewUser = false;

  var $nameInput = $('#nameInput'); // Input for username
  var $passwordInput = $('#passwordInput'); // Input for username
  var $userlist = $('#user-list');
  var $messages = $('.messages'); // Messages area
  var $chatArea = $('.chatArea'); // Input message input box
  var $inputMessage = $('#inputMessage'); // Input message input box

  var $loginBtn = $('.loginBtn');

  // Prompt for setting a username
  var username;
  var password;
  var connected = false;
  var $currentInput = $nameInput.focus();

  var prevMsgType = '';

  var socket = io();


  // Sets the client's username
  function attemptLogin () {
    username = cleanInput($nameInput.val().trim());
    password = cleanInput($passwordInput.val().trim());

    // If the username is valid
    if (username && password) {
      $currentInput = $inputMessage.focus();

      var loginParams = {
        username: username,
        password: password,
        create: createNewUser        
      };
      if(createNewUser) {
        loginParams['gender'] = $('input[name=gender]:checked').val();
        loginParams['email'] = $('#emailInput').val().trim();
      }
      // Tell the server your username
      socket.emit('attempt login', loginParams);
    }
  }

  // Sends a chat message
  function sendMessage (text) {
    text = cleanInput(text);
    // if there is a non-empty message and a socket connection
    if (text && connected) {
      $inputMessage.val('');
      console.log("sent: " + text);
      socket.emit('send', text);
    }
  }

  // Log a message
  function log (message, options) {
    if(prevMsgType == 'prompt') { addPromptMark(); }

    var msghtml = ansi_up.ansi_to_html(message, {use_classes: true});
    var $el = $('<div>').addClass('log').html(msghtml);
    addMessageElement($el, options);
    prevMsgType = 'log';
  }

  function notify (message, options) {
    var msghtml = ansi_up.ansi_to_html(message, {use_classes: true});
    var $el = $('<div>').addClass('notification').html(msghtml);
    addMessageElement($el, options);
    prevMsgType = 'notify';
  }

  function addTell (whofrom, message, options) {
    var whofromhtml = ansi_up.ansi_to_html(whofrom + ': ', {use_classes: true});
    var msghtml = ansi_up.ansi_to_html(message);
    var $usernameDiv = $('<span class="username"/>').html(whofromhtml).css('color', getUsernameColor(whofrom));
    var $messageBodyDiv = $('<span class="messageBody">').html(msghtml);
    var $messageDiv = $('<li class="message"/>').data('username', whofrom).append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
    prevMsgType = 'tell';
  }

  function addPrompt() {
    if(prevMsgType == 'log') {
      prevMsgType = 'prompt';
    }
  }

  function addPromptMark() {
    var $iconElem = $('<i class="icon caret right prompt">');
    addMessageElement($iconElem);
  }
  
  function mkIcon(classes) {
    return $('<i class="' + classes + ' icon">');
  }

  function addComms(data) {

    var parts = [];

    if(data.chan) {
      parts.push($('<div class="channel">').text(data.chan));
    }

    if(data.who) {
      var whohtml = ansi_up.ansi_to_html(data.who, {use_classes: true});
      parts.push($('<div class="who">').html(whohtml));
    }


    if(data.city) {
      parts.push($('<div class="city">').html(data.city));
    }

    var msghtml = ansi_up.ansi_to_html(data.msg, {use_classes: true});
    parts.push($('<div class="msg">').html(msghtml));

    var $commsContentElem = $('<div class="commscontent">');
    $commsContentElem.append(parts);

    var $commsElem = $('<div class="comms">');
    $commsElem.append(mkIcon(data.iconClasses), $commsContentElem);

    addMessageElement($commsElem);
    prevMsgType = 'comms';
  }

  function addAvmsg(data) {
    var $elem = $('<div class="avmsg ' + data.tag + '">');
    for (var prop in data) {
      if(prop != 'qual' && prop != 'tag' && data.hasOwnProperty(prop)) {
        $elem.append($('<div class="'+prop+'">').text(data[prop]));
      }
    }
    addMessageElement($elem);
    // add location reveal handler here
    prevMsgType = 'avmsg';
  }


  function elemExists(q) {
    return ($(q).length > 0);
  }

  function concatUserName(user) {
    var str = '';
    if(user.prefix && user.prefix.trim() != '') {
      str = str + user.prefix + ' ';
    }
    str = str + user.name;
    if(user.suffix && user.suffix.trim() != '') {
      if(user.suffix[0] != ',') {
        str = str + ' ';
      }
      str = str + user.suffix + ' ';
    }
    return str;
  }

  function addUser(user) {
    if(!elemExists('#player_'+user.name)) {
      // var $badge = $('<span class="badge"/>').text('42');
      var $userItem = $('<a class="user item" id="player_' + user.name + '" href="#"/>')
        .data('command', user.name)
        .data('user', user)
        .text(user.name);

      
      var $cardHeader = $('<div class="header">').text(concatUserName(user));
      var $cardMeta = $('<div class="meta">').text(user.city);

      var cardContents = [];
      for (var prop in user) {
        if(prop != 'qual'
        && prop != 'prefix'
        && prop != 'name'
        && prop != 'suffix'
        && prop != 'city'
        && user.hasOwnProperty(prop)){
          cardContents.push($('<li>').text(prop + ': ' + user[prop]));
        }
      }

      var $cardContent = $('<div class="content">')
        .append($('<ul>').append(cardContents));

      var $userPopup = $('<div class="ui card popup" id="player_popup_' + user.name + '"">')
        .append($cardHeader, $cardMeta, $cardContent);

      $userlist.append($userItem);
      $userlist.append($userPopup);

      $userItem.popup({
        popup    : $('player_popup_' + user.name),
        on       : 'hover'
      });

      $('#leftSidebarScroll').nanoScroller();
    }
  }

  function addChannel(code, name) {
    if(0 == $('#channel_' + code).length) {
      // var $badge = $('<span class="badge"/>').text('42');
      var $label = $('<div class="ui label">').text(code);
      var $elem = $('<a class="item" id="channel_' + code + '" href="#"/>')
        .data('code', code)
        .data('command', code)
        .append($label)
        .append($('<span>').text(name));//.append($badge);

      $('#calling-list').append($elem);
      $('#leftSidebarScroll').nanoScroller();

      if(code == 'ccc') { $('#city-stat').text(name); }
      if(code == 'ccg') { $('#guild-stat').text(name); }
      if(code == 'ccp') { $('#profession-stat').text(name); }
      if(code == 'cco') { $('#order-stat').text(name); }
    }
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
    $(".nano").nanoScroller();
    $("#output-scroller").nanoScroller({ scroll: 'bottom' });
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }



  $( document ).on( "click", "a.item", function(event) {
    var cmd = $(this).data('command');
    if(cmd) {
      $inputMessage.val(cmd + ' ');
      $inputMessage.focus();
    }
  });
 
  $('#input-message-form').submit( function(event) {
    sendMessage($inputMessage.val());
    event.preventDefault();
  });


  $('#newUserDropdown').accordion({
    onOpen: function () { createNewUser = true; },
    onClose: function () { createNewUser = false; }
  });

  $('#login-form').validate({
    submitHandler: function (form) {
      $('#login-form').transition('pulse');
      attemptLogin();
    }
  });

  $('#nameInput').rules('add', {
    required: true,
    minlength: 3,
    maxlength: 18,
    messages: {
      required:  'This field is required',
      minlength: 'Your username needs to be at least 3 characters',
      maxlength: 'Your username needs to be less than 18 characters',
      remote:    'This username is already taken, try another one.'
    }
  });

  $('#passwordInput').rules('add', { required: true });

  $('#confirmPasswordInput').rules('add', {
    required: { depends: function(element) { return createNewUser; } },
    equalTo: '#passwordInput'    
  });

  $('#emailInput').rules('add', {
    required: { depends: function(element) { return createNewUser; } },
    email: true    
  });


  // Click events

  //Focus input when clicking on the message input's border
  // $('#output-segment').click(function () {
  //   $inputMessage.focus();
  // });

  $('#toggleLeftSidebar').click(function () {
    $('#leftSidebar')
    .sidebar('setting', {
      dimPage             : false,
      closable            : false,
      transition          : 'push',
      mobileTransition    : 'push'})
    .sidebar('toggle');

    $('#toggleLeftSidebar').toggleClass('active');
  });



  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login result', function (data) {
    if(data.success) {
      connected = true;
      $('#login-form').transition({
        animation: 'vertical flip',
        onComplete: function() { $('#introText').transition('vertical flip'); }
      });
      // Display the welcome message
      log('Welcome to Umbra - You are now connected to Avalon', { prepend: true });
    } else {
      //do validation results
      //$('.autumn.leaf').transition('slide down');
    }
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

  socket.on('prompt', function (text) {
    console.log('prompt: ' + text);    
    addPrompt();
  });

  function handleProto(code, content) {
    console.log('###' + code + ' ' + content);

    if(code == 'playername') {
      $('#playername').text(content);
    } else if(code == 'brief') {
      $('#current-loc').text(content);
    } else if(code == 'health') {
      var split = content.split(" ");
      $('#health-stat').text(split[0]);
      $('#max-health-stat').text(split[1]);
    } else if(code == 'mana') {
      var split = content.split(" ");
      $('#mana-stat').text(split[0]);
      $('#max-mana-stat').text(split[1]);
    } else if(code == 'level') {
      $('#level-stat').text(content);
    } else if(code == 'xp') {
      $('#xp-stat').text(content);
    } else if(code == 'lessons') {
      $('#lessons-stat').text(content);
    } else if(code == 'bloodlust') {
      $('#bloodlust-stat').text(content);
    } else if(code == 'alignment') {
      $('#alignment-stat').text(content);
    }
  }

  var commsTypes = [
    { name: 'calling from',        iconClasses: 'from comment'    },
    { name: 'calling to',          iconClasses: 'to comment'      },
    { name: 'novice-calling from', iconClasses: 'from student'    },
    { name: 'novice-calling to',   iconClasses: 'to student'      },
    { name: 'tell from',           iconClasses: 'from reply'      },
    { name: 'tell to',             iconClasses: 'to share'        },
    { name: 'speech from',         iconClasses: 'from quote left' },
    { name: 'speech to',           iconClasses: 'to quote left'   },
    { name: 'rune-bug',            iconClasses: 'bug'             }
  ];

  function lookupCommsType(name) {
    for(i = 0; i < commsTypes.length; ++i) {
      var ct = commsTypes[i];
      if(ct.name == name) { return ct; }
    }
  }

  socket.on('input', function (data) {    
    console.log('input: ' + JSON.stringify(data));

    var ct = lookupCommsType(data.qual);
    if(ct) {
      data.iconClasses = ct.iconClasses;
      addComms(data);
    } else if(data.qual == 'avmsg') {
      addAvmsg(data);      
    } else if(data.qual == 'user') {
      //console.log(JSON.stringify(data));
      addUser(data);      
    } else if(data.qual == 'channel') {
      //console.log('input: ' + JSON.stringify(data));
      addChannel(data.code, data.name);
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
    } else if(data.qual == 'protocol') {
      handleProto(data.code, data.content);
    } else {
      //console.log('input: ' + JSON.stringify(data));
    }
  });

  var keypadCodes = [
    {code: 111, char: '/', cmd: 'out'},
    {code: 106, char: '*', cmd: 'in'},
    {code: 109, char: '-', cmd: 'up'},
    {code: 107, char: '+', cmd: 'down'},
    {code: 110, char: '.', cmd: ''},
    {code: 96,  char: '0', cmd: ''},
    {code: 97,  char: '1', cmd: 'sw'},
    {code: 98,  char: '2', cmd: 's'},
    {code: 99,  char: '3', cmd: 'se'},
    {code: 100, char: '4', cmd: 'w'},
    {code: 101, char: '5', cmd: ''},
    {code: 102, char: '6', cmd: 'e'},
    {code: 103, char: '7', cmd: 'nw'},
    {code: 104, char: '8', cmd: 'n'},
    {code: 105, char: '9', cmd: 'ne'}
  ];

  //this should work better on an iPad
  $(document).keydown( function (e) {
    if(connected) {
      var str = '';

      if (e.shiftKey) { str = 'shift+' + str; }
      if (e.ctrlKey)  { str = 'ctrl+' + str;  }
      if (e.altKey) { str = 'alt+' + str; }

      var len = keypadCodes.length;
      for (var i = 0; i < len; i++) {
        var entry = keypadCodes[i];
        if(entry.code == e.keyCode) {
          str = str + entry.char;
          if(entry.cmd != '') {
            sendMessage(entry.cmd);
          }
          console.log(str);
        }
      }
    }
  });

  /////////////////////////////////////////////
  // Page initialisation

  //turn on nano-scrollbars
  //$(".nano").nanoScroller();

  //initialise clicky bits
  $('.ui.dropdown').dropdown();
  $('.ui.accordion').accordion();

  // $('#login-form').submit( function(event) {
  //   $('#login-modal').modal('hide');
  //   attemptLogin();
  //   event.preventDefault();
  // });


  // showLoginModal();


});

