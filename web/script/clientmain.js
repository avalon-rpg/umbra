

$(function() {

  var bKeepCommand = true;
  var bCompleteCommand = true;
  var lastInput = "";

  var cmd_delimiter = ";";

  var FADE_TIME = 150; // ms

  var loginValidator;
  var createNewUser = false;

  var $outputBox = $('#output-box'); // Messages area
  var $inputBox = $('#input-box'); // Input message input box
  var cmdHistory = [];
  var cmdHistoryPos = 0;

  // Prompt for setting a username
  var username;
  var password;
  var connected = false;
  var $currentInput = $('#nameInput').focus();

  var prevMsgType = '';

  var socket = io();

  var styler = new InlineStyler();


  // Sets the client's username
  function attemptLogin () {
    username = cleanInput($('#nameInput').val().trim());
    password = cleanInput($('#passwordInput').val().trim());

    // If the username is valid
    if (username && password) {
      $currentInput = $inputBox.focus();

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
    addToCmdHistory(text);
    text = cleanInput(text);
    // if there is a non-empty message and a socket connection
    if (text && connected) {
      if (!bKeepCommand) $inputBox.val('');
      $inputBox.select();
      console.log("sent: " + text);
      socket.emit('send', text);
    }
  }

  function addToCmdHistory() {
    var _ref = $inputBox.val().split(cmd_delimiter);
    for (var i = 0; i < _ref.length; i++)
      if (cmdHistory.indexOf(_ref[i]) === -1) // don't add duplicates
        cmdHistory.unshift(_ref[i]); // add to start of array
  }

  function completeCommand(line, incr) {
    if (bCompleteCommand == false || cmdHistory.length == 0) return false;

    var cmds = cmdHistory.filter(function (cmd) {
      return cmd.indexOf(line) == 0
    });

    if (cmds.length == 0) return false;

    if (cmdHistoryPos == cmds.length)
      $inputBox.val(line);
    else
      $inputBox.val(cmds[cmdHistoryPos]);

    cmdHistoryPos = cmdHistoryPos + incr;
    if (cmdHistoryPos > cmds.length) cmdHistoryPos = 0; 
    if (cmdHistoryPos < 0) cmdHistoryPos = cmds.length;
    $inputBox.focus();
  }

  function tabComplete() {
    if (bCompleteCommand == false) return false;
    completeCommand(lastInput, 1);
  }

  function historyPrev() {
    if (bCompleteCommand == false) return false;
    completeCommand(lastInput, 1);
    $inputBox[0].setSelectionRange(lastInput.length, $inputBox.val().length)
  }

  function historyNext() {
    if (bCompleteCommand == false) return false;
    completeCommand(lastInput, -1);
    $inputBox[0].setSelectionRange(lastInput.length, $inputBox.val().length)
  }

  // Log a message
  function mkLine (data) {
    if(prevMsgType == 'prompt') { addPromptMark(); }

    if(data.tags && data.who && data.tags.indexOf("sphere-movement") >= 0) {
      var previous = $('.sphere-movement.person-'+data.who).remove();
    }
    var cssClasses = '';
    if(data.tags && data.tags.length > 0) {
      cssClasses = data.tags.join(' ');
    }

    var msghtml = styler.style(data.line);
    var $el = $('<div class="' + cssClasses + '">').addClass('line').html(msghtml);
    prevMsgType = 'line';
    return $el
  }

  function log (message, options) {
    addMessageElement(mkLine(message), options);
  }

  function addPrompt() {
    if(prevMsgType == 'line') {
      prevMsgType = 'prompt';
    }
  }

  function mkPromptMark() { return $iconElem = $('<i class="icon caret right prompt">'); }
  function addPromptMark() { addMessageElement(mkPromptMark()); }
  
  function mkIcon(classes) { return $('<i class="' + classes + ' icon">'); }

  function mkComms(data) {
    var parts = [];

    if(data.chan) {
      parts.push($('<div class="channel">').text(data.chan));
    }

    if(data.who) {
      var whohtml = styler.style(data.who);
      parts.push($('<div class="who">').html(whohtml));
    }


    if(data.city) {
      parts.push($('<div class="city">').html(data.city));
    }

    var msghtml = styler.style(data.msg);
    parts.push($('<div class="msg">').html(msghtml));

    var $commsContentElem = $('<div class="commscontent">');
    $commsContentElem.append(parts);

    var $commsElem = $('<div class="comms ' + data.commsClasses + '">');
    $commsElem.append(mkIcon(data.iconClasses), $commsContentElem);

    prevMsgType = 'comms';
    return $commsElem;
  }

  function mkAvmsg(data) {
    var cssClasses = '';
    if(data.tags && data.tags.length > 0) {
      cssClasses = data.tags.join(' ');
    }
    var $elem = $('<div class="avmsg ' + cssClasses + '">');
    for (var prop in data) {
      if(prop != 'qual' && prop != 'tags' && prop != 'tag' && prop != 'monospaced' && data.hasOwnProperty(prop)) {
        var styled = styler.style(data[prop]);
        $elem.append($('<div class="'+prop+'">').html(styled));
      }
    }
    prevMsgType = 'avmsg';
    return $elem;
  }

  function mkAvmap(data) {
    var oldmaps = $('.avmap');
    oldmaps.remove();
    var $elem = $('<div class="avmap">');
    $elem.append($('<div class="loc">').text(data.loc));
    $elem.append($('<div class="region">').text(data.region));
    // We explicitly DON'T want to support lingering styler backrounds inside maps,
    // so only run the ANSI phase and not full styling.
    var ansiLines = styler.ansi_to_html(data.lines.join('\n'));
    $elem.append($('<div class="lines">').html(ansiLines));

    prevMsgType = 'avmap';

    return $elem;
    // add location reveal handler here
  }

  function mkTable(table) {

    var $table = $('<table class="ui inverted collapsing striped celled table">');
    if(table.header && table.header.rows && table.header.rows.length > 0) {
      var $header = $('<thead>');
      var rlen = table.header.rows.length;
      for(var r=0; r < rlen; ++r) {
        var row = table.header.rows[r];
        var $row = $('<tr>');

        var clen = row.length;
        for(var c=0; c < clen; ++c) {
          var cell = row[c];
          var ansi = styler.style(cell);
          var $cell = $('<th>').html(ansi);
          $row.append($cell);
        }
        $header.append($row);
      }
      $table.append($header);
    }
    if(table.body && table.body.rows && table.body.rows.length > 0) {
      var $body = $('<tbody>');
      var rlen = table.body.rows.length;
      for (var r = 0; r < rlen; ++r) {
        var row = table.body.rows[r];
        var $row = $('<tr>');

        var clen = row.length;
        for (var c = 0; c < clen; ++c) {
          var cell = row[c];
          var ansi = styler.style(cell);
          var $cell = $('<td>').html(ansi);
          $row.append($cell);
        }
        $body.append($row);
      }
      $table.append($body);
    }
    return $table;
  }

  function elemExists(q) { return ($(q).length > 0); }

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

      $('#user-list').append($userItem, $userPopup);

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
  function addMessageElement ($el, options) {
    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = false;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $outputBox.prepend($el);
    } else {
      $outputBox.append($el);
    }
    $outputBox[0].scrollTop = $outputBox[0].scrollHeight;
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
      $inputBox.val(cmd + ' ');
      $inputBox.focus();
    }
  });
 
  $('#input-message-form').submit( function(event) {
    sendMessage($inputBox.val());
    event.preventDefault();
  });


  $('#newUserDropdown').accordion({
    onOpen: function () {
      createNewUser = true;
      $('#nameInput').removeData('previousValue');
      $('#nameInput').valid();
    },
    onClose: function () {
      createNewUser = false;
      $('#nameInput').removeData('previousValue');
      $('#nameInput').valid();
    }
  });

  $.validator.setDefaults({
    errorClass: 'errorField',
    errorElement: 'div',
    errorPlacement: function(error, element) {
      error.addClass("ui red pointing above ui label error").appendTo( element.closest('div.field') );
    },
    highlight: function(element, errorClass, validClass) {
      $(element).closest("div.field").addClass("error").removeClass("success");
    },
    unhighlight: function(element, errorClass, validClass){
      $(element).closest(".error").removeClass("error").addClass("success");
    }

  });

  loginValidator = $('#login-form').validate({
    submitHandler: function (form) {
      $('#login-form').transition('pulse');
      attemptLogin();
    }
  });

  $('#nameInput').rules('add', {
    required: true,
    minlength: 3,
    maxlength: 18,
    remote: {
      //depends: function(element) { return createNewUser; },
      url: "/checkname/",
      data: { 'newUser': function() { return createNewUser; } }
    },
    messages: {
      required:  'This field is required',
      minlength: 'Your username needs to be at least 3 characters',
      maxlength: 'Your username needs to be less than 18 characters',
      remote:    'This username is unavailable'
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

  $('#toggleFullscreen').click(function () {

    if (screenfull.isFullscreen) {
      $('#toggleFullscreen').removeClass('compress').addClass('expand');
      screenfull.exit();
    } else {
      $('#toggleFullscreen').removeClass('expand').addClass('compress');
      screenfull.request();
    }

  });


  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login result', function (data) {
    if(data.success) {
      connected = true;
      $('#login-form-outer').transition({
        animation: 'vertical flip',
        onComplete: function() { $('#introText').transition('vertical flip'); }
      });
      // Display the welcome message
      log('Welcome to Umbra - You are now connected to Avalon', { prepend: true });
      log('***New Feature: You can now use cursor up/down to browse your command history***');
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
    var $form = $('#login-form-outer');
    //$form.remove();
    $('.messages').append($form);
    //$('#introText').transition('vertical flip');
    $('#login-form-outer').transition({
      animation: 'vertical flip'
    });
  });

  socket.on('disconnect', function () {
    connected = false;
    log('*** WEBSOCKET DISCONNECTED ***');
  });

  socket.on('reconnect', function () {
    log('*** WEBSOCKET RECONNECTED ***');
    if (username && password) {
      var loginParams = {
        username: username,
        password: password,
        create: false
      };
      socket.emit('confirm login', loginParams);
    }
  });

  watcherClient = new WatcherClient(socket);

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
    { name: 'calling from',        commsClasses: 'from', iconClasses: 'comment'    },
    { name: 'calling to',          commsClasses: 'to',   iconClasses: 'comment'    },
    { name: 'novice-calling from', commsClasses: 'from', iconClasses: 'student'    },
    { name: 'novice-calling to',   commsClasses: 'to',   iconClasses: 'student'    },
    { name: 'tell from',           commsClasses: 'from', iconClasses: 'reply'      },
    { name: 'tell to',             commsClasses: 'to',   iconClasses: 'share'      },
    { name: 'speech from',         commsClasses: 'from', iconClasses: 'quote left' },
    { name: 'speech to',           commsClasses: 'to',   iconClasses: 'quote left' },
    { name: 'rune-bug',            commsClasses: 'bug',  iconClasses: 'bug'        }
  ];

  function lookupCommsType(name) {
    for(i = 0; i < commsTypes.length; ++i) {
      var ct = commsTypes[i];
      if(ct.name == name) { return ct; }
    }
  }

  socket.on('block', function(data) { processInput(data); });

  function processInput(data) {
    if(data.qual && data.qual=='root') {
      if(data.entries) {
        var len = data.entries.length;
        for (var i = 0; i < len; ++i) {
          processInput(data.entries[i]);
        }
      } else {
        //empty root block, skip it
      }
    } else {
      var $elem = processEntry(data);
      styler.reset();

      if ($elem) {
        addMessageElement($elem);
      }
    }
  }

  function processBlock(data) {

    console.log('processing block');

    var elems = [];

    var len = data.entries.length;
    for(var i = 0; i < len; ++i) {
      var entry = data.entries[i];
      var $el = processEntry(entry);
      if($el) { elems.push($el); }
    }
    if(data.prompt) {
      console.log('prompt: ' + data.prompt);
      addPrompt();
    }

    if(elems.length > 0) {
      var $div = $('<div>');
      if(data.tags && data.tags.length > 0) {
        $div.addClass(data.tags.join(' '));
      }
      if(data.cmd) {
        $div.append($('<div>').addClass('cmd').text(data.cmd));
      }
      $div.append(elems);
      return $div;
    }
  }

  function processEntry(data) {
    console.group('processing input');
    console.log(data);

    var $elem;

    var ct = lookupCommsType(data.qual);
    if(ct) {
      data.iconClasses = ct.iconClasses;
      data.commsClasses = ct.commsClasses;
      $elem = mkComms(data);
    } else if(data.entries && data.entries.length > 0) {
      $elem = processBlock(data);
    } else if(data.qual == 'avmsg') {
      $elem = mkAvmsg(data);
    } else if(data.qual == 'map') {
      $elem = mkAvmap(data);
    } else if(data.qual == 'user') {
      //console.log(JSON.stringify(data));
      addUser(data);      
    } else if(data.qual == 'channel') {
      //console.log('input: ' + JSON.stringify(data));
      addChannel(data.code, data.name);
    } else if (data.qual == 'table') {
      $elem = mkTable(data);
    } else if(data.qual == 'line') {
      $elem = mkLine(data);
    } else if(data.qual == 'protocol') {
      handleProto(data.code, data.content);
    } else {
      //console.log('input: ' + JSON.stringify(data));
    }

    console.groupEnd();

    return $elem;
  }

  var keypadCodes = {
    9: {char: 'tab', fn: tabComplete },
    37: {char: 'l-arr'},
    38: {char: 'u-arr', fn: historyPrev },
    39: {char: 'r-arr'},
    40: {char: 'd-arr', fn: historyNext },
    111: {char: '/', cmd: 'out'},
    106: {char: '*', cmd: 'in'},
    109: {char: '-', cmd: 'up'},
    107: {char: '+', cmd: 'down'},
    110: {char: '.', cmd: ''},
    96: { char: '0', cmd: ''},
    97: { char: '1', cmd: 'sw'},
    98: { char: '2', cmd: 's'},
    99: { char: '3', cmd: 'se'},
    100: {char: '4', cmd: 'w'},
    101: {char: '5', cmd: ''},
    102: {char: '6', cmd: 'e'},
    103: {char: '7', cmd: 'nw'},
    104: {char: '8', cmd: 'n'},
    105: {char: '9', cmd: 'ne'}
  }

  $(document).keydown( function (e) {
    if(connected) {

      var str = '';
      var modKey = false;

      if (e.shiftKey) { str = 'shift+' + str; }
      if (e.ctrlKey)  { str = 'ctrl+' + str; modKey=true; }
      if (e.altKey) { str = 'alt+' + str; modKey=true;}
      if (e.metaKey) { str = 'meta+' + str; modKey=true;}

      if(!modKey) {
        $inputBox.focus();
      }

      var entry = keypadCodes[e.keyCode];
      if(entry) {
        str = str + entry.char;
        if(entry.fn) {
          entry.fn();
          return false;
        } else if(entry.cmd) {
          sendMessage(entry.cmd);
          console.log(str);
          return false;
        }
      }
    }
  });

  $("#input-box").keyup( function (e) {
    if (keypadCodes[e.keyCode] || e.keyCode == 13) return;

    cmdHistoryPos = 0;
    lastInput = $inputBox.val();
  });

  /////////////////////////////////////////////
  // Page initialisation

  //turn on nano-scrollbars
  //$(".nano").nanoScroller();

  //initialise clicky bits
  $('.ui.dropdown').dropdown();
  $('.ui.accordion').accordion();



});

